import React, { useEffect, useRef } from 'react';
import { NATIVE } from '@/native';
import { Animated, Pressable, StyleSheet, TextInputProps, View, ViewProps, ViewStyle } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { c, r } from '@/theme';

// Three dots that bounce in turn: the app's loader (replaces the system spinner everywhere).
export function Dots({ color = c.loader, size = 10 }: { color?: string; size?: number }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = dots.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: NATIVE }),
      Animated.timing(v, { toValue: 0, duration: 280, useNativeDriver: NATIVE }),
      Animated.delay((2 - i) * 140), // equal total length, so the three stay in sequence
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.6, height: size * 2 }}>
      {dots.map((v, i) => (
        <Animated.View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.6] }) }] }} />
      ))}
    </View>
  );
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'outline' | 'whatsapp'; style?: ViewStyle }) {
  const bg = variant === 'primary' ? c.accent : variant === 'whatsapp' ? c.whatsapp : '#fff';
  const fg = variant === 'outline' ? c.accent : variant === 'whatsapp' ? '#0b2e1a' : '#fff'; // white on WhatsApp green is only 2:1; dark green text reads at 8:1
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: variant === 'outline' ? c.accent : bg, opacity: disabled || loading ? 0.55 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <Dots color={fg} size={7} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#aaa" {...p} style={[s.input, error ? { borderColor: c.danger } : null]} />
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

export const Card = ({ children, style, onLayout }: { children: React.ReactNode; style?: ViewStyle; onLayout?: ViewProps['onLayout'] }) => <View style={[s.card, style]} onLayout={onLayout}>{children}</View>;
export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;
export const Center = ({ children }: { children: React.ReactNode }) => <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</View>;
export const Spinner = () => <Center><Dots /></Center>;
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Center><Text style={{ color: c.muted, textAlign: 'center', marginBottom: 14 }}>{message}</Text>{onRetry && <Button title="Try again" variant="outline" onPress={onRetry} />}</Center>
);

const s = StyleSheet.create({
  btn: { minHeight: 48, borderRadius: r.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: r.md, paddingHorizontal: 14, minHeight: 48, fontSize: 15, color: c.text, backgroundColor: '#fff' },
  err: { color: c.danger, fontSize: 12, marginTop: 4 },
  card: { borderWidth: 1, borderColor: c.line, borderRadius: r.lg, padding: 16, backgroundColor: '#fff', marginBottom: 14 },
  h: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 12 },
});
