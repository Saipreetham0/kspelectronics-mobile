import React, { useState } from 'react';
import Constants from 'expo-constants';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Button, Card, Field, H } from '@/components/ui';
import { api } from '@/api';
import { WHATSAPP } from '@/config';
import { POLICIES } from '@/policies';
import { useStore } from '@/store';
import { c, r } from '@/theme';

const FAQ: { q: string; a: string }[] = [
  { q: 'How fast is delivery?', a: 'Orders in Hyderabad can go out the same day. Elsewhere in India we ship with our courier partners and you get the tracking number on your order.' },
  { q: 'Do prices include GST?', a: 'Yes. Every price in the app includes GST, and your invoice shows the GST split. Add your GSTIN at checkout to get a GST invoice in your company name.' },
  { q: 'How do I cancel or return an order?', a: 'Open Your orders, tap View details, and use Cancel order or Request a return. We reply on your email or phone.' },
  { q: 'My payment was deducted but the order failed.', a: 'It is confirmed automatically within a few minutes, or refunded to your account in 5 to 7 working days. You do not need to pay again. Message us with the order number if you want it checked.' },
  { q: 'Can I pay later?', a: 'Choose Buy now, pay later at checkout when it is shown. You are taken to the lender to approve it, then brought back here.' },
];

// Help: ask a question, read the common answers, or reach us on WhatsApp. The message goes to the same inbox as the website's contact page.
export default function Help() {
  const { user } = useStore();
  const [open, setOpen] = useState(-1);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || message.trim().length < 10) return Alert.alert('Message', 'Please add your name, a valid email and a few words about what you need.');
    setBusy(true);
    try { await api('/api/contact', { method: 'POST', body: { name: name.trim(), email: email.trim(), subject: 'Message from the app', message: message.trim() } }); setMessage(''); Alert.alert('Message sent', 'Thanks. We reply within 24 hours.'); }
    catch (e) { Alert.alert('Could not send', (e as Error).message); }
    setBusy(false);
  };
  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ padding: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Button title="Chat with us on WhatsApp" variant="whatsapp" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`).catch(() => {})} style={{ marginBottom: 12 }} />
      <Card>
        <H>Common questions</H>
        {FAQ.map((f, i) => (
          <View key={f.q} style={s.faq}>
            <Pressable onPress={() => setOpen(open === i ? -1 : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} style={s.faqHead}>
              <Text style={{ flex: 1, fontWeight: '700' }}>{f.q}</Text><Text style={{ color: c.muted, fontSize: 18 }}>{open === i ? '−' : '+'}</Text>
            </Pressable>
            {open === i && <Text style={{ color: '#444', lineHeight: 21, paddingBottom: 12 }}>{f.a}</Text>}
          </View>
        ))}
      </Card>
      <Card>
        <H>Send us a message</H>
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="How can we help?" value={message} onChangeText={setMessage} multiline style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }} />
        <Button title="Send message" loading={busy} onPress={send} />
      </Card>
      <Card>
        <H>Policies</H>
        {POLICIES.map((p) => <Text key={p.url} style={{ color: c.accent, fontWeight: '700', paddingVertical: 10 }} onPress={() => Linking.openURL(p.url).catch(() => {})} accessibilityRole="link">{p.label}</Text>)}
      </Card>
      <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>KSP Electronics app · version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({ faq: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderRadius: r.sm } });
