import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import { Button, Card, Center, Field, H } from '@/components/ui';
import { api } from '@/api';
import { POLICIES } from '@/policies';
import { useStore } from '@/store';
import { c } from '@/theme';

// Your name, your password, and deleting the account. Every change goes to the WooCommerce customer record the website uses too.
export default function Profile() {
  const { user, account, logout, ready } = useStore();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [del, setDel] = useState(false);
  const [delPw, setDelPw] = useState('');
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
  const confirmDelete = () => Alert.alert('Delete your account?', 'This removes your login, saved details and wishlist. Past orders are kept by the shop for its tax records. This cannot be undone.', [
    { text: 'Keep my account', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: () => run('del', async () => {
      await api('/api/auth/delete', { method: 'POST', body: { password: delPw } });
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
      </Card>

      <Card>
        <H>Policies</H>
        {POLICIES.map((p) => <Text key={p.url} style={s.link} onPress={() => Linking.openURL(p.url).catch(() => {})} accessibilityRole="link">{p.label}</Text>)}
      </Card>

      <Card>
        <H>Delete account</H>
        {del ? (
          <>
            <Text style={{ color: '#444', marginBottom: 10, lineHeight: 20 }}>Enter your password to confirm. Your login, saved details and wishlist are removed. Orders already placed stay with the shop for its tax records.</Text>
            <Field label="Password" value={delPw} onChangeText={setDelPw} secureTextEntry autoComplete="current-password" />
            <Button title="Delete my account" loading={busy === 'del'} disabled={!delPw} onPress={confirmDelete} style={{ backgroundColor: c.danger, borderColor: c.danger }} />
            <Button title="Cancel" variant="outline" onPress={() => { setDel(false); setDelPw(''); }} style={{ marginTop: 8 }} />
          </>
        ) : (
          <Button title="Delete my account" variant="outline" onPress={() => setDel(true)} />
        )}
      </Card>
    </ScrollView>
  );
}
const s = StyleSheet.create({ link: { color: c.accent, fontWeight: '700', paddingVertical: 10 } });
