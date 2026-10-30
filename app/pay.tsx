import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { router } from 'expo-router';
import { Button, Center, Spinner } from '@/components/ui';
import { api } from '@/api';
import { getPayRequest, setPayRequest } from '@/payRequest';
import { storage } from '@/storage';
import { useStore } from '@/store';
import { c } from '@/theme';

type Msg = { type: 'success'; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string } | { type: 'dismiss' } | { type: 'failed'; message?: string };

// Razorpay Standard Checkout inside a WebView: works in Expo Go and every build with no native module.
// ponytail: swap for the native react-native-razorpay SDK later if you want in-app UPI intent handling.
export default function Pay() {
  const req = getPayRequest();
  const { cartToken, clearLocalCart } = useStore();
  const [verifying, setVerifying] = useState(false);

  const html = useMemo(() => {
    if (!req) return '';
    const options = JSON.stringify({ key: req.keyId, amount: req.amount, currency: req.currency, order_id: req.rzpOrderId, name: 'KSP Electronics', description: `Order #${req.orderId}`, prefill: req.prefill, theme: { color: c.accent }, remember_customer: true, config: { display: { blocks: { upi: { name: 'Pay with a UPI app', instruments: [{ method: 'upi' }] } }, sequence: ['block.upi', 'block.other'], preferences: { show_default_blocks: true } } } }).replace(/</g, '\\u003c');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff"><script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>
      var post=function(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))};
      var o=${options};
      o.handler=function(r){post({type:'success',razorpay_payment_id:r.razorpay_payment_id,razorpay_order_id:r.razorpay_order_id,razorpay_signature:r.razorpay_signature})};
      o.modal={escape:false,ondismiss:function(){post({type:'dismiss'})}};
      var rz=new Razorpay(o);rz.on('payment.failed',function(e){post({type:'failed',message:e.error&&e.error.description})});
      rz.open();
    </script></body></html>`;
  }, [req]);

  if (!req) return <Center><Text>Nothing to pay.</Text><Button title="Back to cart" onPress={() => router.replace('/(tabs)/cart')} /></Center>;

  const fail = (kind: 'cancelled' | 'failed' | 'unconfirmed', reason?: string) => { setPayRequest(null); router.replace({ pathname: '/order-failed', params: { orderId: String(req.orderId), key: req.orderKey, kind, ...(reason ? { reason } : {}) } }); };
  const onMessage = async (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data) as Msg;
    if (m.type === 'dismiss') return fail('cancelled');
    if (m.type === 'failed') return fail('failed', m.message);
    setVerifying(true);
    try {
      // The server re-checks the signature and the amount with Razorpay before marking the order paid.
      await api('/api/checkout/razorpay/verify', { method: 'POST', body: { orderId: req.orderId, razorpay_payment_id: m.razorpay_payment_id, razorpay_order_id: m.razorpay_order_id, razorpay_signature: m.razorpay_signature } });
    } catch {
      return fail('unconfirmed'); // the server could not confirm it (yet): say so, never "failed"
    }
    await api('/api/cart/clear', { method: 'POST', body: { token: cartToken } }).catch(() => {});
    await Promise.all([clearLocalCart(), storage.del('ksp_pending_order')]);
    setPayRequest(null);
    router.replace({ pathname: '/order-success', params: { orderId: String(req.orderId), key: req.orderKey } });
  };

  if (verifying) return <Center><Spinner /><Text style={{ marginTop: 12, color: c.muted }}>Confirming your payment…</Text></Center>;
  return (
    <View style={s.fill}>
      <WebView originWhitelist={['*']} source={{ html, baseUrl: 'https://checkout.razorpay.com' }} onMessage={onMessage} javaScriptEnabled domStorageEnabled
        // UPI apps open through upi:// style links; hand those to the OS.
        onShouldStartLoadWithRequest={(r) => { if (/^https?:|^about:|^data:/i.test(r.url)) return true; Linking.openURL(r.url).catch(() => {}); return false; }}
        startInLoadingState renderLoading={() => <Spinner />} />
    </View>
  );
}

const s = StyleSheet.create({ fill: { flex: 1, backgroundColor: '#fff' } });
