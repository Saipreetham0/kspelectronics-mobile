import React from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from './ui';
import { c, r } from '@/theme';

export const SORTS: [string, string][] = [['', 'Latest'], ['popularity', 'Popular'], ['price:asc', 'Price: low to high'], ['price:desc', 'Price: high to low']];
// Price ranges in whole rupees ("min:max", either side may be empty); this store has no paise.
export const PRICES: [string, string][] = [['0:1000', 'Under ₹1,000'], ['1000:5000', '₹1,000 – ₹5,000'], ['5000:25000', '₹5,000 – ₹25,000'], ['25000:', 'Over ₹25,000']];

export type Filters = { inStock: boolean; onSale: boolean; price: string };
type Props = {
  mode: 'sort' | 'filters' | null; onClose: () => void;
  sort: string; onSort: (v: string) => void;
  filters: Filters; onFilters: (f: Filters) => void;
};

// Blinkit keeps sorting and filtering behind two buttons so the products start right under one row; each opens this bottom sheet.
export default function FilterSheet({ mode, onClose, sort, onSort, filters, onFilters }: Props) {
  const insets = useSafeAreaInsets();
  const set = (p: Partial<Filters>) => onFilters({ ...filters, ...p });
  return (
    <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View style={s.head}>
          <Text style={s.title}>{mode === 'sort' ? 'Sort by' : 'Filters'}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><Ionicons name="close" size={24} color={c.text} /></Pressable>
        </View>

        {mode === 'sort' && SORTS.map(([v, label]) => (
          <Pressable key={v} onPress={() => { onSort(v); onClose(); }} style={s.row} accessibilityRole="radio" accessibilityState={{ selected: sort === v }}>
            <Text style={[s.rowT, sort === v && { color: c.accent, fontWeight: '800' }]}>{label}</Text>
            {sort === v && <Ionicons name="checkmark" size={20} color={c.accent} />}
          </Pressable>
        ))}

        {mode === 'filters' && (
          <>
            <View style={s.row}>
              <Text style={s.rowT}>In stock only</Text>
              <Switch value={filters.inStock} onValueChange={(v) => set({ inStock: v })} trackColor={{ true: c.accent }} accessibilityLabel="In stock only" />
            </View>
            <View style={s.row}>
              <Text style={s.rowT}>On sale</Text>
              <Switch value={filters.onSale} onValueChange={(v) => set({ onSale: v })} trackColor={{ true: c.accent }} accessibilityLabel="On sale" />
            </View>
            <Text style={s.group}>Price</Text>
            {PRICES.map(([v, label]) => (
              <Pressable key={v} onPress={() => set({ price: filters.price === v ? '' : v })} style={s.row} accessibilityRole="radio" accessibilityState={{ selected: filters.price === v }}>
                <Text style={[s.rowT, filters.price === v && { color: c.accent, fontWeight: '800' }]}>{label}</Text>
                {filters.price === v && <Ionicons name="checkmark" size={20} color={c.accent} />}
              </Pressable>
            ))}
            <View style={s.foot}>
              <Button title="Clear all" variant="outline" style={{ flex: 1 }} onPress={() => onFilters({ inStock: false, onSale: false, price: '' })} />
              <Button title="Show products" style={{ flex: 1.4 }} onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '900', color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  rowT: { fontSize: 15, fontWeight: '600', color: c.text },
  group: { fontSize: 13, fontWeight: '800', color: c.muted, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  foot: { flexDirection: 'row', gap: 10, marginTop: 16, borderRadius: r.md },
});
