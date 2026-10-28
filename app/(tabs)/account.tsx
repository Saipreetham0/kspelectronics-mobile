import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretRight, ClockCounterClockwise, FileText, Headset, Heart, Package, ShareNetwork, SignOut, Truck, User, WhatsappLogo } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Field, Spinner } from '@/components/ui';
import { Tap } from '@/components/motion';
import { useStore } from '@/store';
import { SITE_URL, WHATSAPP } from '@/config';
import { POLICIES } from '@/policies';
import { c, r } from '@/theme';

const chat = () => Linking.openURL(`https://wa.me/${WHATSAPP}`);
const shareApp = () => Share.share({ message: `Shop electronics, 3D printers and Raspberry Pi at KSP Electronics: ${SITE_URL}` }).catch(() => {});

export default function Account() {
  const { ready, user, login, register, logout } = useStore();
  const { next } = useLocalSearchParams<{ next?: string }>(); // 'back': the shopper came from checkout, so logging in returns them there
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [f, setF] = useState({ username: '', password: '', email: '', firstName: '', lastName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  if (!ready) return <Spinner />;

  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'in') await login(f.username.trim(), f.password);
      else await register({ email: f.email.trim(), password: f.password, firstName: f.firstName.trim(), lastName: f.lastName.trim() });
      if (next === 'back' && router.canGoBack()) { router.setParams({ next: '' }); router.back(); }
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

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
      <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        {header(mode === 'in' ? 'Welcome back' : 'Create your account', mode === 'in' ? 'Sign in to see your orders and check out faster.' : 'It takes a minute and makes checkout faster.')}
        <View style={s.body}>
          <Card>
            <Text style={{ color: '#444', fontSize: 13, lineHeight: 19, marginBottom: 14 }}>You can order without an account. Log in to see your orders, keep your addresses and check out faster.</Text>
            {mode === 'up' && <>
              <Field label="First name" value={f.firstName} onChangeText={set('firstName')} autoComplete="given-name" />
              <Field label="Last name" value={f.lastName} onChangeText={set('lastName')} autoComplete="family-name" />
            </>}
            {mode === 'in'
              ? <Field label="Username or email" value={f.username} onChangeText={set('username')} autoCapitalize="none" autoComplete="username" />
              : <Field label="Email" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />}
            <Field label={mode === 'up' ? 'Password (8+ characters)' : 'Password'} value={f.password} onChangeText={set('password')} secureTextEntry autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
            {error ? <Text style={s.err}>{error}</Text> : null}
            {mode === 'in' && <Pressable onPress={() => Linking.openURL(`${SITE_URL}/my-account/lost-password/`).catch(() => {})} hitSlop={8} style={{ alignSelf: 'flex-end', marginBottom: 10 }} accessibilityRole="link"><Text style={{ color: c.accent, fontWeight: '700', fontSize: 13 }}>Forgot password?</Text></Pressable>}
            <Button title={mode === 'in' ? 'Log in' : 'Register'} loading={busy} onPress={submit} />
            {mode === 'up' && <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 }}>By registering you agree to our <Text style={{ color: c.accent, fontWeight: '700' }} onPress={() => Linking.openURL(POLICIES[0].url).catch(() => {})} accessibilityRole="link">Terms</Text> and <Text style={{ color: c.accent, fontWeight: '700' }} onPress={() => Linking.openURL(POLICIES[1].url).catch(() => {})} accessibilityRole="link">Privacy policy</Text>.</Text>}
            <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: c.accent, fontWeight: '700' }}>{mode === 'in' ? 'New here? Create an account' : 'I already have an account'}</Text>
            </Pressable>
          </Card>
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
  err: { color: c.danger, marginBottom: 12, fontSize: 13 },
  quick: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: r.lg, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 8 },
  quickT: { fontSize: 13, fontWeight: '700', color: c.text, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: r.lg, marginBottom: 14, overflow: 'hidden' },
  sectionT: { fontSize: 18, fontWeight: '900', color: c.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 54 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  rowT: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },
});
