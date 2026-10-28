import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { Button, Card, Center, ErrorBox, Spinner } from '@/components/ui';
import { decodeHtml } from '@/format';
import { useStore } from '@/store';
import { Alert } from 'react-native';
import type { Order } from '@/types';
import { c } from '@/theme';

export default function Orders() {
  const { account, user, ready, addItem } = useStore();
  const [again, setAgain] = useState(0); // the order being added to the cart again
  const orderAgain = async (o: Order) => {
    setAgain(o.id);
    let added = 0;
    for (const i of o.items) { if (!i.product_id) continue; try { await addItem(i.product_id, i.quantity); added += 1; } catch { /* sold out or an option we can't repeat: skip it */ } }
    setAgain(0);
    if (!added) return Alert.alert('Order again', 'Those items are not available right now.');
    if (added < o.items.length) Alert.alert('Order again', `${added} of ${o.items.length} items were added. The rest are unavailable or need an option picked.`);
    router.push('/(tabs)/cart');
  };
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); setError(''); account().then((a) => setOrders(a.orders ?? [])).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { if (ready && user) load(); else if (ready) setLoading(false); }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || loading) return <Spinner />;
  if (!user) return <Center><Text style={{ marginBottom: 14 }}>Log in to see your orders.</Text><Button title="Log in" onPress={() => router.replace('/(tabs)/account')} /></Center>;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!orders?.length) return <Center><Text style={{ marginBottom: 14, color: c.muted }}>No orders yet.</Text><Button title="Start shopping" onPress={() => router.replace('/(tabs)/shop')} /></Center>;
  return (
    <FlatList data={orders} keyExtractor={(o) => String(o.id)} contentContainerStyle={{ padding: 12 }} style={{ backgroundColor: c.surface }}
      renderItem={({ item: o }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>#{o.number}</Text>
            <Text style={{ color: c.accent, fontWeight: '700', textTransform: 'capitalize' }}>{o.status.replace(/-/g, ' ')}</Text>
          </View>
          <Text style={{ color: c.muted, marginVertical: 4 }}>{new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {o.total}</Text>
          {o.items.map((i) => <Text key={i.id} numberOfLines={1} style={{ color: '#444', lineHeight: 22 }}>{decodeHtml(i.name)} × {i.quantity}</Text>)}
          <Button title="View details" variant="outline" style={{ marginTop: 12, minHeight: 42 }} onPress={() => router.push(`/order/${o.id}`)} />
          <Button title="Order again" loading={again === o.id} style={{ marginTop: 8, minHeight: 42 }} onPress={() => orderAgain(o)} />
          <Button title="Track order" variant="outline" style={{ marginTop: 8, minHeight: 42 }} onPress={() => router.push({ pathname: '/track', params: { order: String(o.id) } })} />
        </Card>
      )} />
  );
}
