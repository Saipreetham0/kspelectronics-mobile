import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Truck, X } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { minorToInr, withTax } from '@/format';
import { useStore } from '@/store';
import { c } from '@/theme';

export const STRIP_H = 46;

// How far the cart is from the store's free-delivery amount (the same maths as the cart screen), or null when there is nothing to show.
export function useFreeShip(min: number | null | undefined) {
  const { cart } = useStore();
  if (!cart || !cart.items.length || min == null) return null;
  const m = cart.totals.currency_minor_unit;
  const have = withTax(cart.totals.total_items, cart.totals.total_items_tax);
  const need = min * 10 ** m;
  return { left: Math.max(0, need - have), pct: Math.min(1, have / need), m };
}

// Blinkit's strip above the tab bar: how much more to add for the reward, with a progress bar, and a close button.
export default function FreeShipStrip({ bottom, left, pct, m, onClose }: { bottom: number; left: number; pct: number; m: number; onClose: () => void }) {
  const done = left <= 0;
  return (
    <View style={[s.wrap, { bottom }]}>
      <View style={s.icon}><Truck size={20} weight="fill" color="#fff" /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.t} numberOfLines={1}>{done ? 'You have unlocked free delivery' : `Add ${minorToInr(String(left), m)} more for free delivery`}</Text>
        <View style={s.track}><View style={[s.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: done ? c.green : c.accent }]} /></View>
      </View>
      <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Hide this message"><X size={18} color={c.muted} /></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, height: STRIP_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: c.accentSoft, borderTopWidth: 1, borderTopColor: c.line },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  t: { fontSize: 13, fontWeight: '700', color: c.text },
  track: { height: 4, borderRadius: 2, backgroundColor: '#fff', marginTop: 5, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
