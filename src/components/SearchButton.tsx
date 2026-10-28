import React, { useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MagnifyingGlass } from 'phosphor-react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/Text';
import SuggestList from '@/components/SuggestList';
import { addRecent } from '@/recentSearches';
import { useStore } from '@/store';
import { c, r, shadow } from '@/theme';

// A search icon for the header of the cart and checkout. It opens a full-screen search over the page: products without options can be added right
// from the results (the cart behind updates, and nothing typed in checkout is lost); anything else opens its page.
export default function SearchButton({ compact }: { compact?: boolean }) {
  const { cart, addItem } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const close = () => { Keyboard.dismiss(); setOpen(false); setQ(''); };
  const inCart: Record<number, number> = {};
  for (const i of cart?.items ?? []) inCart[i.id] = (inCart[i.id] ?? 0) + i.quantity;
  const go = (path: Parameters<typeof router.push>[0]) => { close(); setTimeout(() => router.push(path), 150); };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={compact ? { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow } : { paddingHorizontal: 12 }} accessibilityRole="button" accessibilityLabel="Search to add more products"><MagnifyingGlass size={compact ? 20 : 24} weight="bold" color={c.text} /></Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.bar}>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close search"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>
            <TextInput style={s.input} value={q} onChangeText={setQ} autoFocus placeholder="Search to add more products" returnKeyType="search"
              onSubmitEditing={() => { if (q.trim()) { addRecent(q); go({ pathname: '/(tabs)/shop', params: { search: q.trim() } }); } }} accessibilityLabel="Search products" />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear"><Ionicons name="close-circle" size={20} color="#aaa" /></Pressable> : null}
          </View>
          {q.trim().length >= 2
            ? <SuggestList text={q} inCart={inCart}
                onAdd={(id) => addItem(id, 1).catch((e: Error) => Alert.alert('Could not add', e.message))}
                onProduct={(slug) => go(`/product/${slug}`)}
                onCategory={(slug) => go({ pathname: '/(tabs)/shop', params: { category: slug } })}
                onSearch={(t) => { addRecent(t); go({ pathname: '/(tabs)/shop', params: { search: t } }); }} />
            : <Text style={{ color: c.muted, padding: 24, textAlign: 'center' }}>Type a product name to find it, then tap ADD to put it in your cart.</Text>}
        </SafeAreaView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 12, paddingHorizontal: 14, minHeight: 50, borderRadius: r.lg, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' },
  input: { flex: 1, fontSize: 15, color: c.text, height: 50 },
});
