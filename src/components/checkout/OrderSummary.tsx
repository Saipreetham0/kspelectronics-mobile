import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/Text';
import { Card, H } from '@/components/ui';
import { decodeHtml, minorToInr, withTax } from '@/format';
import { c, r } from '@/theme';
import { router } from 'expo-router';
import type { Cart, CartItem } from '@/types';

type Props = {
  items: CartItem[];
  totals: Cart['totals'];
  quote: Cart | null;
  quoting: boolean;
  pinOk: boolean;
  saved: number; // computed savings in minor units
  mrp: number;   // sum of regular prices in minor units
  itemsNow: number; // sum of sale prices in minor units
  noRates: boolean;
  whatsapp: string; // WHATSAPP constant
  pincode: string;
};

const Sum = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <View style={s.line}><Text style={{ color: color ?? '#555' }}>{k}</Text><Text style={{ fontWeight: '600', color: color ?? c.text }}>{v}</Text></View>
);

export default function OrderSummary({ items, totals: t, quote, quoting, pinOk, saved, mrp, itemsNow, noRates, whatsapp, pincode }: Props) {
  const m = t.currency_minor_unit;

  return (
    <Card>
      <View style={s.line}><H>Order summary</H><Pressable onPress={() => router.push('/(tabs)/cart')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit cart"><Text style={{ color: c.accent, fontWeight: '800' }}>Edit cart</Text></Pressable></View>
      {items.map((i) => <View key={i.key} style={s.line}><Image source={i.images[0]?.thumbnail || i.images[0]?.src} style={s.thumb} contentFit="contain" /><Text style={{ flex: 1 }} numberOfLines={2}>{decodeHtml(i.name)} <Text style={{ color: c.muted }}>× {i.quantity}</Text></Text><Text style={{ fontWeight: '700' }}>{minorToInr(Number(i.prices.price) * i.quantity, i.prices.currency_minor_unit)}</Text></View>)}
      <View style={s.hr} />
      <View style={s.line}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: '#555' }}>Items total</Text>{saved > 0 && <View style={s.savedChip}><Text style={s.savedChipT}>Saved {minorToInr(saved, m)}</Text></View>}</View>
        <Text style={{ fontWeight: '600' }}>{mrp > itemsNow && <Text style={{ color: c.muted, textDecorationLine: 'line-through', fontWeight: '400' }}>{minorToInr(mrp, m)} </Text>}{minorToInr(withTax(t.total_items, t.total_items_tax), m)}</Text>
      </View>
      {Number(t.total_discount) > 0 && <Sum k="Discount" v={`−${minorToInr(withTax(t.total_discount, t.total_discount_tax), m)}`} color={c.success} />}
      <Sum k="Shipping" v={!pinOk ? 'Enter pincode' : quoting ? '…' : !quote ? 'Unavailable' : noRates ? 'Not deliverable' : withTax(t.total_shipping, t.total_shipping_tax) > 0 ? minorToInr(withTax(t.total_shipping, t.total_shipping_tax), m) : 'Free'} color={noRates ? c.danger : undefined} />
      {noRates && <Pressable onPress={() => Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, can you deliver to pincode ${pincode}?`)}`).catch(() => {})} style={s.rate} accessibilityRole="link"><Text style={{ color: c.accent, fontWeight: '800' }}>Ask us on WhatsApp about this pincode</Text></Pressable>}
      <View style={s.hr} />
      <View style={s.line}><Text style={{ fontSize: 18, fontWeight: '900' }}>Grand total</Text><Text style={{ fontSize: 18, fontWeight: '900' }}>{minorToInr(t.total_price, m)}</Text></View>
      <Text style={{ color: c.muted, fontSize: 12, marginTop: -2, marginBottom: 6 }}>Includes GST {minorToInr(t.total_tax, m)}</Text>
      {saved > 0 && <View style={s.savings}><Text style={s.savingsT}>Your total savings</Text><Text style={s.savingsT}>{minorToInr(saved, m)}</Text></View>}
    </Card>
  );
}

const s = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  hr: { height: 1, backgroundColor: c.line, marginVertical: 8 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  savedChip: { backgroundColor: c.accentSoft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  savedChipT: { fontSize: 11, fontWeight: '800', color: c.accent },
  savings: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.accentSoft, borderRadius: r.sm, padding: 10, marginTop: 6 },
  savingsT: { color: c.accent, fontWeight: '800', fontSize: 13 },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: c.surface },
});
