import { useEffect, useRef } from 'react';
import { NATIVE } from '@/native';
import { Animated, Text as RNText, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { ClockCounterClockwise, House, ShoppingCart, SquaresFour } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import { useStore } from '@/store';
import { useScreen } from '@/useScreen';
import { Bump } from '@/components/motion';
import SearchButton from '@/components/SearchButton';
import { c } from '@/theme';

// The active tab's icon springs up a little when selected.
function TabIcon({ Glyph, color, size, focused }: { Glyph: Icon; color: string; size: number; focused: boolean }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (focused) Animated.sequence([Animated.timing(v, { toValue: 1.28, duration: 110, useNativeDriver: NATIVE }), Animated.spring(v, { toValue: 1, useNativeDriver: NATIVE, damping: 6, stiffness: 250 })]).start();
  }, [focused, v]);
  return <Animated.View style={{ transform: [{ scale: v }] }}><Glyph weight={focused ? 'fill' : 'regular'} color={color} size={size} /></Animated.View>;
}
// Icons grow a little on wide phones and shrink on narrow ones, between 22 and 28.
const iconSize = (width: number) => Math.round(Math.max(22, Math.min(28, width * 0.062)));
const icon = (Glyph: Icon, width: number) =>
  ({ color, focused }: { color: ColorValue; size: number; focused: boolean }) => <TabIcon Glyph={Glyph} color={color as string} size={iconSize(width)} focused={focused} />;

// One line, centred, shrinking a little before it would ever be cut off ("Categories" stays whole on a 320dp phone).
const label = (text: string, size: number) =>
  ({ color }: { color: ColorValue; focused: boolean }) => (
    <RNText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false}
      style={{ color: color as string, fontFamily: 'Inter_700Bold', fontSize: size, textAlign: 'center', width: '100%' }}>{text}</RNText>
  );

export default function TabsLayout() {
  const { itemCount } = useStore();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const { width } = useScreen();
  // One explicit height (content + home-indicator inset) so the cart pill can sit exactly above the bar on every device.
  const barH = 58 + insets.bottom;
  // Five tabs share the width: shrink the labels on narrow phones, and ignore the system font scale so they never wrap or clip.
  const fs = width < 340 ? 10 : width < 400 ? 10.5 : width >= 700 ? 13 : 11.5;
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: '#8a8f98',
        tabBarItemStyle: { paddingHorizontal: 2 },
        headerTitleStyle: { fontFamily: 'Inter_800ExtraBold' },
        tabBarStyle: { borderTopColor: c.line, height: barH, paddingTop: 6, paddingBottom: insets.bottom > 0 ? insets.bottom : 6 },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarLabel: label('Home', fs), tabBarIcon: icon(House, width) }} />
        <Tabs.Screen name="reorder" options={{ title: width < 360 ? 'Reorder' : 'Order Again', tabBarLabel: label(width < 360 ? 'Reorder' : 'Order Again', fs), tabBarIcon: icon(ClockCounterClockwise, width) }} />
        <Tabs.Screen name="shop" options={{ title: 'Categories', headerShown: false, tabBarLabel: label('Categories', fs), tabBarIcon: icon(SquaresFour, width) }} />
        <Tabs.Screen name="cart" options={{ title: 'Cart', headerRight: () => <SearchButton />, tabBarLabel: label('Cart', fs), tabBarIcon: ({ color, size, focused }) => <Bump trigger={itemCount}>{icon(ShoppingCart, width)({ color, size, focused })}</Bump>, tabBarBadge: itemCount > 0 ? itemCount : undefined, tabBarBadgeStyle: { backgroundColor: c.accent } }} />
        {/* Account has no tab: it opens from the avatar on Home (and from login prompts). href: null keeps the screen and its links working. */}
        <Tabs.Screen name="account" options={{ title: 'Account', headerShown: false, href: null }} />
      </Tabs>
      {/* sits just above the tab bar */}
      <CartBar bottom={barH + 10} hidden={segments.includes('cart')} />
    </View>
  );
}
