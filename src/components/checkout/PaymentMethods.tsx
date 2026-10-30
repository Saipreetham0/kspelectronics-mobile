import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Card, H } from '@/components/ui';
import { c, r } from '@/theme';

// WooCommerce gives only ids for payment methods; these are the names a shopper should see.
const PAY_NAMES: Record<string, string> = { cod: 'Cash on delivery', bacs: 'Direct bank transfer', cheque: 'Cheque payment', razorpay: 'Pay online (UPI, cards, netbanking, EMI)', paypal: 'PayPal', velocity_one_bnpl: 'Buy now, pay later (Velocity One)', cashfree: 'Pay online (Cashfree)', stripe: 'Card (Stripe)' };
export const payName = (id: string) => PAY_NAMES[id] ?? id.replace(/_/g, ' ').replace(/^\w/, (ch) => ch.toUpperCase());

type Props = {
  methods: string[];
  selected: string;
  onSelect: (id: string) => void;
  native: boolean; // razorpayNative
};

export default function PaymentMethods({ methods, selected, onSelect, native: _native }: Props) {
  return (
    <Card>
      <H>3. Payment</H>
      {methods.length === 0 && <Text style={{ color: c.muted }}>Loading payment options…</Text>}
      {methods.map((id) => (
        <Pressable key={id} onPress={() => onSelect(id)} style={[s.method, selected === id && s.methodOn]} accessibilityRole="radio" accessibilityState={{ selected: selected === id }}>
          <View style={[s.radio, selected === id && { borderColor: c.accent }]}>{selected === id && <View style={s.radioDot} />}</View>
          <Text style={{ flex: 1, fontWeight: '600' }}>{payName(id)}</Text>
        </Pressable>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: r.md, marginBottom: 10 },
  methodOn: { borderColor: c.accent, backgroundColor: '#f2f6ff' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
});
