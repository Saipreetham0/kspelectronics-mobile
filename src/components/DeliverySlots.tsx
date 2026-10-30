import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Card, H } from '@/components/ui';
import { useFlag } from '@/appConfig';
import { useFetch } from '@/useFetch';
import { c, r } from '@/theme';

export type Slot = { id: string; label: string; sub?: string; available: boolean };

// "When do you want it?": the delivery windows the store offers for this pincode (GET /api/delivery/slots?pincode=, see docs/SERVER_API.md).
// Shown only when the store has switched slots on (flag `slots`) and has windows for the pincode; the chosen window travels with the order.
export default function DeliverySlots({ pincode, value, onChange }: { pincode: string; value?: string; onChange: (id: string, label: string) => void }) {
  const on = useFlag('slots');
  const ok = /^\d{6}$/.test(pincode);
  const { data } = useFetch<{ slots: Slot[] }>(on && ok ? `/api/delivery/slots?pincode=${pincode}` : null);
  const slots = data?.slots ?? [];
  // The first window still open is picked for the shopper; a chosen one that has closed is replaced.
  useEffect(() => {
    const first = slots.find((x) => x.available);
    if (first && !slots.some((x) => x.id === value && x.available)) onChange(first.id, first.label);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on || !slots.length) return null;
  return (
    <Card>
      <H>Delivery time</H>
      <View style={s.wrap}>
        {slots.map((x) => {
          const sel = x.id === value;
          return (
            <Pressable key={x.id} disabled={!x.available} onPress={() => onChange(x.id, x.label)} style={[s.slot, sel && s.on, !x.available && { opacity: 0.4 }]} accessibilityRole="radio" accessibilityState={{ selected: sel, disabled: !x.available }} accessibilityLabel={`${x.label}${x.sub ? `, ${x.sub}` : ''}${x.available ? '' : ', full'}`}>
              <Text style={[s.t, sel && { color: c.accent }]}>{x.label}</Text>
              {x.sub ? <Text style={s.sub}>{x.available ? x.sub : 'Full'}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', minWidth: 120 },
  on: { borderColor: c.accent, backgroundColor: c.accentSoft },
  t: { fontWeight: '800', color: c.text, fontSize: 14 },
  sub: { color: c.muted, fontSize: 12, marginTop: 2 },
});
