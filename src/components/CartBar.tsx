import React, { useEffect, useRef } from 'react';
import { NATIVE } from '@/native';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store';
import { Bump } from './motion';
import { c, r, shadow } from '@/theme';

// Floating green bar above the tab bar (Blinkit's "View cart"): slides up when the cart has items.
export default function CartBar({ bottom, hidden }: { bottom: number; hidden?: boolean }) {
  const { cart, itemCount } = useStore();
  // Hidden = pushed fully below the screen edge (its own height plus the gap it floats above the tab bar), and faded out with it.
  const away = bottom + 110;
  const y = useRef(new Animated.Value(away)).current;
  const show = itemCount > 0 && !hidden;
  const bounce = useRef(new Animated.Value(1)).current;
  const prev = useRef(itemCount);
  // The whole bar nudges when something is added (Blinkit's "item landed in cart" feel).
  useEffect(() => {
    if (itemCount > prev.current) Animated.sequence([Animated.timing(bounce, { toValue: 1.04, duration: 110, useNativeDriver: NATIVE }), Animated.spring(bounce, { toValue: 1, useNativeDriver: NATIVE, damping: 7, stiffness: 240 })]).start();
    prev.current = itemCount;
  }, [itemCount, bounce]);
  useEffect(() => { Animated.spring(y, { toValue: show ? 0 : away, useNativeDriver: NATIVE, damping: 16, stiffness: 160 }).start(); }, [show, y, away]);
  if (!cart) return null;
  return (
    <Animated.View pointerEvents={show ? 'auto' : 'none'} style={[s.wrap, { bottom, opacity: y.interpolate({ inputRange: [0, away * 0.4, away], outputRange: [1, 0, 0], extrapolate: 'clamp' }), transform: [{ translateY: y }, { scale: bounce }] }]}>
      <Pressable onPress={() => router.push('/(tabs)/cart')} style={({ pressed }) => [s.bar, pressed && { opacity: 0.92 }]} accessibilityRole="button" accessibilityLabel={`View cart, ${itemCount} items`}>
        <View style={s.thumbs}>
          {cart.items.slice(0, 2).map((i, n) => <Image key={i.key} source={i.images[0]?.thumbnail} style={[s.thumb, { marginLeft: n ? -14 : 0, zIndex: 2 - n }]} contentFit="contain" />)}
        </View>
        <View style={{ marginLeft: 10, marginRight: 14 }}>
          <Text style={s.title}>View cart</Text>
          <Bump trigger={itemCount} style={{ alignSelf: 'flex-start' }}><Text style={s.sub}>{itemCount} item{itemCount > 1 ? 's' : ''}</Text></Bump>
        </View>
        <View style={s.go}><Ionicons name="chevron-forward" size={20} color="#fff" /></View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  // Blinkit's pill: centred and only as wide as its content, thumbnails on the left, a round chevron button on the right.
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent, borderRadius: r.pill, padding: 6, ...shadow },
  thumbs: { flexDirection: 'row' },
  thumb: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 2, borderColor: c.accent },
  title: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sub: { color: '#fff', fontSize: 13, marginTop: 1 },
  go: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
});
