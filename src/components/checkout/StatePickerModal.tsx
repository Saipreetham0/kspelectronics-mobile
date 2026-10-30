import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/Text';
import { Button } from '@/components/ui';
import { IN_STATES } from '@/checkoutForm';
import { c, r } from '@/theme';
import { StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  value: string; // current state code
  onChange: (code: string) => void;
};

export default function StatePickerModal({ visible, onClose, value, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const [stateQ, setStateQ] = useState('');

  const handleClose = () => {
    setStateQ('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, paddingTop: Math.max(insets.top, 24) + 8, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', paddingHorizontal: 16, paddingBottom: 10 }}>Select state</Text>
        <View style={{ paddingHorizontal: 16, marginBottom: 6 }}><TextInput style={s.stateSearch} value={stateQ} onChangeText={setStateQ} placeholder="Search state" placeholderTextColor="#767676" accessibilityLabel="Search state" autoCorrect={false} /></View>
        <FlatList keyboardShouldPersistTaps="handled" data={IN_STATES.filter(([, n]) => n.toLowerCase().includes(stateQ.trim().toLowerCase())).sort((x, y) => x[1].localeCompare(y[1]))} keyExtractor={([x]) => x} renderItem={({ item: [code, name] }) => {
          const on = value === code;
          return <Pressable style={[s.stateRow, on && { backgroundColor: c.accentSoft }]} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { onChange(code); handleClose(); }}><Text style={{ fontSize: 16, fontWeight: on ? '800' : '400' }}>{on ? '✓ ' : ''}{name}</Text></Pressable>;
        }} />
        <Button title="Close" variant="outline" onPress={handleClose} style={{ margin: 16, marginBottom: Math.max(insets.bottom, 16) }} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  stateSearch: { borderWidth: 1, borderColor: c.line, borderRadius: r.md, paddingHorizontal: 14, minHeight: 46, fontSize: 15, color: c.text, backgroundColor: '#fff' },
  stateRow: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.line },
});
