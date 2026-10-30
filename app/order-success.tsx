import React, { useEffect, useRef, useState } from 'react';
import { NATIVE } from '@/native';
import { Animated, View } from 'react-native';
import { Text, AnimatedText } from '@/components/Text';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Center, Spinner } from '@/components/ui';
import { api, ApiError } from '@/api';
import { useStore } from '@/store';
import { track } from '@/analytics';
import { registerPush } from '@/push';
import { c } from '@/theme';

type Status = { number: string; status: string; phase: 'paid' | 'waiting' | 'failed'; total: string; currency: string; methodTitle: string; items: { id: number; name: string; quantity: number }[] };
const DOTS = Array.from({ length: 14 }, (_, i) => ({ angle: (i / 14) * Math.PI * 2, color: i % 2 ? c.accent : c.green, dist: 74 + (i % 3) * 14 }));

function SuccessView({ orderId, summary }: { orderId?: string; summary?: Status }) {
  const ring = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  // A paid order: count it, then offer order updates by notification (a moment later, so the prompt doesn't cover the tick).
  useEffect(() => { track('purchase'); const t = setTimeout(() => registerPush(true), 2500); return () => clearTimeout(t); }, []);

  // Ring springs in, the tick pops, dots burst outwards, then the text rises.
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.spring(ring, { toValue: 1, useNativeDriver: NATIVE, damping: 8, stiffness: 140 }),
      Animated.parallel([Animated.spring(tick, { toValue: 1, useNativeDriver: NATIVE, damping: 6, stiffness: 220 }), Animated.timing(burst, { toValue: 1, duration: 650, useNativeDriver: NATIVE })]),
      Animated.timing(text, { toValue: 1, duration: 350, useNativeDriver: NATIVE }),
    ]).start();
  }, [ring, tick, burst, text]);

  return (
    <Center>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        {DOTS.map((d, i) => (
          <Animated.View key={i} style={{ position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: d.color,
            opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(d.angle) * d.dist] }) }, { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(d.angle) * d.dist] }) }] }} />
        ))}
        <Animated.View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.greenDark, alignItems: 'center', justifyContent: 'center', transform: [{ scale: ring }] }}>
          <AnimatedText style={{ fontSize: 50, color: '#fff', fontWeight: '900', transform: [{ scale: tick }] }}>✓</AnimatedText>
        </Animated.View>
      </View>
      <Animated.View style={{ alignItems: 'center', alignSelf: 'stretch', opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: c.text }}>Order placed!</Text>
        <Text style={{ color: c.muted, textAlign: 'center', marginTop: 8, marginBottom: 26, lineHeight: 22 }}>
          Your order {orderId ? `#${orderId} ` : ''}has been received. A confirmation email is on its way.
        </Text>
        {summary && (
          <View style={{ alignSelf: 'stretch', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            {summary.items.slice(0, 4).map((i) => <Text key={i.id} numberOfLines={1} style={{ color: '#444', lineHeight: 22 }}>{i.name} × {i.quantity}</Text>)}
            {summary.items.length > 4 && <Text style={{ color: c.muted }}>+ {summary.items.length - 4} more</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ color: c.muted }}>{summary.methodTitle}</Text><Text style={{ fontWeight: '800' }}>{summary.currency}{summary.total}</Text></View>
          </View>
        )}
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          <Button title="Track your order" variant="outline" onPress={() => router.replace({ pathname: '/track', params: { order: orderId } })} />
          <Button title="Continue shopping" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Animated.View>
    </Center>
  );
}

// The order's real state decides the screen: paid shows the confirmation, still pending (a pay-later or bank page the shopper just came back from)
// waits and checks every few seconds, failed goes to the failed page. Without an order key (older callers) it shows the plain confirmation.
export default function OrderSuccess() {
  const { orderId, key } = useLocalSearchParams<{ orderId?: string; key?: string }>();
  const { clearLocalCart } = useStore();
  const [st, setSt] = useState<Status | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (!orderId || !key) return;
    let live = true;
    const t = setTimeout(() => {
      api<Status>(`/api/order-status?id=${encodeURIComponent(orderId)}&key=${encodeURIComponent(key)}`)
        .then((s) => {
          if (!live) return;
          setSt(s);
          if (s.phase === 'paid') clearLocalCart();
          else if (s.phase === 'failed') router.replace({ pathname: '/order-failed', params: { orderId: s.number, key, kind: 'failed', reason: s.status === 'cancelled' ? 'This order was cancelled.' : undefined } });
          else if (tries >= 30) router.replace({ pathname: '/order-failed', params: { orderId: s.number, key, kind: 'unconfirmed' } }); // about two minutes without an answer
          else setTries((n) => n + 1);
        })
        .catch((e) => {
          if (!live) return;
          if (e instanceof ApiError && e.status === 404) {
            router.replace({ pathname: '/order-failed', params: { orderId, kind: 'failed', reason: "We couldn't find this order. If you were charged, message us with the order number." } });
          } else if (tries >= 30) {
            // Max retries hit on a network error: the order state is unknown. Navigate to failed instead of spinning forever.
            router.replace({ pathname: '/order-failed', params: { orderId, key: key ?? '', kind: 'unconfirmed' } });
          } else {
            setTries((n) => n + 1);
          }
        });
    }, tries === 0 ? 0 : 4000);
    return () => { live = false; clearTimeout(t); };
  }, [orderId, key, tries]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!orderId || !key) return <SuccessView orderId={orderId} />;
  if (st?.phase === 'paid') return <SuccessView orderId={st.number} summary={st} />;
  return <Center><Spinner /><Text style={{ marginTop: 14, fontWeight: '800', fontSize: 17 }}>Confirming your payment…</Text><Text style={{ color: c.muted, textAlign: 'center', marginTop: 6, maxWidth: 300 }}>This takes a few seconds. Please keep the app open.</Text></Center>;
}
