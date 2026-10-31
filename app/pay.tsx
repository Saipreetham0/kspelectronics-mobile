import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { Text } from '@/components/Text';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { router } from 'expo-router';
import { Button, Center, Spinner } from '@/components/ui';
import { api } from '@/api';
import { captureError } from '@/monitoring';
import { getPayRequest, restorePayRequest, setPayRequest } from '@/payRequest';
import type { PayRequest } from '@/payRequest';
import { storage } from '@/storage';
import { useStore } from '@/store';
import { c } from '@/theme';

import { resolveIntentUrl } from '@/upi';

type Msg =
  | { type: 'success'; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  | { type: 'dismiss' }
  | { type: 'failed'; message?: string; code?: string };

type OrderStatus = {
  phase: 'paid' | 'waiting' | 'failed';
  number?: string;
};


export default function Pay() {
  const [req, setReq] = useState<PayRequest | null>(getPayRequest());
  const { cartToken, clearLocalCart } = useStore();
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const verifyingRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const backgroundedRef = useRef(false);
  // Set the moment one outcome is chosen (success from the checkout, a paid status on return from a UPI app, a failure or a dismiss):
  // the others can arrive a moment later and must not clear the cart or navigate a second time. A ref, not state, so it holds before the next render.
  const doneRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  useEffect(() => {
    verifyingRef.current = verifying;
  }, [verifying]);

  useEffect(() => {
    if (req) return;
    restorePayRequest().then((r) => setReq(r)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (kind: 'cancelled' | 'failed' | 'unconfirmed', reason?: string) => {
    doneRef.current = true;
    setPayRequest(null);
    if (!req) {
      router.replace('/(tabs)/cart');
      return;
    }
    router.replace({
      pathname: '/order-failed',
      params: { orderId: String(req.orderId), key: req.orderKey, kind, ...(reason ? { reason } : {}) },
    });
  };

  // Intercept hardware back button on Android to prevent accidental payment drop
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (verifyingRef.current || doneRef.current) return true; // Block back button while payment verification is underway

      // Leaving does not cancel the order on the store: it stays unpaid (and can be paid again from the next screen) until the store expires it.
      Alert.alert(
        'Leave payment?',
        'Your order stays unpaid until you complete payment. If money was already deducted, the order is confirmed or the amount refunded automatically.',
        [
          { text: 'Continue paying', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => { if (!doneRef.current) fail('cancelled'); } },
        ]
      );
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [req]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume listener: check order status when returning from background UPI app
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedRef.current = true;
      } else if (nextState === 'active' && backgroundedRef.current && req && !doneRef.current) {
        backgroundedRef.current = false;
        // Check order status with backend after a brief delay for webhook propagation
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        resumeTimer.current = setTimeout(async () => {
          resumeTimer.current = null;
          if (doneRef.current || !req) return;
          try {
            const st = await api<OrderStatus>(
              `/api/order-status?id=${encodeURIComponent(req.orderId)}&key=${encodeURIComponent(req.orderKey)}`
            );
            if (st.phase === 'paid' && !doneRef.current) {
              doneRef.current = true;
              verifyingRef.current = true;
              setVerifying(true);
              await succeed(req);
            }
          } catch {
            /* Webhook may still be in transit, allow user to complete in WebView */
          }
        }, 2500);
      }
    };

    const appSub = AppState.addEventListener('change', handleAppState);
    return () => appSub.remove();
  }, [req, cartToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // The one way out after a confirmed payment: the cart is emptied here and on the store, then the success screen.
  const succeed = async (r: PayRequest) => {
    await api('/api/cart/clear', { method: 'POST', body: { token: cartToken } }).catch(() => {});
    await Promise.all([clearLocalCart(), setPayRequest(null), storage.del('ksp_pending_order')]);
    router.replace({ pathname: '/order-success', params: { orderId: String(r.orderId), key: r.orderKey } });
  };

  const html = useMemo(() => {
    if (!req) return '';
    const options = JSON.stringify({
      key: req.keyId,
      amount: req.amount,
      currency: req.currency,
      order_id: req.rzpOrderId,
      name: 'KSP Electronics',
      description: `Order #${req.orderId}`,
      prefill: req.prefill,
      theme: { color: c.accent },
      remember_customer: true,
      timeout: 900,
      retry: { enabled: true, max_count: 3 },
      notes: {
        platform: Platform.OS,
        orderId: String(req.orderId),
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay with UPI (GPay, PhonePe, Paytm, CRED)',
              instruments: [{ method: 'upi' }],
            },
            other: {
              name: 'Cards & Net Banking',
              instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }],
            },
          },
          sequence: ['block.upi', 'block.other'],
          preferences: { show_default_blocks: true },
        },
      },
    }).replace(/</g, '\\u003c');

    return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>body{margin:0;padding:0;background:#ffffff;}</style>
  </head>
  <body>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      var post = function(m) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(m));
        }
      };
      var o = ${options};
      o.handler = function(r) {
        post({
          type: 'success',
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_order_id: r.razorpay_order_id,
          razorpay_signature: r.razorpay_signature
        });
      };
      o.modal = {
        escape: false,
        backdropclose: false,
        ondismiss: function() { post({ type: 'dismiss' }); }
      };
      var rz = new Razorpay(o);
      rz.on('payment.failed', function(e) {
        post({
          type: 'failed',
          message: (e.error && e.error.description) || 'Payment was declined by your bank.',
          code: e.error && e.error.code
        });
      });
      rz.open();
    </script>
  </body>
