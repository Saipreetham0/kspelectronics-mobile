import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useScrollToTop } from 'expo-router';
import { Text } from '@/components/Text';
import ProductCard from '@/components/ProductCard';
import { ProductSkeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { useFetch } from '@/useFetch';
import { useScreen } from '@/useScreen';
import { useTabBarSpace } from '@/tabBarSpace';
import type { Product } from '@/types';
import { c, r } from '@/theme';

// The discount on a product (0 when it isn't reduced), used to put the best offers first.
const offOf = (p: Product) => { const was = Number(p.prices.regular_price), now = Number(p.prices.price); return was > now && now > 0 ? Math.round(((was - now) / was) * 100) : 0; };
const STEPS = [0, 20, 40] as const; // the quick filters: all deals, 20% off or more, 40% off or more

// Swiggy's "Top deals" tab: everything on sale and in stock, biggest discount first.
// ponytail: one page of 40 (the store's limit per request); add "load more" when the sale list outgrows it.
export default function Deals() {
  const list = useFetch<Product[]>('/api/catalog/products?on_sale=true&in_stock=true&per_page=40');
  const [min, setMin] = useState<(typeof STEPS)[number]>(0);
  const [refreshing, setRefreshing] = useState(false);
  const top = useRef(null); useScrollToTop(top as never);
  const pad = useTabBarSpace() + 90;
  const { width } = useScreen();
  const rows = useMemo(() => (list.data ?? []).filter((p) => offOf(p) >= min).sort((a, b) => offOf(b) - offOf(a)), [list.data, min]);
  const best = rows.length ? offOf(rows[0]) : 0;

  const head = (
    <View style={{ paddingHorizontal: 6, paddingBottom: 6 }}>
      <Text style={s.lead}>{list.data ? `${rows.length} deal${rows.length === 1 ? '' : 's'}${best ? ` · up to ${best}% off` : ''}` : 'Finding the best offers…'}</Text>
      <View style={s.chips}>
        {STEPS.map((n) => (
          <Pressable key={n} onPress={() => setMin(n)} style={[s.chip, min === n && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: min === n }}>
            <Text style={[s.chipT, min === n && { color: '#fff' }]}>{n ? `${n}% off or more` : 'All deals'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (list.loading && !list.data) {
    return <View style={s.page}>{head}<View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 }}>{[0, 1, 2, 3].map((n) => <ProductSkeleton key={n} width={(width - 28) / 2} />)}</View></View>;
  }
  if (list.error && !list.data) {
    return <View style={[s.page, s.center]}><Text style={{ color: c.muted, marginBottom: 12, textAlign: 'center' }}>Couldn't load the deals right now.</Text><Button title="Try again" onPress={list.reload} /></View>;
  }
  return (
    <FlatList ref={top} style={s.page} data={rows.length % 2 ? [...rows, { id: -1 } as Product] : rows} numColumns={2} keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={head} contentContainerStyle={{ padding: 6, paddingBottom: pad }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await list.reload(); setRefreshing(false); }} tintColor={c.loader} />}
      renderItem={({ item, index }) => (item.id < 0 ? <View style={{ flex: 1 }} /> : <ProductCard product={item} index={index % 20} />)}
      ListEmptyComponent={<View style={s.center}><Text style={{ color: c.muted, marginBottom: 12 }}>No deals at {min}% off or more right now.</Text><Button title="Browse all products" variant="outline" onPress={() => router.push('/(tabs)/shop')} /></View>} />
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.surface },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, flex: 1 },
  lead: { fontSize: 13, fontWeight: '700', color: c.text2, marginTop: 6 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: r.pill, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: c.accent, borderColor: c.accent },
  chipT: { fontSize: 13, fontWeight: '700', color: c.text },
});
