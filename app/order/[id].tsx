import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, TextInput } from '@/components/Text';
import { Button, Card, ErrorBox, Spinner } from '@/components/ui';
import { api } from '@/api';
import { decodeHtml } from '@/format';
import { SITE_URL, WHATSAPP } from '@/config';
import RiderCard from '@/components/RiderCard';
import ReviewForm from '@/components/ReviewForm';
import type { Rider } from '@/types';
import { c, r } from '@/theme';

type Detail = {
  id: number; number: string; status: string; date: string; currency: string; total: string; tax: string; method: string; shippingTotal: string; discount: string;
  address: { name: string; line: string; city: string; state: string; pincode: string; phone: string };
  items: { id: number; productId: number; name: string; quantity: number; price: string; image: string }[];
  can: { cancel: boolean; return: boolean };
  delivery?: { courier: string; awb: string; live: { status: string; link: string; eta?: string | null; rider?: Rider | null; drop?: { lat: number; lng: number } | null; activities: { date: string; activity: string; location: string }[] } | null } | null;
};

const STATUS: Record<string, string> = { pending: 'Waiting for payment', 'on-hold': 'On hold', processing: 'Being prepared', completed: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded', failed: 'Payment failed' };

// One order: what was bought, where it goes, what was paid, and the actions open to the customer (track, cancel or return, get help).
export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [o, setO] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState<'' | 'cancel' | 'return'>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setError(''); api<Detail>(`/api/orders/${id}`).then(setO).catch((e: Error) => setError(e.message)); }, [id]);
  useEffect(load, [load]);
  // While a rider is on the way the order is read again every 15 seconds, so the dot on the map moves.
  const riding = Boolean(o?.delivery?.live?.rider) && o?.status !== 'completed';
  useEffect(() => {
    if (!riding) return;
    const t = setInterval(() => { api<Detail>(`/api/orders/${id}`).then(setO).catch(() => {}); }, 15000);
    return () => clearInterval(t);
  }, [riding, id]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!o) return <Spinner />;
  const money = (v: string | number) => `${o.currency}${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const help = () => Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, I need help with order #${o.number}.`)}`).catch(() => {});
  const shareReceipt = () => {
    const summaryText = `KSP Electronics - Order #${o.number}\nDate: ${new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\nTotal: ${money(o.total)}\nStatus: ${STATUS[o.status] ?? o.status}\n\nTrack order: ${SITE_URL}/my-account/view-order/${o.number}/`;
    Share.share({ message: summaryText, title: `Order #${o.number} Receipt` }).catch(() => {});
  };
  const send = async () => {
    if (!ask) return;
    setBusy(true);
    try {
      const d = await api<{ result: 'cancelled' | 'requested' }>(`/api/orders/${id}`, { method: 'POST', body: { action: ask, reason: reason.trim() } });
      Alert.alert(d.result === 'cancelled' ? 'Order cancelled' : 'Request sent', d.result === 'cancelled' ? 'Your order was cancelled. Any payment is refunded to your account in 5 to 7 working days.' : 'We have your request and will reply on your email or phone shortly.');
      setAsk(''); setReason(''); load();
    } catch (e) { Alert.alert('Could not send', (e as Error).message); }
    setBusy(false);
  };

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ padding: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={s.row}><Text style={s.h}>Order #{o.number}</Text><Text style={[s.pill, o.status === 'cancelled' || o.status === 'failed' ? s.bad : o.status === 'completed' ? s.good : null]}>{STATUS[o.status] ?? o.status.replace(/-/g, ' ')}</Text></View>
        <Text style={{ color: c.muted, marginTop: 4 }}>{new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {o.method}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button title="Track order" variant="outline" style={{ flex: 1, minHeight: 42 }} onPress={() => router.push({ pathname: '/track', params: { order: o.number } })} />
          <Button title="Get help" variant="whatsapp" style={{ flex: 1, minHeight: 42 }} onPress={help} />
        </View>
      </Card>

      {o.delivery && (
        <Card>
          <Text style={s.h}>Delivery partner</Text>
          <Text style={{ marginTop: 6, lineHeight: 22 }}>{o.delivery.courier || 'Courier partner'}{o.delivery.awb ? `  ·  Tracking ${o.delivery.awb}` : ''}</Text>
          {o.delivery.live?.status ? (
            <View style={{ marginTop: 10, padding: 12, borderRadius: r.md, backgroundColor: c.greenSoft }}>
              <Text style={{ fontWeight: '800', color: c.greenDark }}>{o.delivery.live.status}</Text>
              {o.delivery.live.activities.slice(0, 4).map((a, n) => <Text key={n} numberOfLines={2} style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{a.activity.replace(/\s+/g, ' ').trim()}{a.location ? ` · ${a.location}` : ''}</Text>)}
            </View>
          ) : null}
          {o.delivery.live?.rider ? <RiderCard rider={o.delivery.live.rider} eta={o.delivery.live.eta} drop={o.delivery.live.drop ?? undefined} /> : null}
          {o.delivery.live?.link ? <Button title="Track shipment" variant="outline" style={{ marginTop: 10, minHeight: 42 }} onPress={() => Linking.openURL(o.delivery!.live!.link).catch(() => {})} /> : null}
        </Card>
      )}

      <Card>
        <Text style={s.h}>Items</Text>
        {o.items.map((i) => (
          <View key={i.id} style={s.item}>
            <Image source={i.image} style={s.img} contentFit="contain" />
            <View style={{ flex: 1 }}><Text numberOfLines={2} style={{ fontWeight: '600' }}>{decodeHtml(i.name)}</Text><Text style={{ color: c.muted, marginTop: 2 }}>Qty {i.quantity}</Text></View>
            <Text style={{ fontWeight: '800' }}>{money(i.price)}</Text>
          </View>
        ))}
        <View style={s.hr} />
        {Number(o.discount) > 0 && <View style={s.row}><Text style={{ color: c.success }}>Discount</Text><Text style={{ color: c.success }}>−{money(o.discount)}</Text></View>}
        <View style={s.row}><Text style={{ color: '#555' }}>Delivery</Text><Text>{Number(o.shippingTotal) > 0 ? money(o.shippingTotal) : 'Free'}</Text></View>
        <View style={s.row}><Text style={{ fontWeight: '900', fontSize: 16 }}>Total</Text><Text style={{ fontWeight: '900', fontSize: 16 }}>{money(o.total)}</Text></View>
        <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>Includes GST {money(o.tax)}</Text>
      </Card>

      {o.status === 'completed' && (
        <Card>
          <Text style={s.h}>How were your items?</Text>
          <Text style={{ color: c.muted, marginTop: 4 }}>Your review helps other shoppers. It shows once it has been approved.</Text>
          {o.items.map((i) => (
            <View key={i.id} style={{ marginTop: 14 }}>
              <Text numberOfLines={2} style={{ fontWeight: '600', marginBottom: 8 }}>{decodeHtml(i.name)}</Text>
              <ReviewForm productId={i.productId} />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Text style={s.h}>Delivery address</Text>
        <Text style={{ fontWeight: '700', marginTop: 6 }}>{o.address.name}</Text>
        <Text style={{ color: '#444' }}>{o.address.line}, {o.address.city} {o.address.pincode}</Text>
        {o.address.phone ? <Text style={{ color: c.muted, marginTop: 2 }}>{o.address.phone}</Text> : null}
      </Card>

      <Card>
        <Text style={s.h}>Tax invoice & receipts</Text>
        <Text style={{ color: c.muted, marginTop: 4 }}>
          Your GST invoice is generated and emailed once your shipment is dispatched. You can also share the digital receipt or request an expedited copy.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Button
            title="Share receipt"
            variant="outline"
            style={{ flex: 1, minHeight: 42 }}
            onPress={shareReceipt}
          />
          <Button
            title="Ask for invoice"
            variant="whatsapp"
            style={{ flex: 1, minHeight: 42 }}
            onPress={() =>
              Linking.openURL(
                `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                  `Hi, please send me the official GST invoice PDF for order #${o.number}.`
                )}`
              ).catch(() => {})
            }
          />
        </View>
      </Card>

      {(o.can.cancel || o.can.return) && (
        <Card>
          <Text style={s.h}>{ask === 'cancel' ? 'Cancel this order' : ask === 'return' ? 'Return request' : 'Need to change something?'}</Text>
          {ask ? (
            <>
              <TextInput style={s.input} value={reason} onChangeText={setReason} multiline placeholder={ask === 'return' ? 'Why are you returning it? (required)' : 'Reason (optional)'} accessibilityLabel="Reason" />
              <Button title={ask === 'cancel' ? 'Cancel the order' : 'Send return request'} loading={busy} onPress={send} style={{ marginTop: 10 }} />
              <Button title="Never mind" variant="outline" onPress={() => { setAsk(''); setReason(''); }} style={{ marginTop: 8 }} />
            </>
          ) : (
            <View style={{ gap: 8, marginTop: 10 }}>
              {o.can.cancel && <Button title="Cancel order" variant="outline" onPress={() => setAsk('cancel')} />}
              {o.can.return && <Button title="Request a return" variant="outline" onPress={() => setAsk('return')} />}
              {o.status === 'processing' && <Text style={{ color: c.muted, fontSize: 12 }}>This order is already being prepared, so we confirm the cancellation with you first.</Text>}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: c.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  pill: { fontSize: 12, fontWeight: '800', color: c.accent, backgroundColor: c.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: r.pill, overflow: 'hidden' },
  good: { color: c.success, backgroundColor: c.greenSoft }, bad: { color: c.danger, backgroundColor: '#fdecec' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  img: { width: 52, height: 52, borderRadius: r.sm, backgroundColor: c.surface },
  hr: { height: 1, backgroundColor: c.line, marginVertical: 12 },
  input: { marginTop: 10, borderWidth: 1, borderColor: c.line, borderRadius: r.md, padding: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 15, color: c.text, backgroundColor: '#fff' },
});
