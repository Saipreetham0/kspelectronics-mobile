import React, { useRef } from 'react';
import { Alert, Animated, Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CaretRight, ClockCounterClockwise, Headset, Heart, Info, LockSimple, MapPin, Package, ShareNetwork, SignOut, Tag, Truck, User, UserCircle, WhatsappLogo } from '@/icons';
import type { Icon } from '@/icons';
import { Text } from '@/components/Text';
import { Button, Spinner } from '@/components/ui';
import { Tap } from '@/components/motion';
import { useStore } from '@/store';
import { useFlag } from '@/appConfig';
import { SITE_URL, WHATSAPP } from '@/config';
import { POLICIES } from '@/policies';
import { c, r } from '@/theme';

const chat = () => Linking.openURL(`https://wa.me/${WHATSAPP}`).catch(() => {});
const shareApp = () => Share.share({ message: `Shop electronics, 3D printers and Raspberry Pi at KSP Electronics: ${SITE_URL}` }).catch(() => {});
const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

// Blinkit's profile page: a full-bleed gradient header with a floating back button that folds into a slim title bar on scroll,
// three shortcut tiles, then grouped white cards (each row: icon, label, chevron), log out on its own, and the brand and version at the foot.
export default function Account() {
  const { ready, user, logout, showLogin } = useStore();
  const offersOn = useFlag('offers');
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(0)).current;
  if (!ready) return <Spinner />;

  // Logging out also clears this phone's cart, wishlist, saved addresses and recent searches: ask first.
  const confirmLogout = () => Alert.alert('Log out?', 'Your cart, wishlist and saved addresses on this phone will be cleared.', [
    { text: 'Stay logged in', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: () => { logout(); } },
  ]);
  const privacy = () => (user ? router.push('/profile') : Linking.openURL(POLICIES[1].url).catch(() => {}));
  const top = insets.top;
  const barO = y.interpolate({ inputRange: [120, 170], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <Animated.ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}>
        <LinearGradient colors={[c.heroTop, c.accentTint, c.surface]} style={[s.head, { paddingTop: top + 56 }]}>
          <View style={s.avatar}>
            {user ? <Text style={s.avatarT}>{user.name.trim()[0]?.toUpperCase() ?? ''}</Text> : <UserCircle size={64} weight="duotone" color={c.accent} />}
          </View>
          <Text style={s.name}>{user ? user.name : 'Welcome'}</Text>
          <Text style={s.sub}>{user ? user.email ?? '' : 'Log in to see your orders and check out faster'}</Text>
        </LinearGradient>

        <View style={s.body}>
          {!user && <View style={{ marginBottom: 14 }}><Button title="Log in or register" onPress={showLogin} /></View>}

          <View style={s.quick}>
            <Quick Glyph={Package} label="Your orders" onPress={() => (user ? router.push('/orders') : router.push('/track'))} />
            <Quick Glyph={Heart} label="Wishlist" onPress={() => router.push('/wishlist')} />
            <Quick Glyph={Headset} label="Need help?" onPress={() => router.push('/help')} />
          </View>

          <Section title="Your information">
            <Row Glyph={MapPin} label="Address book" onPress={() => router.push('/addresses')} />
            <Row Glyph={ClockCounterClockwise} label="Order again" onPress={() => router.push('/(tabs)/reorder')} />
            <Row Glyph={Truck} label="Track an order" onPress={() => router.push('/track')} last={!user} />
            {user ? <Row Glyph={User} label="Profile and security" onPress={() => router.push('/profile')} last /> : null}
          </Section>

          {offersOn && (
            <Section title="Payment and coupons">
              <Row Glyph={Tag} label="Offers and coupons" onPress={() => router.push('/offers')} last />
            </Section>
          )}

          <Section title="Other information">
            <Row Glyph={ShareNetwork} label="Share the app" onPress={shareApp} />
            <Row Glyph={Info} label="About us and policies" onPress={() => router.push('/help')} />
            <Row Glyph={WhatsappLogo} label="Chat with us on WhatsApp" onPress={chat} />
            <Row Glyph={LockSimple} label="Account privacy" onPress={privacy} />
            <Row Glyph={Bell} label="Notification preferences" onPress={() => Linking.openSettings().catch(() => {})} last />
          </Section>

          {user && <Section><Row Glyph={SignOut} label="Log out" onPress={confirmLogout} last /></Section>}

          <View style={s.foot}>
            <Image source={require('../assets/ksp-logo.png')} style={s.footLogo} contentFit="contain" accessibilityLabel="KSP Electronics" />
            <Text style={{ fontSize: 12, color: c.muted }}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* The slim bar that fades in once the big header has scrolled away. */}
      <Animated.View pointerEvents="none" style={[s.bar, { paddingTop: top, height: top + 52, opacity: barO }]}>
        <Text style={s.barT}>Account</Text>
      </Animated.View>
      <Pressable onPress={back} hitSlop={10} style={[s.back, { top: top + 8 }]} accessibilityRole="button" accessibilityLabel="Back">
        <ArrowLeft size={20} color={c.text} weight="bold" />
      </Pressable>
    </View>
  );
}

function Quick({ Glyph, label, onPress }: { Glyph: Icon; label: string; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>{/* Tap styles its inner view, so the share of the row is set here */}
      <Tap onPress={onPress} scaleTo={0.96} style={s.quickCard} accessibilityRole="button" accessibilityLabel={label}>
        <Glyph size={30} weight="duotone" color={c.accent} />
        <Text style={s.quickT}>{label}</Text>
      </Tap>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      {title ? <Text style={s.sectionT}>{title}</Text> : null}
      {children}
    </View>
  );
}

function Row({ Glyph, label, onPress, last }: { Glyph: Icon; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { backgroundColor: c.surface }]} accessibilityRole="button">
      <Glyph size={22} color={c.text2} />
      <Text style={s.rowT}>{label}</Text>
      <CaretRight size={16} color={c.borderStrong} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 22 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarT: { fontSize: 38, fontWeight: '800', color: c.accent },
  name: { fontSize: 24, fontWeight: '800', color: c.text, marginTop: 14, textAlign: 'center' },
  sub: { fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center' },
  body: { paddingHorizontal: 12 },
  quick: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickCard: { backgroundColor: '#fff', borderRadius: r.lg, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 8 },
  quickT: { fontSize: 13, fontWeight: '700', color: c.text, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: r.lg, marginBottom: 14, overflow: 'hidden' },
  sectionT: { fontSize: 17, fontWeight: '800', color: c.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 52 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  rowT: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },
  foot: { alignItems: 'center', gap: 6, marginTop: 18, opacity: 0.45 },
  footLogo: { width: 150, height: 28 },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: c.line, justifyContent: 'center', paddingLeft: 64 },
  barT: { fontSize: 17, fontWeight: '800', color: c.text },
  back: { position: 'absolute', left: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line },
});
