import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Center, ErrorBox, Spinner } from '@/components/ui';
import { decodeHtml } from '@/format';
import { useStore } from '@/store';
import { Alert } from 'react-native';
import type { Order } from '@/types';
import { c, r } from '@/theme';

type StatusFilter = 'all' | 'processing' | 'completed' | 'cancelled';

export default function Orders() {
  const { account, user, ready, addItem } = useStore();
  const [again, setAgain] = useState(0);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const orderAgain = async (o: Order) => {
    setAgain(o.id);
    let added = 0;
    for (const i of o.items) {
      if (!i.product_id) continue;
      try {
        await addItem(i.product_id, i.quantity);
        added += 1;
      } catch {
        /* sold out or unavailable option: skip it */
      }
    }
    setAgain(0);
    if (!added) return Alert.alert('Order again', 'Those items are not available right now.');
    if (added < o.items.length) {
      Alert.alert(
        'Order again',
        `${added} of ${o.items.length} items were added. The rest are unavailable or need an option picked.`
      );
    }
    router.push('/(tabs)/cart');
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const a = await account();
      setOrders(a.orders ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (ready && user) load();
    else if (ready) setLoading(false);
  }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter orders by search query (order number or product name) and status
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase().replace(/^#/, '');
    return orders.filter((o) => {
      // 1. Status filter
      if (statusFilter === 'processing' && o.status !== 'processing' && o.status !== 'pending' && o.status !== 'on-hold') {
        return false;
      }
      if (statusFilter === 'completed' && o.status !== 'completed') {
        return false;
      }
      if (statusFilter === 'cancelled' && o.status !== 'cancelled' && o.status !== 'failed') {
        return false;
      }

      // 2. Search query filter
      if (!q) return true;
      if (String(o.number).toLowerCase().includes(q)) return true;
      return o.items.some((i) => decodeHtml(i.name).toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  if (!ready || loading) return <Spinner />;
  if (!user) {
    return (
      <Center>
        <Text style={{ marginBottom: 14 }}>Log in to see your orders.</Text>
        <Button title="Log in" onPress={() => router.replace('/(tabs)/account')} />
      </Center>
    );
  }
  if (error) return <ErrorBox message={error} onRetry={() => load()} />;
  if (!orders?.length) {
    return (
      <Center>
        <Text style={{ marginBottom: 14, color: c.muted }}>No orders placed yet.</Text>
        <Button title="Start shopping" onPress={() => router.replace('/(tabs)/shop')} />
      </Center>
    );
  }

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All Orders' },
    { id: 'processing', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={s.fill}>
      {/* Search Bar */}
      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by order # or product name..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </Pressable>
          ) : null}
        </View>

        {/* Status Filter Chips */}
        <View style={s.chipRow}>
          {FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setStatusFilter(f.id)}
                style={[s.chip, active && s.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={f.label}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[c.accent]} />}
        ListEmptyComponent={
          <View style={{ marginTop: 30 }}>
            <Center>
              <Ionicons name="search-outline" size={48} color={c.muted} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 }}>No matching orders</Text>
              <Text style={{ color: c.muted, textAlign: 'center', marginBottom: 16, maxWidth: 280 }}>
                We couldn't find any orders matching your search or filter.
              </Text>
              <Button
                title="Reset filters"
                variant="outline"
                onPress={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              />
            </Center>
          </View>
        }
        renderItem={({ item: o }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>#{o.number}</Text>
              <Text
                style={[
                  s.statusPill,
                  o.status === 'completed' ? s.statusCompleted : o.status === 'cancelled' || o.status === 'failed' ? s.statusCancelled : s.statusProcessing,
                ]}
              >
                {o.status.replace(/-/g, ' ')}
              </Text>
            </View>
            <Text style={{ color: c.muted, marginVertical: 4 }}>
              {new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {o.total}
            </Text>
            {o.items.map((i) => (
              <Text key={i.id} numberOfLines={1} style={{ color: '#444', lineHeight: 22 }}>
                {decodeHtml(i.name)} × {i.quantity}
              </Text>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button
                title="View details"
                variant="outline"
                style={{ flex: 1, minHeight: 40 }}
                onPress={() => router.push(`/order/${o.id}`)}
              />
              <Button
                title="Track order"
                variant="outline"
                style={{ flex: 1, minHeight: 40 }}
                onPress={() => router.push({ pathname: '/track', params: { order: String(o.id) } })}
              />
            </View>
            <Button
              title="Order again"
              loading={again === o.id}
              style={{ marginTop: 8, minHeight: 40 }}
              onPress={() => orderAgain(o)}
            />
          </Card>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: c.surface },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: r.md, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14, color: c.text, height: '100%' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: r.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  chipActive: { backgroundColor: c.accentSoft, borderColor: c.accent },
  chipText: { fontSize: 12, fontWeight: '700', color: c.muted },
  chipTextActive: { color: c.accent },
  statusPill: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize', paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.sm },
  statusCompleted: { color: c.success, backgroundColor: c.greenSoft },
  statusCancelled: { color: c.danger, backgroundColor: '#fdecec' },
  statusProcessing: { color: c.accent, backgroundColor: c.accentSoft },
});
