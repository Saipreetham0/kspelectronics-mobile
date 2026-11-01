import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Bank, CalendarCheck, CreditCard, Money, QrCode } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Card, H } from '@/components/ui';
import { c, r } from '@/theme';

// WooCommerce gives only ids for payment methods; these are what a shopper should see: a name, a line saying what it covers, an icon,
// and a short label for the sticky footer (one line, so it never wraps).
type Method = { name: string; sub?: string; short: string; Glyph: Icon };
const METHODS: Record<string, Method> = {
  razorpay: { name: 'UPI, cards & netbanking', sub: 'GPay, PhonePe, Paytm or any UPI app · cards · EMI', short: 'UPI / Cards', Glyph: QrCode },
  cashfree: { name: 'UPI, cards & netbanking', sub: 'GPay, PhonePe, Paytm or any UPI app · cards', short: 'UPI / Cards', Glyph: QrCode },
  cod: { name: 'Cash on delivery', sub: 'Pay when your order arrives', short: 'Cash on delivery', Glyph: Money },
  velocity_one_bnpl: { name: 'Buy now, pay later', sub: 'Velocity One · pay in instalments', short: 'Pay later', Glyph: CalendarCheck },
  bacs: { name: 'Direct bank transfer', sub: 'We share our account details after you order', short: 'Bank transfer', Glyph: Bank },
  cheque: { name: 'Cheque payment', short: 'Cheque', Glyph: Bank },
  paypal: { name: 'PayPal', short: 'PayPal', Glyph: CreditCard },
  stripe: { name: 'Card (Stripe)', short: 'Card', Glyph: CreditCard },
};
const fallback = (id: string): Method => { const name = id.replace(/_/g, ' ').replace(/^\w/, (ch) => ch.toUpperCase()); return { name, short: name, Glyph: CreditCard }; };
const info = (id: string) => METHODS[id] ?? fallback(id);
export const payName = (id: string) => info(id).name;
export const payShort = (id: string) => info(id).short;

type Props = { methods: string[]; selected: string; onSelect: (id: string) => void };

export default function PaymentMethods({ methods, selected, onSelect }: Props) {
  return (
    <Card>
      <H>Payment</H>
      {methods.length === 0 && <Text style={{ color: c.muted }}>Loading payment options…</Text>}
      {methods.map((id) => {
        const m = info(id), on = selected === id;
        return (
          <Pressable key={id} onPress={() => onSelect(id)} style={[s.method, on && s.methodOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={m.sub ? `${m.name}. ${m.sub}` : m.name}>
            <View style={[s.icon, on && { backgroundColor: c.accent }]}><m.Glyph size={20} color={on ? '#fff' : c.accent} weight={on ? 'fill' : 'regular'} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15 }}>{m.name}</Text>
              {m.sub ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{m.sub}</Text> : null}
            </View>
            <View style={[s.radio, on && { borderColor: c.accent }]}>{on && <View style={s.radioDot} />}</View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const s = StyleSheet.create({
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: r.md, marginBottom: 10 },
  methodOn: { borderColor: c.accent, backgroundColor: '#f2f6ff' },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
});
