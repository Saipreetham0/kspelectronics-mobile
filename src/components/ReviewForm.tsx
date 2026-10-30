import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Button, Field } from '@/components/ui';
import { api } from '@/api';
import { useStore } from '@/store';
import { maybeAskStoreReview } from '@/storeReview';
import { c, r } from '@/theme';

// "Write a review": stars, name, email and a few words. New reviews wait for approval in WooCommerce before they show.
export default function ReviewForm({ productId }: { productId: number }) {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [text, setText] = useState('');

  if (done) return <Text style={s.thanks}>Thank you! Your review will appear once it has been approved.</Text>;
  if (!open) return <Button title="Write a review" variant="outline" onPress={() => setOpen(true)} />;

  const send = async () => {
    if (!rating) return Alert.alert('Review', 'Tap the stars to choose a rating.');
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || text.trim().length < 10) return Alert.alert('Review', 'Please add your name, a valid email, and at least 10 characters of review.');
    setBusy(true);
    try { await api('/api/reviews', { method: 'POST', body: { productId, rating, name: name.trim(), email: email.trim(), review: text.trim() } }); setDone(true); if (rating >= 4) maybeAskStoreReview(); }
    catch (e) { Alert.alert('Could not send review', (e as Error).message); }
    setBusy(false);
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Rating: ${rating} of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}><Star size={32} weight={n <= rating ? 'fill' : 'regular'} color={c.deal} /></Pressable>
        ))}
      </View>
      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Email (not shown)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Your review" value={text} onChangeText={setText} multiline style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }} />
      <Button title="Submit review" loading={busy} onPress={send} />
    </View>
  );
}
const s = StyleSheet.create({ thanks: { color: c.success, fontWeight: '700', padding: 12, borderRadius: r.md, backgroundColor: c.greenSoft } });
