import React, { useEffect, useRef } from 'react';
import { NATIVE } from '@/native';
import { AccessibilityInfo, Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Small motion helpers built on core Animated (works in Expo Go, native builds and web).

// Follows the phone's "reduce motion" setting: when on, the helpers below show their end state at once.
let reduce = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduce = v; }).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduce = v; });
export const reduceMotion = () => reduce;

/** Fades and slides up on mount; `index` staggers a list (capped so long lists don't wait). */
export function Reveal({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(index, 8) * 45, useNativeDriver: NATIVE }).start();
  }, [v, index]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

/** Springs from small to full size on mount (e.g. ADD turning into the stepper). */
export function PopIn({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0.75)).current;
  useEffect(() => { if (reduce) { v.setValue(1); return; } Animated.spring(v, { toValue: 1, useNativeDriver: NATIVE, damping: 9, stiffness: 220 }).start(); }, [v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Bounces whenever `trigger` changes (cart count, quantity). */
export function Bump({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) return;
    Animated.sequence([Animated.timing(v, { toValue: 1.22, duration: 90, useNativeDriver: NATIVE }), Animated.spring(v, { toValue: 1, useNativeDriver: NATIVE, damping: 6, stiffness: 260 })]).start();
  }, [trigger, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Pressable that squeezes slightly while held. */
export function Tap({ children, style, scaleTo = 0.96, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n: number) => Animated.spring(v, { toValue: n, useNativeDriver: NATIVE, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...p} onPressIn={(e) => { to(scaleTo); p.onPressIn?.(e); }} onPressOut={(e) => { to(1); p.onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children as React.ReactNode}</Animated.View>
    </Pressable>
  );
}

/** Heart-style toggle: squashes then springs back each time `on` flips (not on first render). */
export function Pop({ on, children, style }: { on: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce || !on) return; // pop when saved, not when removed
    Animated.sequence([Animated.timing(v, { toValue: 0.7, duration: 80, useNativeDriver: NATIVE }), Animated.spring(v, { toValue: 1, useNativeDriver: NATIVE, damping: 4, stiffness: 240 })]).start();
  }, [on, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Fades (and rises a few points) when it mounts: panels that open over a page, such as the search results. */
export function FadeIn({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (!reduce) Animated.timing(v, { toValue: 1, duration: 200, useNativeDriver: NATIVE }).start(); }, [v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}
