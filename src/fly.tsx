import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NATIVE } from '@/native';
import { reduceMotion } from '@/components/motion';

type Rect = { x: number; y: number; width: number; height: number };
type Flight = { id: number; src: string; from: Rect };
const FlyCtx = createContext<(src: string | undefined, from: Rect) => void>(() => {});
export const useFly = () => useContext(FlyCtx);

// The product photo shrinks and flies into the Cart tab when something is added (Blinkit does the same). The tab bar is four equal
// tabs inside the phone-width column, so the Cart tab (4th of 4) is at 87.5% of that column's width.
export function FlyProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const next = useRef(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colW = Math.min(width, 560);
  const target = { x: (width - colW) / 2 + colW * 0.875, y: Dimensions.get('window').height - (58 + insets.bottom) / 2 };
  const fly = useCallback((src: string | undefined, from: Rect) => {
    if (!src || reduceMotion()) return;
    const id = next.current++;
    setFlights((f) => [...f, { id, src, from }]);
  }, []);
  const done = useCallback((id: number) => setFlights((f) => f.filter((x) => x.id !== id)), []);
  return (
    <FlyCtx.Provider value={fly}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {flights.map((f) => <Flying key={f.id} f={f} target={target} onDone={() => done(f.id)} />)}
      </View>
    </FlyCtx.Provider>
  );
}

const SIZE = 64;
function Flying({ f, target, onDone }: { f: Flight; target: { x: number; y: number }; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.bezier(0.5, 0, 0.8, 0.6), useNativeDriver: NATIVE }).start(onDone);
  }, [t, onDone]);
  const x0 = f.from.x + f.from.width / 2 - SIZE / 2, y0 = f.from.y + f.from.height / 2 - SIZE / 2;
  const x1 = target.x - SIZE / 2, y1 = target.y - SIZE / 2;
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
      opacity: t.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
      transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) }] }}>
      <Image source={f.src} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </Animated.View>
  );
}
