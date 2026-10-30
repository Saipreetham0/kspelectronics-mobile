import React from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CaretRight, ClockCounterClockwise, FileText, Headset, Heart, Package, ShareNetwork, SignOut, Tag, Truck, User, WhatsappLogo } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Spinner } from '@/components/ui';
import { Tap } from '@/components/motion';
import { useStore } from '@/store';
import { useFlag } from '@/appConfig';
import { SITE_URL, WHATSAPP } from '@/config';
import { c, r } from '@/theme';

const chat = () => Linking.openURL(`https://wa.me/${WHATSAPP}`);
const shareApp = () => Share.share({ message: `Shop electronics, 3D printers and Raspberry Pi at KSP Electronics: ${SITE_URL}` }).catch(() => {});

export default function Account() {
  const { ready, user, logout, showLogin } = useStore();
  const insets = useSafeAreaInsets();
  const offersOn = useFlag('offers');

  if (!ready) return <Spinner />;

  // Blinkit's profile: a soft gradient header, then white grouped cards on a pale page.
  const header = (title: string, sub?: string, initial?: string) => (
    <LinearGradient colors={['#d6e5ff', '#eef3fc', c.surface]} style={[s.head, { paddingTop: insets.top + 24 }]}>
      <View style={s.avatar}>{initial ? <Text style={s.avatarT}>{initial}</Text> : <Text style={s.avatarT}>?</Text>}</View>
      <Text style={s.name}>{title}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </LinearGradient>
  );

  if (!user) {
    return (
      <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: 150 }}>
        {header('Welcome', 'Log in to see your orders, keep your addresses and check out faster.')}
        <View style={s.body}>
          <Card><Button title="Log in or register" onPress={showLogin} /></Card>
          <Section title="Help and more">
            <Row Glyph={Heart} label="Wishlist" onPress={() => router.push('/wishlist')} />
            <Row Glyph={Truck} label="Track an order" onPress={() => router.push('/track')} />
            <Row Glyph={WhatsappLogo} label="Chat with us on WhatsApp" onPress={chat} />
            <Row Glyph={ShareNetwork} label="Share the app" onPress={shareApp} last />
          </Section>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
      {header(user.name, user.email, user.name.trim()[0]?.toUpperCase())}
      <View style={s.body}>
        <View style={s.quick}>
          <Quick Glyph={Package} label="Your orders" onPress={() => router.push('/orders')} />
          <Quick Glyph={Heart} label="Wishlist" onPress={() => router.push('/wishlist')} />
          <Quick Glyph={Headset} label="Need help?" onPress={() => router.push('/help')} />
        </View>

        <Section title="Your information">
          <Row Glyph={ClockCounterClockwise} label="Order again" onPress={() => router.push('/(tabs)/reorder')} />
          {offersOn && <Row Glyph={Tag} label="Offers and coupons" onPress={() => router.push('/offers')} />}
          <Row Glyph={Truck} label="Track an order" onPress={() => router.push('/track')} last />
        </Section>

        <Section title="Account">
          <Row Glyph={User} label="Profile and security" onPress={() => router.push('/profile')} last />
        </Section>

        <Section title="Help and more">
          <Row Glyph={Headset} label="Help and support" onPress={() => router.push('/help')} />
          <Row Glyph={WhatsappLogo} label="Chat with us on WhatsApp" onPress={chat} />
          <Row Glyph={ShareNetwork} label="Share the app" onPress={shareApp} />
          <Row Glyph={FileText} label="Terms, privacy and policies" onPress={() => router.push('/help')} last />
        </Section>

        <Section>
          <Row Glyph={SignOut} label="Log out" danger onPress={logout} last />
        </Section>

        <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: c.muted }}>
            KSP Electronics v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Quick({ Glyph, label, onPress }: { Glyph: Icon; label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} scaleTo={0.96} style={s.quickCard} accessibilityRole="button" accessibilityLabel={label}>
      <Glyph size={30} weight="duotone" color={c.accent} />
      <Text style={s.quickT}>{label}</Text>
    </Tap>
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

function Row({ Glyph, label, onPress, danger, last }: { Glyph: Icon; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { backgroundColor: c.surface }]} accessibilityRole="button">
      <Glyph size={22} color={danger ? c.danger : c.text} />
      <Text style={[s.rowT, danger && { color: c.danger }]}>{label}</Text>
      {!danger && <CaretRight size={16} color="#b4b8c0" />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 22 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarT: { fontSize: 38, fontWeight: '800', color: c.accent },
  name: { fontSize: 24, fontWeight: '900', color: c.text, marginTop: 14, textAlign: 'center' },
  sub: { fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center' },
  body: { paddingHorizontal: 12 },
  quick: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: r.lg, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 8 },
  quickT: { fontSize: 13, fontWeight: '700', color: c.text, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: r.lg, marginBottom: 14, overflow: 'hidden' },
  sectionT: { fontSize: 18, fontWeight: '900', color: c.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 54 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  rowT: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },
});
