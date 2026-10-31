import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { HostInstance } from 'react-native';
import { Text } from '@/components/Text';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { useFly } from '@/fly';
import { Bump, PopIn } from './motion';
import { Dots } from './ui';
import type { Product } from '@/types';
import { c, r } from '@/theme';

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

// Blinkit-style control: ADD turns into a − 1 + stepper in place. Products with options open their page instead.
export default function AddButton({ product: p, size = 'sm', block, compact }: { product: Product; size?: 'sm' | 'lg'; block?: boolean; compact?: boolean }) {
  const { cart, addItem, updateItem, removeItem } = useStore();
  const [busy, setBusy] = useState(false);
  const fly = useFly();
  const btn = useRef<HostInstance>(null);
  const line = p.has_options || p.variations.length ? undefined : cart?.items.find((i) => i.id === p.id);
  const atMax = line ? line.quantity >= (line.quantity_limits?.maximum ?? Infinity) : false;
  const h = compact ? 36 : size === 'lg' ? 44 : 34;
  const w = block ? { alignSelf: 'stretch' as const } : null; // full-width inside lists
  // compact: a small square "+" like Blinkit's product cards (only the idle button; the stepper and stock label keep their natural width)
  const box = compact ? { width: 36, minWidth: 36, paddingHorizontal: 0 } : null;
  const plus = compact ? '+' : null;
  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    tap(); setBusy(true);
    try { await fn(); } catch (e) { Alert.alert('Cart', (e as Error).message); }
    setBusy(false);
  };

  if (!p.is_in_stock) return <View style={[s.out, { height: h }, w]}><Text style={s.outText}>Out of stock</Text></View>;
  if (p.has_options || p.variations.length) {
    return <Pressable hitSlop={8} onPress={() => router.push(`/product/${p.slug}`)} style={[s.add, { height: h }, w, box]} accessibilityRole="button" accessibilityLabel="Choose options"><Text style={plus ? s.plus : s.addText}>{plus ?? 'OPTIONS'}</Text></Pressable>;
  }
  if (!line) {
    return (
      <Pressable ref={btn} hitSlop={8} onPress={() => { btn.current?.measureInWindow((x, y, width, height) => fly(p.images[0]?.thumbnail || p.images[0]?.src, { x, y, width, height })); guard(() => addItem(p.id, 1)); }} style={({ pressed }) => [s.add, { height: h }, w, box, pressed &&{ transform: [{ scale: 0.96 }] }]} accessibilityRole="button" accessibilityLabel="Add to cart">
        {busy ? <Dots size={5} /> : <Text style={plus ? s.plus : s.addText}>{plus ?? 'ADD'}</Text>}
      </Pressable>
    );
  }
  return (
    <PopIn style={w}><View style={[s.step, { height: h }, w, block && { justifyContent: 'space-between' }]}>
      <Pressable hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }} disabled={busy} onPress={() => guard(() => (line.quantity > 1 ? updateItem(line.key, line.quantity - 1) : removeItem(line.key)))} style={[s.sb, busy && { opacity: 0.6 }]} accessibilityLabel="Decrease quantity"><Text style={s.st}>−</Text></Pressable>
      <Bump trigger={line.quantity}><Text style={s.sq}>{line.quantity}</Text></Bump>
      <Pressable hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }} disabled={atMax || busy} onPress={() => guard(() => updateItem(line.key, line.quantity + 1))} style={[s.sb, (atMax || busy) && { opacity: 0.4 }]} accessibilityLabel="Increase quantity"><Text style={s.st}>+</Text></Pressable>
    </View></PopIn>
  );
}

const s = StyleSheet.create({
  add: { minWidth: 66, paddingHorizontal: 14, borderRadius: r.sm, borderWidth: 1.2, borderColor: c.accent, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  addText: { color: c.accent, fontWeight: '800', fontSize: 13 },
  plus: { color: c.accent, fontWeight: '600', fontSize: 24, lineHeight: 26 },
  step: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent, borderRadius: r.sm, overflow: 'hidden' },
  sb: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'center' },
  st: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sq: { color: '#fff', fontWeight: '800', minWidth: 20, textAlign: 'center', fontSize: 14 },
  out: { paddingHorizontal: 8, justifyContent: 'center' },
  outText: { color: c.danger, fontSize: 11, fontWeight: '700' },
});
