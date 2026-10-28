import React, { useEffect, useRef } from 'react';
import { NATIVE } from '@/native';
import { Animated, View, ViewStyle } from 'react-native';
import { c, r } from '@/theme';

// Pulsing placeholder shown while content loads (smoother than a spinner).
export function Skeleton({ style }: { style?: ViewStyle }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: NATIVE }), Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: NATIVE })]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[{ backgroundColor: '#e9ebef', borderRadius: r.sm, opacity: o }, style]} />;
}

export const ProductSkeleton = ({ width }: { width?: number }) => (
  <View style={[{ margin: 5, padding: 10, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' }, width ? { width } : { flex: 1 }]}>
    <Skeleton style={{ width: '100%', aspectRatio: 1 }} />
    <Skeleton style={{ height: 12, marginTop: 10, width: '90%' }} />
    <Skeleton style={{ height: 12, marginTop: 6, width: '55%' }} />
  </View>
);
