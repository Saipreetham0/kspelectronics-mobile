import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { useMode } from '@/mode';
import { useLoc } from '@/location';
import { c, r } from '@/theme';

// Quick / All products. Quick is greyed out (with the reason) where no rider can reach the saved location.
export default function ModeToggle() {
  const { mode, quickOk, checking, setMode } = useMode();
  const pinned = useLoc()?.lat != null; // Quick is checked against the pinned point, so without one the shopper is asked to set it
  const tab = (m: 'quick' | 'all', label: string, icon: 'flash' | 'cube-outline') => {
    const on = mode === m, off = m === 'quick' && !quickOk;
    return (
      <Pressable key={m} onPress={() => !off && setMode(m)} disabled={off} style={[s.tab, on && s.on]} accessibilityRole="tab"
        accessibilityState={{ selected: on, disabled: off }} accessibilityLabel={off ? `${label}, not available at this location` : label}>
        <Ionicons name={icon} size={15} color={on ? '#fff' : off ? '#b0b5bd' : c.text} />
        <Text style={[s.t, on && { color: '#fff' }, off && { color: '#b0b5bd' }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View>
      <View style={s.wrap} accessibilityRole="tablist">{tab('quick', 'Quick', 'flash')}{tab('all', 'All products', 'cube-outline')}</View>
      {!quickOk && !checking && <Text style={s.note}>{pinned ? "Quick delivery isn't available at this location." : 'Set your location on the map to check Quick delivery.'}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: r.pill ?? 999, padding: 3, gap: 3, marginTop: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 999 },
  on: { backgroundColor: c.accent },
  t: { fontWeight: '800', fontSize: 13.5, color: c.text },
  note: { color: c.muted, fontSize: 12, marginTop: 6, marginLeft: 4 },
});
