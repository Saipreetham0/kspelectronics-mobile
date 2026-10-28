import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Button, Center, ErrorBox, Spinner } from '@/components/ui';
import ProductCard from '@/components/ProductCard';
import { Tap } from '@/components/motion';
import { decodeHtml } from '@/format';
import { useStore } from '@/store';
import { useFetch } from '@/useFetch';
import { useScreen } from '@/useScreen';
import type { Product } from '@/types';
import { c, r } from '@/theme';

const GAP = 10;
const FREQUENT = 6; // groups shown under "Frequently bought"; the rest go under "More that you ordered"

type Group = { slug: string; name: string; products: Product[] };

// "Order again": what you bought before, grouped by category into tiles (Blinkit's Order Again tab). Tapping a tile opens that category.
// ponytail: order lines that were variations may not resolve to a product here.
export default function Reorder() {
  const { account, user, ready } = useStore();
  const [ids, setIds] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (!user) return;
    setError('');
    account().then((a) => setIds([...new Set((a.orders ?? []).flatMap((o) => o.items.map((i) => i.product_id)))].filter((id): id is number => Boolean(id)).slice(0, 40))).catch((e: Error) => setError(e.message));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(load);

  const popular = useFetch<Product[]>(!user ? '/api/catalog/products?orderby=popularity&per_page=10' : null); // something to browse before logging in
  const products = useFetch<Product[]>(ids?.length ? `/api/catalog/products?per_page=40&include=${ids.join(',')}` : null);
  const groups = useMemo(() => {
    const by = new Map<string, Group>();
    for (const p of products.data ?? []) {
      const cat = p.categories[0] ?? { slug: '', name: 'Other' };
      const g = by.get(cat.slug) ?? { slug: cat.slug, name: decodeHtml(cat.name), products: [] };
      g.products.push(p); by.set(cat.slug, g);
    }
    return [...by.values()].sort((a, b) => b.products.length - a.products.length);
  }, [products.data]);

  if (!ready) return <Spinner />;
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 19, fontWeight: '900', color: c.text, textAlign: 'center' }}>Buy your favourites again in one tap</Text>
          <Text style={{ color: c.muted, textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 20 }}>Log in and everything you ordered before shows up here, grouped by category.</Text>
          <Button title="Log in" onPress={() => router.push('/(tabs)/account')} />
        </View>
        {popular.data && popular.data.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginBottom: 6 }}>Popular right now</Text>
            <FlatList horizontal data={popular.data} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 11 }} renderItem={({ item, index }) => <ProductCard product={item} width={150} index={index} />} />
          </View>
        )}
      </View>
    );
  }
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!ids || (ids.length > 0 && products.loading && !products.data)) return <Spinner />;
  if (products.error && !products.data) return <ErrorBox message={products.error} onRetry={products.reload} />;
  if (!groups.length) return <Center><Text style={{ color: c.muted, marginBottom: 14 }}>No past orders yet.</Text><Button title="Start shopping" onPress={() => router.replace('/(tabs)/shop')} /></Center>;

  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 150 }}>
      <Section title="Frequently bought" groups={groups.slice(0, FREQUENT)} />
      {groups.length > FREQUENT && <Section title="More that you ordered" groups={groups.slice(FREQUENT)} />}
    </ScrollView>
  );
}

function Section({ title, groups }: { title: string; groups: Group[] }) {
  // three tiles per row, sized from the column's width (never wider than the phone-width column, whatever the device)
  const { width } = useScreen();
  const tile = (width - 16 * 2 - GAP * 2) / 3;
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={s.h}>{title}</Text>
      <View style={s.grid}>
        {groups.map((g) => (
          <Tap key={g.slug || g.name} onPress={() => router.push({ pathname: '/(tabs)/shop', params: g.slug ? { category: g.slug } : {} })} scaleTo={0.96} style={[s.tile, { width: tile, minHeight: tile * 1.1 }]}
            accessibilityRole="button" accessibilityLabel={`${g.name}, ${g.products.length} items`}>
            <View style={s.shots}>
              {g.products.slice(0, 2).map((p) => <View key={p.id} style={s.shot}><Image source={p.images[0]?.thumbnail} style={{ width: '100%', height: '100%' }} contentFit="contain" /></View>)}
            </View>
            {g.products.length > 2 && <Text style={s.more}>+{g.products.length - 2} more</Text>}
            <Text style={s.name} numberOfLines={2}>{g.name}</Text>
          </Tap>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: '900', color: c.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { backgroundColor: c.accentSoft, borderRadius: r.lg, padding: 6, alignItems: 'center' },
  shots: { flexDirection: 'row', gap: 4, width: '100%', justifyContent: 'center' },
  shot: { flex: 1, aspectRatio: 1, backgroundColor: '#fff', borderRadius: r.sm, overflow: 'hidden', padding: 2, maxWidth: 52 },
  more: { fontSize: 10, fontWeight: '800', color: c.text, backgroundColor: '#fff', borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', marginTop: -9 },
  name: { fontSize: 13, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: 6 },
});
