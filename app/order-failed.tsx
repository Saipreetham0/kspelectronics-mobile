import React from 'react';
import { Linking, View } from 'react-native';
import { Text } from '@/components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Center } from '@/components/ui';
import { WHATSAPP } from '@/config';
import { c } from '@/theme';

type Kind = 'cancelled' | 'failed' | 'unconfirmed';

// Shown when a payment did not complete. The cart is untouched, so "Try again" goes straight back to checkout.
// "unconfirmed" is the one to be careful with: the money may have left the customer's account, so it says what happens next instead of "failed".
export default function OrderFailed() {
  const { orderId, key, kind = 'failed', reason } = useLocalSearchParams<{ orderId?: string; key?: string; kind?: Kind; reason?: string }>();
  const k: Kind = kind === 'cancelled' || kind === 'unconfirmed' ? kind : 'failed';
  const copy = {
    cancelled: { title: 'Payment cancelled', body: 'You closed the payment before it finished. Nothing was charged, and your cart is saved.' },
    failed: { title: "Payment didn't go through", body: reason || 'The bank or payment app could not complete this payment. Nothing was charged, and your cart is saved.' },
    unconfirmed: { title: 'We could not confirm your payment', body: 'If money was deducted, it is confirmed automatically within a few minutes, or refunded to your account in 5 to 7 working days. You do not need to pay again.' },
  }[k];
  const chat = () => Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, I need help with my payment${orderId ? ` for order #${orderId}` : ''}.`)}`).catch(() => {});
  return (
    <Center>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: k === 'unconfirmed' ? c.dealSoft : '#fdecec', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 42, color: k === 'unconfirmed' ? c.dealText : c.danger, fontWeight: '900' }}>{k === 'unconfirmed' ? '…' : '✕'}</Text>
      </View>
      <Text style={{ fontSize: 24, fontWeight: '900', color: c.text, textAlign: 'center' }} accessibilityRole="header">{copy.title}</Text>
      {orderId ? <Text style={{ color: c.muted, marginTop: 6 }}>Order #{orderId}</Text> : null}
      <Text style={{ color: '#444', textAlign: 'center', marginTop: 12, marginBottom: 26, lineHeight: 22, maxWidth: 360 }}>{copy.body}</Text>
      <View style={{ gap: 10, alignSelf: 'stretch' }}>
        {k === 'unconfirmed' && orderId && key
          ? <Button title="Check payment status" onPress={() => router.replace({ pathname: '/order-success', params: { orderId, key } })} />
          : <Button title="Try again" onPress={() => router.replace('/checkout')} />}
        <Button title="Back to cart" variant="outline" onPress={() => router.replace('/(tabs)/cart')} />
        <Button title="Chat with us on WhatsApp" variant="whatsapp" onPress={chat} />
      </View>
    </Center>
  );
}
