import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import { Button, Card, Center, Field, H } from '@/components/ui';
import { api } from '@/api';
import { useFlag } from '@/appConfig';
import { tenDigits } from '@/phone';
import { POLICIES } from '@/policies';
import { useStore } from '@/store';
import { c } from '@/theme';

// Your name, your password, and deleting the account (confirmed with the password, or, for a shopper who logs in by mobile number and has none, a code sent by SMS). Every change goes to the WooCommerce customer record the website uses too.
export default function Profile() {
  const { user, account, logout, ready, requestOtp } = useStore();
  const otpOn = useFlag('otp');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [del, setDel] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delBy, setDelBy] = useState<'pw' | 'otp'>('pw');
  const [delPhone, setDelPhone] = useState('');
  const [delCode, setDelCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [wait, setWait] = useState(0);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const [busy, setBusy] = useState('');
  useEffect(() => { if (user) account().then((a) => { setFirst(a.customer?.first_name ?? ''); setLast(a.customer?.last_name ?? ''); }).catch(() => {}); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  if (!user) return <Center><Text style={{ marginBottom: 14 }}>Log in to manage your profile.</Text><Button title="Log in" onPress={() => router.replace('/(tabs)/account')} /></Center>;

  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e) { Alert.alert('Could not save', (e as Error).message); } setBusy(''); };
  const saveName = () => run('name', async () => {
    if (!first.trim()) throw new Error('Enter your first name.');
    await api('/api/auth/profile', { method: 'PUT', body: { firstName: first, lastName: last } });
    Alert.alert('Saved', 'Your name is updated.');
  });
  const savePw = () => run('pw', async () => {
    if (next.length < 8) throw new Error('The new password must be at least 8 characters.');
    await api('/api/auth/password', { method: 'POST', body: { current: cur, next } });
    setCur(''); setNext(''); Alert.alert('Password changed', 'Use your new password the next time you log in.');
  });
  const sendDelCode = () => run('code', async () => {
    if (delPhone.length !== 10 || !/^[6-9]/.test(delPhone)) throw new Error('Enter the 10-digit mobile number on your account.');
    setWait(await requestOtp(delPhone)); setCodeSent(true); setDelCode('');
  });
  const cancelDelete = () => { setDel(false); setDelPw(''); setDelPhone(''); setDelCode(''); setCodeSent(false); setDelBy('pw'); };
  const confirmDelete = () => Alert.alert('Delete your account?', 'This removes your login, saved details and wishlist. Past orders are kept by the shop for its tax records. This cannot be undone.', [
    { text: 'Keep my account', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: () => run('del', async () => {
      await api('/api/auth/delete', { method: 'POST', body: delBy === 'otp' ? { phone: delPhone, code: delCode } : { password: delPw } });
      await logout();
      Alert.alert('Account deleted', 'Your account has been deleted.');
    }) },
  ]);

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ padding: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Card>
        <H>Your details</H>
        <Text style={{ color: c.muted, marginBottom: 10 }}>{user.email}</Text>
        <Field label="First name" value={first} onChangeText={setFirst} autoComplete="given-name" autoCapitalize="words" />
        <Field label="Last name" value={last} onChangeText={setLast} autoComplete="family-name" autoCapitalize="words" />
        <Button title="Save name" loading={busy === 'name'} onPress={saveName} />
      </Card>

      <Card>
        <H>Change password</H>
        <Field label="Current password" value={cur} onChangeText={setCur} secureTextEntry autoComplete="current-password" />
        <Field label="New password (8+ characters)" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
        <Button title="Change password" loading={busy === 'pw'} disabled={!cur || next.length < 8} onPress={savePw} />
        {otpOn && <Text style={{ color: c.muted, fontSize: 12, marginTop: 8 }}>Log in with your mobile number? Your account may not have a password: keep using the code sent by SMS.</Text>}
      </Card>

      <Card>
        <H>Policies</H>
        {POLICIES.map((p) => <Text key={p.url} style={s.link} onPress={() => Linking.openURL(p.url).catch(() => {})} accessibilityRole="link">{p.label}</Text>)}
      </Card>

      <Card>
        <H>Delete account</H>
        {del ? (
          <>
            {delBy === 'pw' ? (<>
              <Text style={{ color: '#444', marginBottom: 10, lineHeight: 20 }}>Enter your password to confirm. Your login, saved details and wishlist are removed. Orders already placed stay with the shop for its tax records.</Text>
              <Field label="Password" value={delPw} onChangeText={setDelPw} secureTextEntry autoComplete="current-password" />
              <Button title="Delete my account" loading={busy === 'del'} disabled={!delPw} onPress={confirmDelete} style={{ backgroundColor: c.danger, borderColor: c.danger }} />
            </>) : (<>
              <Text style={{ color: '#444', marginBottom: 10, lineHeight: 20 }}>Confirm with a code sent to the mobile number on your account. Your login, saved details and wishlist are removed. Orders already placed stay with the shop for its tax records.</Text>
              <Field label="Mobile number" value={delPhone} onChangeText={(v) => { setDelPhone(tenDigits(v)); setCodeSent(false); }} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="10-digit mobile" />
              {codeSent && <Field label="Code" value={delCode} onChangeText={(v) => setDelCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} placeholder="••••••" />}
              {codeSent
                ? <Button title="Delete my account" loading={busy === 'del'} disabled={delCode.length !== 6} onPress={confirmDelete} style={{ backgroundColor: c.danger, borderColor: c.danger }} />
                : <Button title="Send code" loading={busy === 'code'} disabled={delPhone.length !== 10} onPress={sendDelCode} />}
              {codeSent && <Pressable onPress={sendDelCode} disabled={wait > 0 || Boolean(busy)} style={{ alignItems: 'center', padding: 10 }} accessibilityRole="button"><Text style={{ color: wait > 0 ? c.muted : c.accent, fontWeight: '700' }}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</Text></Pressable>}
            </>)}
            {otpOn && <Pressable onPress={() => setDelBy(delBy === 'pw' ? 'otp' : 'pw')} style={{ alignItems: 'center', padding: 10 }} accessibilityRole="button"><Text style={{ color: c.accent, fontWeight: '700' }}>{delBy === 'pw' ? 'No password? Confirm with a code to your mobile' : 'Confirm with my password instead'}</Text></Pressable>}
            <Button title="Cancel" variant="outline" onPress={cancelDelete} style={{ marginTop: 8 }} />
          </>
        ) : (
          <Button title="Delete my account" variant="outline" onPress={() => setDel(true)} />
        )}
      </Card>
    </ScrollView>
  );
}
const s = StyleSheet.create({ link: { color: c.accent, fontWeight: '700', paddingVertical: 10 } });
