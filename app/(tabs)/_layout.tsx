import { useEffect, useRef, useState } from 'react';
import { NATIVE } from '@/native';
import { Animated, Platform, Pressable, Text as RNText, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Tabs, useSegments } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { ClockCounterClockwise, House, ShoppingCart, SquaresFour } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import { useStore } from '@/store';
import { useScreen } from '@/useScreen';
import { Bump } from '@/components/motion';
import SearchButton from '@/components/SearchButton';
import { useFreeShip, useFreeShipMin } from '@/freeShip';
import { minorToInr } from '@/format';
import { c } from '@/theme';

const INACTIVE = c.muted;
const TABS: Record<string, { Glyph: Icon; label: (narrow: boolean) => string }> = {
  index: { Glyph: House, label: () => 'Home' },
  shop: { Glyph: SquaresFour, label: () => 'Categories' },
  reorder: { Glyph: ClockCounterClockwise, label: (narrow) => (narrow ? 'Reorder' : 'Order Again') },
  cart: { Glyph: ShoppingCart, label: () => 'Cart' },
};

// One tab: the icon pops when it becomes active, and the label turns bold and brand blue.
function Tab({ Glyph, text, focused, size, fs, badge, onPress, onLongPress, a11y }: {
  Glyph: Icon; text: string; focused: boolean; size: number; fs: number; badge?: number; onPress: () => void; onLongPress: () => void; a11y: string;
}) {
  const pop = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(lift, { toValue: focused ? 1 : 0, useNativeDriver: NATIVE, damping: 14, stiffness: 220 }).start();
    if (focused) Animated.sequence([Animated.timing(pop, { toValue: 1.22, duration: 110, useNativeDriver: NATIVE }), Animated.spring(pop, { toValue: 1, useNativeDriver: NATIVE, damping: 6, stiffness: 250 })]).start();
  }, [focused, pop, lift]);
  const color = focused ? c.accent : INACTIVE;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}
      accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={a11y}>
      <Animated.View style={{ transform: [{ scale: pop }, { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) }] }}>
        <Bump trigger={badge ?? 0}>
          <Glyph weight={focused ? 'fill' : 'regular'} color={color} size={size} />
        </Bump>
        {badge ? (
          <View style={{ position: 'absolute', top: -5, right: -11, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.deal, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <RNText allowFontScaling={false} style={{ color: c.text, fontFamily: 'Inter_800ExtraBold', fontSize: 11 }}>{badge > 99 ? '99+' : badge}</RNText>
          </View>
        ) : null}
      </Animated.View>
      <RNText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false}
        style={{ color, fontFamily: focused ? 'Inter_800ExtraBold' : 'Inter_600SemiBold', fontSize: fs, textAlign: 'center', width: '100%', marginTop: 3 }}>{text}</RNText>
    </Pressable>
  );
}

// Blinkit-style bar: a short brand-blue bar slides along the top edge to the active tab, with a soft shadow instead of a hard line.
// Tapping the tab you're on scrolls that screen back to the top (the screens listen for the tabPress event), and every tap gives a light tick.
function TabBar({ state, descriptors, emitter, navigateToTab, height, bottomPad, width, itemCount }: BottomTabBarProps & { height: number; bottomPad: number; width: number; itemCount: number }) {
  const routes = state.routes.filter((r) => !(descriptors[r.key].options as { hidden?: boolean }).hidden && TABS[r.name]);
  const active = routes.findIndex((r) => r.key === state.routes[state.index]?.key);
  const [w, setW] = useState(0);
  const tabW = routes.length ? w / routes.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const shown = useRef(new Animated.Value(active >= 0 ? 1 : 0)).current;
  const IND = 28;
  useEffect(() => {
    if (!tabW) return;
    if (active >= 0) Animated.spring(x, { toValue: active * tabW + (tabW - IND) / 2, useNativeDriver: NATIVE, damping: 18, stiffness: 200 }).start();
    Animated.timing(shown, { toValue: active >= 0 ? 1 : 0, duration: 150, useNativeDriver: NATIVE }).start();
  }, [active, tabW, x, shown]);
  const size = Math.round(Math.max(22, Math.min(27, width * 0.06)));
  const fs = width < 340 ? 10 : width < 400 ? 10.5 : width >= 700 ? 13 : 11.5;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, paddingBottom: bottomPad, flexDirection: 'row', backgroundColor: '#fff',
      ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } }, default: { elevation: 12 } }) }}
      accessibilityRole="tablist">
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: IND, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: c.accent, opacity: shown, transform: [{ translateX: x }] }} />
      {routes.map((route) => {
        const focused = route.key === state.routes[state.index]?.key;
        const t = TABS[route.name];
        const text = t.label(width < 360);
        const badge = route.name === 'cart' && itemCount > 0 ? itemCount : undefined;
        return (
          <Tab key={route.key} Glyph={t.Glyph} text={text} focused={focused} size={size} fs={fs} badge={badge}
            a11y={badge ? `${text}, ${badge} item${badge > 1 ? 's' : ''}` : text}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              const ev = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !ev.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })} />
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { itemCount } = useStore();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const { width } = useScreen();
  // The free-delivery nudge rides in the cart pill ("₹450 away from free delivery") instead of a separate strip, so the bottom of the screen stays light.
  const progress = useFreeShip(useFreeShipMin());
  const note = progress ? (progress.left > 0 ? `${minorToInr(progress.left, progress.m)} away from free delivery` : 'Free delivery unlocked') : undefined;
  // One explicit height (content + home-indicator inset) so the cart pill can sit exactly above the bar on every device.
  const barH = 58 + insets.bottom;
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(p) => <TabBar {...p} height={barH} bottomPad={insets.bottom > 0 ? insets.bottom : 6} width={width} itemCount={itemCount} />}
        screenOptions={{ headerTitleStyle: { fontFamily: 'Inter_800ExtraBold' } }}>
        {/* Browsing comes before re-buying in an electronics store, so Categories is second. */}
        <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Tabs.Screen name="shop" options={{ title: 'Categories', headerShown: false }} />
        <Tabs.Screen name="reorder" options={{ title: width < 360 ? 'Reorder' : 'Order Again' }} />
        <Tabs.Screen name="cart" options={{ title: 'Cart', headerRight: () => <SearchButton /> }} />
      </Tabs>
      {/* sits just above the tab bar */}
      <CartBar bottom={barH + 10} hidden={segments.includes('cart')} note={note} unlocked={progress ? progress.left <= 0 : false} />
    </View>
  );
}
