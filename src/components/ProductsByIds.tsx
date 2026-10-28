import React from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import ProductCard from './ProductCard';
import { ProductSkeleton } from './Skeleton';
import { Button, ErrorBox } from './ui';
import { useFetch } from '@/useFetch';
import type { Product } from '@/types';
import { c } from '@/theme';

// Two-column grid of products looked up by id (wishlist, Order Again). Keeps the order of `ids`.
export default function ProductsByIds({ ids, empty }: { ids: number[]; empty: string }) {
  const list = ids.slice(0, 40);
  const { data, error, loading, reload } = useFetch<Product[]>(list.length ? `/api/catalog/products?per_page=40&include=${list.join(',')}` : null);
  if (!list.length) return <Empty text={empty} />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <View style={{ flexDirection: 'row', padding: 6 }}>{[0, 1].map((n) => <ProductSkeleton key={n} />)}</View>;
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  const items = list.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  if (!items.length) return <Empty text={empty} />;
  return <FlatList data={items.length % 2 ? [...items, { id: -1 } as Product] : items} numColumns={2} keyExtractor={(p) => String(p.id)} contentContainerStyle={{ padding: 6, paddingBottom: 120 }} style={{ backgroundColor: '#fff' }}
    renderItem={({ item, index }) => (item.id < 0 ? <View style={{ flex: 1 }} /> : <ProductCard product={item} index={index} />)} />;
}

function Empty({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: c.muted, marginBottom: 14, textAlign: 'center' }}>{text}</Text>
      <Button title="Start shopping" onPress={() => router.replace('/(tabs)/shop')} />
    </View>
  );
}
