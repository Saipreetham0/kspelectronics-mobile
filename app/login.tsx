import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button, Card, Field } from '@/components/ui';
import { useStore } from '@/store';
import { useFlag } from '@/appConfig';
import { tenDigits } from '@/phone';
import { SITE_URL, WHATSAPP } from '@/config';
import { POLICIES } from '@/policies';
import { c } from '@/theme';

// The app's front door: the root layout shows only this screen until the shopper is signed in (Stack.Protected), and signing in or out moves them on or back by itself.
export default function Login() {
  const { login, register, skipLogin } = useStore();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up' | 'otp'>('in');
  const otpOn = useFlag('otp'); // the store has switched mobile-number login on
  const [f, setF] = useState({ username: '', password: '', email: '', firstName: '', lastName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'in') await login(f.username.trim(), f.password);
      else await register({ email: f.email.trim(), password: f.password, firstName: f.firstName.trim(), lastName: f.lastName.trim() });
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#d6e5ff', '#eef3fc', c.surface]} style={{ paddingTop: insets.top + 40, paddingBottom: 28, paddingHorizontal: 20 }}>
        <Image source={require('../assets/ksp-logo.png')} style={{ width: 200, height: 36, marginBottom: 22 }} contentFit="contain" contentPosition="left center" accessibilityLabel="KSP Electronics" />
        <Text style={{ fontSize: 26, fontWeight: '900', color: c.text }}>{mode === 'in' ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={{ color: c.muted, marginTop: 6, fontSize: 14 }}>{mode === 'in' ? 'Log in to see your orders and check out faster.' : 'It takes a minute and makes checkout faster.'}</Text>
      </LinearGradient>
      <View style={{ paddingHorizontal: 12 }}>
        {mode === 'otp' ? <OtpCard onBack={() => setMode('in')} /> : <Card>
          {mode === 'up' && <>
            <Field label="First name" value={f.firstName} onChangeText={set('firstName')} autoComplete="given-name" textContentType="givenName" />
            <Field label="Last name" value={f.lastName} onChangeText={set('lastName')} autoComplete="family-name" textContentType="familyName" />
          </>}
          {mode === 'in'
            ? <Field label="Username or email" value={f.username} onChangeText={set('username')} autoCapitalize="none" autoComplete="username" textContentType="username" />
            : <Field label="Email" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />}
          <Field label={mode === 'up' ? 'Password (8+ characters)' : 'Password'} value={f.password} onChangeText={set('password')} secureTextEntry autoComplete={mode === 'in' ? 'current-password' : 'new-password'} textContentType={mode === 'in' ? 'password' : 'newPassword'} onSubmitEditing={submit} />
          {error ? <Text style={{ color: c.danger, fontSize: 13, marginBottom: 10 }} accessibilityRole="alert">{error}</Text> : null}
          {mode === 'in' && <Pressable onPress={() => Linking.openURL(`${SITE_URL}/my-account/lost-password/`).catch(() => {})} hitSlop={12} style={{ alignSelf: 'flex-end', marginBottom: 10 }} accessibilityRole="link"><Text style={{ color: c.accent, fontWeight: '700', fontSize: 13 }}>Forgot password?</Text></Pressable>}
          <Button title={mode === 'in' ? 'Log in' : 'Register'} loading={busy} onPress={submit} />
          {mode === 'up' && <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 }}>By registering you agree to our <Text style={s.link} onPress={() => Linking.openURL(POLICIES[0].url).catch(() => {})} accessibilityRole="link">Terms</Text> and <Text style={s.link} onPress={() => Linking.openURL(POLICIES[1].url).catch(() => {})} accessibilityRole="link">Privacy policy</Text>.</Text>}
          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); }} style={{ marginTop: 16, alignItems: 'center', padding: 6 }} accessibilityRole="button">
            <Text style={s.link}>{mode === 'in' ? 'New here? Create an account' : 'I already have an account'}</Text>
          </Pressable>
          {otpOn && <Pressable onPress={() => { setMode('otp'); setError(''); }} style={{ marginTop: 6, alignItems: 'center', padding: 6 }} accessibilityRole="button"><Text style={s.link}>Log in with mobile number (OTP)</Text></Pressable>}
        </Card>}
        <Button title="Continue without an account" variant="outline" onPress={skipLogin} />
        <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>You can still order as a guest. Log in any time from your account to see orders and check out faster.</Text>
        <Pressable onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`).catch(() => {})} style={{ alignItems: 'center', padding: 12 }} accessibilityRole="link"><Text style={s.link}>Need help? Chat with us on WhatsApp</Text></Pressable>
      </View>
    </ScrollView>
  );
}

// Mobile number, then the code from the SMS. The field is marked as a one-time code so iOS and Android offer it from the incoming message; six digits submit by themselves.
function OtpCard({ onBack }: { onBack: () => void }) {
  const { requestOtp, loginOtp } = useStore();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const send = async () => {
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) return setError('Enter a valid 10-digit mobile number.');
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try { setWait(await requestOtp(phone)); setSent(true); setCode(''); } catch (e) { setError((e as Error).message); }
    sending.current = false; setBusy(false);
  };
  const verify = async (c: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await loginOtp(phone, c); } catch (e) { setError((e as Error).message); setCode(''); setBusy(false); }
  };

  return (
    <Card>
      {!sent ? (<>
        <Field label="Mobile number" value={phone} onChangeText={(v) => setPhone(tenDigits(v))} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="10-digit mobile" onSubmitEditing={send} />
        {error ? <Text style={{ color: c.danger, fontSize: 13, marginBottom: 10 }} accessibilityRole="alert">{error}</Text> : null}
        <Button title="Send code" loading={busy} onPress={send} />
      </>) : (<>
        <Text style={{ color: '#444', marginBottom: 12 }}>We sent a 6-digit code to +91 {phone}.</Text>
        <Field label="Code" value={code} onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 6); setCode(d); if (d.length === 6) verify(d); }} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} placeholder="••••••" />
        {error ? <Text style={{ color: c.danger, fontSize: 13, marginBottom: 10 }} accessibilityRole="alert">{error}</Text> : null}
        <Button title="Verify and log in" loading={busy} disabled={code.length !== 6} onPress={() => verify(code)} />
        <Pressable onPress={send} disabled={wait > 0 || busy} style={{ alignItems: 'center', padding: 12 }} accessibilityRole="button"><Text style={[s.link, wait > 0 && { color: c.muted }]}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</Text></Pressable>
      </>)}
      <Pressable onPress={sent ? () => { setSent(false); setError(''); } : onBack} style={{ marginTop: 6, alignItems: 'center', padding: 6 }} accessibilityRole="button"><Text style={s.link}>{sent ? 'Change number' : 'Use email and password'}</Text></Pressable>
    </Card>
  );
}

const s = StyleSheet.create({ link: { color: c.accent, fontWeight: '700' } });
