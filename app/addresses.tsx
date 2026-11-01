import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MapPin } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Card } from '@/components/ui';
import { listAddresses, removeAddress, selectAddress, selectedAddressId } from '@/addresses';
import type { Saved } from '@/addresses';
import { c, r } from '@/theme';

// The delivery addresses saved on this phone (see src/addresses.ts): pick the one checkout starts with, or delete one. New ones are added from the location sheet.
export default function Addresses() {
  const [list, setList] = useState<Saved[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const load = useCallback(() => { listAddresses().then(setList); selectedAddressId().then(setSel); }, []);
  useFocusEffect(load);

  const remove = (a: Saved) => Alert.alert('Delete this address?', `${a.label} · ${a.line}`, [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => removeAddress(a.id).then(load) },
  ]);
  const use = (a: Saved) => { setSel(a.id); selectAddress(a.id); };

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ padding: 12, paddingBottom: 60 }}>
      {list && !list.length && (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 6 }}>No saved addresses yet</Text>
          <Text style={{ color: c.muted, lineHeight: 20 }}>Choose "Delivery location" on Home or at checkout and save an address: it shows up here.</Text>
        </Card>
      )}
      {(list ?? []).map((a) => {
        const on = a.id === sel;
        return (
          <Card key={a.id} style={on ? { borderColor: c.accent } : undefined}>
            <Pressable onPress={() => use(a)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${a.label}, ${a.line}`} style={s.row}>
              <MapPin size={22} weight={on ? 'fill' : 'regular'} color={on ? c.accent : c.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{a.label}{on ? '  ·  Delivering here' : ''}</Text>
                <Text style={{ color: '#444', marginTop: 2 }}>{a.name}{a.phone ? ` · ${a.phone}` : ''}</Text>
                <Text style={{ color: c.muted, marginTop: 2 }} numberOfLines={3}>{a.line}, {a.loc.city} {a.loc.pin}</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => remove(a)} hitSlop={10} style={{ alignSelf: 'flex-end', marginTop: 8 }} accessibilityRole="button" accessibilityLabel={`Delete ${a.label} address`}>
              <Text style={{ color: c.danger, fontWeight: '700' }}>Delete</Text>
            </Pressable>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  label: { fontSize: 16, fontWeight: '800', color: c.text, borderRadius: r.sm },
});
