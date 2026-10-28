import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Button, Field } from '@/components/ui';
import { api } from '@/api';
import { useStore } from '@/store';
import { c } from '@/theme';

// "Notify me when it's back": asks for an email (filled in when logged in) and sends the request to the shop, who write when it arrives.
export default function NotifyMe({ productId, style }: { productId: number; style?: object }) {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert('Email', 'Enter a valid email address.');
    setBusy(true);
    try { await api('/api/stock-alert', { method: 'POST', body: { productId, email: email.trim() } }); setOpen(false); Alert.alert('We will let you know', 'We have your request and will email you when this is back in stock.'); }
    catch (e) { Alert.alert('Could not save', (e as Error).message); }
    setBusy(false);
  };
  return (
    <>
      <Button title="Notify me when back" onPress={() => setOpen(true)} style={style} />
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={s.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={s.sheet}>
            <Text style={{ fontSize: 18, fontWeight: '900' }}>Notify me when back</Text>
            <Text style={{ color: c.muted, marginVertical: 8 }}>We will email you as soon as it is in stock again.</Text>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Button title="Notify me" loading={busy} onPress={send} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: '#fff', padding: 20, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
});
