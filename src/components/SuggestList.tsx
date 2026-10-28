import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { Dots } from './ui';
import { useSuggest } from '@/useSuggest';
import { c, r } from '@/theme';

// The search suggestions shown while typing: a row to search for the whole text, matching categories, and matching products with their photo and price.
export default function SuggestList({ text, onProduct, onCategory, onSearch, onAdd, inCart }: {
  text: string; onProduct: (slug: string) => void; onCategory: (slug: string) => void; onSearch: (term: string) => void;
  onAdd?: (id: number) => void; inCart?: Record<number, number>; // with onAdd, products that need no option get an ADD button (the cart's and checkout's search)
}) {
  const { term, result, loading } = useSuggest(text);
  if (term.length < 2) return null;
  const empty = !loading && !result.products.length && !result.categories.length;
  return (
    <ScrollView style={s.wrap} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 140 }}>
      <Pressable onPress={() => onSearch(term)} style={s.row} accessibilityRole="button" accessibilityLabel={`Search for ${term}`}>
        <View style={s.iconBox}><Ionicons name="search" size={20} color={c.accent} /></View>
        <Text style={[s.name, { color: c.accent, fontWeight: '800' }]} numberOfLines={1}>Search for “{term}”</Text>
        <Ionicons name="arrow-forward" size={18} color={c.muted} />
      </Pressable>

      {result.categories.map((cat) => (
        <Pressable key={cat.slug} onPress={() => onCategory(cat.slug)} style={s.row} accessibilityRole="button" accessibilityLabel={`${cat.name} category`}>
          <View style={s.iconBox}><Ionicons name="grid-outline" size={20} color={c.text} /></View>
          <Text style={s.name} numberOfLines={1}>{cat.name}<Text style={s.muted}>{cat.parent ? `  in ${cat.parent}` : '  category'}</Text></Text>
        </Pressable>
      ))}

      {result.products.map((p) => (
        <Pressable key={p.id} onPress={() => onProduct(p.slug)} style={s.row} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.price}`}>
          <View style={s.photo}>
            {p.image ? <Image source={p.image} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : <Ionicons name="cube-outline" size={22} color="#b8bdc6" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={2}>{p.name}</Text>
            <Text style={s.price}>{p.price}{!p.inStock && <Text style={s.out}>   Out of stock</Text>}</Text>
          </View>
          {onAdd && p.inStock && !p.hasOptions && (
            <Pressable onPress={() => onAdd(p.id)} hitSlop={6} style={[s.add, inCart?.[p.id] ? s.addOn : null]} accessibilityRole="button" accessibilityLabel={inCart?.[p.id] ? `Add another ${p.name}. ${inCart[p.id]} in cart` : `Add ${p.name} to cart`}>
              <Text style={[s.addT, inCart?.[p.id] ? { color: '#fff' } : null]}>{inCart?.[p.id] ? `${inCart[p.id]} in cart  +` : 'ADD'}</Text>
            </Pressable>
          )}
          {onAdd && p.hasOptions && p.inStock && <Text style={s.opts}>Options</Text>}
        </Pressable>
      ))}

      {loading && <View style={{ alignItems: 'center', padding: 20 }}><Dots /></View>}
      {empty && <Text style={s.none}>No matches yet. Tap “Search for {term}” to see every result.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  iconBox: { width: 54, height: 54, borderRadius: r.md, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  photo: { width: 54, height: 54, borderRadius: r.md, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
  price: { fontSize: 13, fontWeight: '800', color: c.text, marginTop: 2 },
  out: { fontSize: 12, fontWeight: '700', color: c.danger },
  muted: { fontSize: 12, fontWeight: '500', color: c.muted },
  add: { minWidth: 64, paddingHorizontal: 12, height: 34, borderRadius: r.sm, borderWidth: 1.2, borderColor: c.accent, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  addOn: { backgroundColor: c.accent },
  addT: { color: c.accent, fontWeight: '800', fontSize: 12.5 },
  opts: { color: c.muted, fontSize: 12, fontWeight: '700' },
  none: { textAlign: 'center', color: c.muted, padding: 24, lineHeight: 20 },
});
