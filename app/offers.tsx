import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import { Button, Card, ErrorBox, Spinner } from '@/components/ui';
import { useFetch } from '@/useFetch';
import { useStore } from '@/store';
import { c } from '@/theme';

type Offer = { code: string; title: string; description?: string; minOrder?: number; expires?: string };

// Coupons the store is offering now (GET /api/offers, see docs/SERVER_API.md). "Apply" puts the code on the cart.
export default function Offers() {
  const { data, loading, error, reload } = useFetch<{ offers: Offer[] }>('/api/offers');
  const { cart, applyCoupon } = useStore();
  const [busy, setBusy] = useState('');
  const applied = new Set((cart?.coupons ?? []).map((x) => x.code.toLowerCase()));
  const apply = async (code: string) => {
    if (!cart?.items.length) return Alert.alert('Offers', 'Add something to your cart first, then apply the offer.');
    setBusy(code);
    try { await applyCoupon(code); Alert.alert('Offer applied', `${code.toUpperCase()} is on your cart.`, [{ text: 'View cart', onPress: () => router.replace('/(tabs)/cart') }, { text: 'OK' }]); }
    catch (e) { Alert.alert('Could not apply', (e as Error).message); }
    setBusy('');
  };
  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  const offers = data?.offers ?? [];
  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ padding: 12, paddingBottom: 60 }}>
      {!offers.length && <Text style={{ color: c.muted, textAlign: 'center', marginTop: 40 }}>No offers right now. Check back soon.</Text>}
      {offers.map((o) => (
        <Card key={o.code}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', fontSize: 16 }}>{o.title}</Text>
              {o.description ? <Text style={{ color: '#444', marginTop: 4 }}>{o.description}</Text> : null}
              <Text style={{ color: c.muted, fontSize: 12, marginTop: 6 }}>Code <Text style={{ fontWeight: '800', color: c.accent }}>{o.code.toUpperCase()}</Text>{o.minOrder ? ` · on orders above ₹${o.minOrder}` : ''}{o.expires ? ` · until ${new Date(o.expires).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Text>
            </View>
            <Button title={applied.has(o.code.toLowerCase()) ? 'Applied' : 'Apply'} variant="outline" disabled={applied.has(o.code.toLowerCase())} loading={busy === o.code} onPress={() => apply(o.code)} style={{ minHeight: 40 }} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