</html>`;
  }, [req]);

  if (!req) {
    return (
      <Center>
        <Text style={{ marginBottom: 12 }}>Nothing to pay.</Text>
        <Button title="Back to cart" onPress={() => router.replace('/(tabs)/cart')} />
      </Center>
    );
  }

  // Multi-attempt verification with fallback order-status verification
  const verifyWithRetries = async (m: Extract<Msg, { type: 'success' }>): Promise<boolean> => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await api('/api/checkout/razorpay/verify', {
          method: 'POST',
          body: {
            orderId: req.orderId,
            razorpay_payment_id: m.razorpay_payment_id,
            razorpay_order_id: m.razorpay_order_id,
            razorpay_signature: m.razorpay_signature,
          },
        });
        return true;
      } catch (err) {
        captureError(err);
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, attempt * 1200));
        }
      }
    }

    // Fallback: Check backend order status in case webhook already credited the order
    try {
      const st = await api<OrderStatus>(
        `/api/order-status?id=${encodeURIComponent(req.orderId)}&key=${encodeURIComponent(req.orderKey)}`
      );
      if (st.phase === 'paid') return true;
    } catch {
      /* both failed */
    }

    return false;
  };

  const onMessage = async (e: WebViewMessageEvent) => {
    let m: Msg;
    try {
      m = JSON.parse(e.nativeEvent.data) as Msg;
    } catch {
      return;
    }

    if (doneRef.current) return; // an outcome was already chosen (for example a paid status found on return from a UPI app)
    if (m.type === 'dismiss') return fail('cancelled');
    if (m.type === 'failed') {
      captureError(new Error(`Razorpay failed [${m.code ?? 'declined'}]: ${m.message}`));
      return fail('failed', m.message);
    }

    doneRef.current = true;
    verifyingRef.current = true;
    setVerifying(true);
    const verified = await verifyWithRetries(m);
    if (!verified) {
      return fail('unconfirmed');
    }
    await succeed(req);
  };

  const handleExternalLink = async (rawUrl: string) => {
    const targetUrl = resolveIntentUrl(rawUrl);
    try {
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert(
        'Unable to open UPI App',
        'Please select another payment method or pay via Card/Netbanking.',
        [{ text: 'OK' }]
      );
    }
  };

  if (verifying) {
    return (
      <Center>
        <Spinner />
        <Text style={{ marginTop: 14, fontWeight: '800', fontSize: 17 }}>Confirming your payment…</Text>
        <Text style={{ color: c.muted, textAlign: 'center', marginTop: 6, maxWidth: 300 }}>
          Verifying transaction with your bank. Please do not close or refresh this screen.
        </Text>
      </Center>
    );
  }

  if (errorMsg) {
    return (
      <Center>
        <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8, color: c.text }}>Payment Gateway Error</Text>
        <Text style={{ color: c.muted, textAlign: 'center', marginBottom: 20, paddingHorizontal: 24 }}>
          {errorMsg}
        </Text>
        <Button title="Try Again" onPress={() => { setErrorMsg(null); setReloadKey((k) => k + 1); }} />
        <View style={{ height: 12 }} />
        <Button title="Cancel & Return to Cart" variant="outline" onPress={() => fail('cancelled')} />
      </Center>
    );
  }

  return (
    <View style={s.fill}>
      <WebView
        key={reloadKey}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        onError={() => setErrorMsg('Could not connect to payment gateway. Please check your internet connection.')}
        onShouldStartLoadWithRequest={(r: { url: string }) => {
          if (/^https?:|^about:|^data:/i.test(r.url)) return true;
          handleExternalLink(r.url);
          return false;
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }]}>
            <Spinner />
            <Text style={{ marginTop: 12, color: c.muted }}>Loading secure payment portal…</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({ fill: { flex: 1, backgroundColor: '#fff' } });
