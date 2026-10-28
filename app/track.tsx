import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, H } from '@/components/ui';
import { api } from '@/api';
import { decodeHtml } from '@/format';
import { useStore } from '@/store';
import { c } from '@/theme';

type Result = {
  number: string; status: string; date: string; total: string; destination: string;
  items: { id: number; name: string; quantity: number }[];
  shipment: { courier: string; awb: string; link: string } | null;
  live?: { status: string; courier: string; eta: string | null; link: string; activities: { date: string; activity: string; location: string }[] } | null; // a Shiprocket Quick rider's live status
  stages: { title: string; note: string; done: boolean; current: boolean }[];
  updates: { id: number; date: string; text: string }[];
};

export default function Track() {
  const { order } = useLocalSearchParams<{ order?: string }>();
  const { user } = useStore();
  const [orderId, setOrderId] = useState(order ?? '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  useEffect(() => { if (user?.email) setEmail((e) => e || user.email!); }, [user]);

  const go = async () => {
    setBusy(true); setError(''); setRes(null);
    try { setRes(await api<Result>('/api/track-order', { method: 'POST', body: { orderId, email } })); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: c.surface }}>
      <Card>
        <Field label="Order number" value={orderId} onChangeText={setOrderId} keyboardType="number-pad" placeholder="e.g. 33955" />
        <Field label="Billing email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email used at checkout" />
        {error ? <Text style={{ color: c.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Button title="Track order" loading={busy} disabled={!orderId || !email} onPress={go} />
      </Card>

      {res && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 20, fontWeight: '900' }}>#{res.number}</Text>
              <Text style={{ color: c.accent, fontWeight: '800', textTransform: 'capitalize' }}>{res.status.replace(/-/g, ' ')}</Text>
            </View>
            <Text style={{ color: c.muted, marginTop: 4 }}>{new Date(res.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {res.total}{res.destination ? ` · ${res.destination}` : ''}</Text>
          </Card>
          {res.stages.length > 0 && (
            <Card>
              {res.stages.map((s, i) => (
                <View key={s.title} style={{ flexDirection: 'row', gap: 12, marginBottom: i < res.stages.length - 1 ? 16 : 0 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: s.done ? c.accent : '#fff', borderWidth: 2, borderColor: s.done || s.current ? c.accent : '#cbd5e1' }}>
                    <Text style={{ color: s.done ? '#fff' : c.accent, fontWeight: '800', fontSize: 12 }}>{s.done ? '✓' : i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: s.done || s.current ? c.text : '#64748b' }}>{s.title}</Text><Text style={{ color: '#64748b', fontSize: 13 }}>{s.note}</Text></View>
                </View>
              ))}
            </Card>
          )}
          {res.shipment && (
            <Card>
              <H>Shipment</H>
              <Text style={{ lineHeight: 24 }}>Courier: <Text style={{ fontWeight: '700' }}>{res.shipment.courier || 'Courier partner'}</Text>{'\n'}Tracking no.: <Text style={{ fontWeight: '700' }} selectable>{res.shipment.awb}</Text></Text>
              {res.live?.status ? (
                <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: c.greenSoft }}>
                  <Text style={{ fontWeight: '800', color: c.greenDark }}>{res.live.status}</Text>
                  {res.live.activities.slice(0, 4).map((a, n) => (
                    <Text key={n} style={{ color: '#444', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{a.activity.replace(/\s+/g, ' ').trim()}{a.location ? ` · ${a.location}` : ''}</Text>
                  ))}
                </View>
              ) : null}
              <Button title="Track shipment" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(res.live?.link || res.shipment!.link || 'https://kspelectronics.shiprocket.co/')} />
            </Card>
          )}
          {res.updates.length > 0 && (
            <Card>
              <H>Updates</H>
              {res.updates.map((u) => <View key={u.id} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: 12, marginBottom: 12 }}><Text style={{ color: c.muted, fontSize: 12 }}>{new Date(u.date).toLocaleString('en-IN')}</Text><Text>{u.text}</Text></View>)}
            </Card>
          )}
          <Card>
            <H>Items</H>
            {res.items.map((i) => <Text key={i.id} style={{ lineHeight: 24 }}>{decodeHtml(i.name)} × {i.quantity}</Text>)}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
