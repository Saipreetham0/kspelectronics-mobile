import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/Text';
import { Button, Field } from '@/components/ui';
import { api, ApiError } from '@/api';
import { addAddress, listAddresses, removeAddress, selectAddress, type Saved } from '@/addresses';
import { loadLoc, lookupPin, saveLoc, type Loc } from '@/location';
import MapPicker from '@/components/MapPicker';
import { c, r } from '@/theme';

const LABELS = ['Home', 'Work', 'Other'] as const;
type Suggestion = { id: string; text: string; secondary: string };
const session = () => Math.random().toString(36).slice(2, 12); // groups one search's keystrokes into a single billed Google session
const where = (l: Loc) => `${l.area}, ${l.city}${l.state ? `, ${l.state}` : ''} · ${l.pin}`;

// Blinkit's "Select delivery location" sheet: search an area or pincode, use the phone's current location, add a new address, or pick a saved one.
export default function LocationSheet({ visible, onClose, onChange }: { visible: boolean; onClose: () => void; onChange: (loc: Loc) => void }) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'main' | 'map' | 'add'>('main');
  const [maps, setMaps] = useState<boolean | null>(null); // null until we know whether the store has Google Maps set up
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [sess, setSess] = useState(session());
  const [pending, setPending] = useState<Loc | null>(null); // the place being confirmed on the map
  const [locating1, setLocating1] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Loc[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [current, setCurrent] = useState<Loc | null>(null);
  const [addPlace, setAddPlace] = useState<Loc | null>(null); // the place the new address is for
  // the add-address form
  const [line, setLine] = useState('');
  const [mine, setMine] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState<(typeof LABELS)[number]>('Home');

  const refresh = useCallback(() => { listAddresses().then(setSaved); loadLoc().then((l) => setCurrent(l.loc)); }, []);
  useEffect(() => { if (visible) { setView('main'); setQ(''); setResults([]); setSugg([]); setNote(''); setSess(session()); refresh();
      // Find out up front whether the store has Google Maps set up (501 = no), so the map step is available to every way of choosing a place.
      api<unknown>('/api/places/autocomplete?q=').then(() => setMaps(true)).catch((e) => { if (e instanceof ApiError && e.status === 501) setMaps(false); });
    }
  }, [visible, refresh]);

  // Search: six digits is a pincode; three or more letters search places (Google when the store has it, else India Post area names).
  useEffect(() => {
    const t = q.trim();
    const pin = /^\d{6}$/.test(t);
    if (!pin && t.length < 3) { setResults([]); setSugg([]); setNote(''); return; }
    let live = true;
    const h = setTimeout(async () => {
      setSearching(true); setNote('');
      try {
        if (pin) { const found = [await lookupPin(t)]; if (live) { setResults(found); setSugg([]); } }
        else {
          if (maps !== false) {
            try {
              const list = await api<Suggestion[]>(`/api/places/autocomplete?q=${encodeURIComponent(t)}&session=${sess}${current?.lat ? `&lat=${current.lat}&lng=${current.lng}` : ''}`);
              if (live) { setMaps(true); setSugg(list); setResults([]); if (!list.length) setNote('No places found. Try a pincode or another area name.'); }
              if (live) setSearching(false);
              return;
            } catch (e) { if (!(e instanceof ApiError && e.status === 501)) throw e; if (live) setMaps(false); }
          }
          const found = await api<Loc[]>(`/api/pincode/search?q=${encodeURIComponent(t)}`);
          if (live) { setResults(found); setSugg([]); if (!found.length) setNote('No places found. Try a pincode or another area name.'); }
        }
      } catch { if (live) { setResults([]); setSugg([]); setNote(pin ? "We couldn't find this pincode." : "Couldn't search right now. Try your 6-digit pincode."); } }
      if (live) setSearching(false);
    }, 350);
    return () => { live = false; clearTimeout(h); };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (l: Loc, addressId: string | null = null) => {
    await saveLoc(l); await selectAddress(addressId); onChange(l); onClose();
  };

  // Shows a place on the map to confirm (native with Google Maps set up); otherwise it is simply chosen.
  const confirm = (p: Loc, mapsOn = maps) => { if (mapsOn && Platform.OS !== 'web' && p.lat != null) { setPending(p); setView('map'); } else choose(p); };
  const pickSuggestion = async (sg: Suggestion) => {
    setSearching(true); setNote('');
    try { confirm(await api<Loc>(`/api/places/place?id=${encodeURIComponent(sg.id)}&session=${sess}`)); setSess(session()); }
    catch (e) { setNote((e as Error).message); }
    setSearching(false);
  };
  const moved = async (lat: number, lng: number) => {
    setLocating1(true);
    try { setPending(await api<Loc>(`/api/places/reverse?lat=${lat}&lng=${lng}`)); } catch (e) { setNote((e as Error).message); }
    setLocating1(false);
  };

  const useCurrent = async () => {
    setLocating(true); setNote('');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('Allow location access in Settings to use this, or search for your area instead.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (maps !== false) {
        try { const p = await api<Loc>(`/api/places/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`); setMaps(true); confirm(p, true); setLocating(false); return; }
        catch (e) { if (e instanceof ApiError && e.status === 501) setMaps(false); else if (!(e instanceof ApiError && e.status === 404)) throw e; } // 404: no pincode at that spot, so fall back to the phone's own lookup
      }
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      const pin = place?.postalCode?.replace(/\D/g, '');
      if (!pin || pin.length !== 6) throw new Error("We couldn't work out your pincode from your location. Please search for your area instead.");
      await choose({ ...(await lookupPin(pin)), lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) { setNote((e as Error).message || "Couldn't get your location. Please search instead."); }
    setLocating(false);
  };

  const save = async () => {
    if (!addPlace) return;
    if (maps && addPlace.lat == null) return Alert.alert('Drop location', 'Please pin your drop location on the map first, so the delivery partner can find you.');
    if (line.trim().length < 5) return Alert.alert('Address', 'Please enter the complete address (house, street, landmark).');
    const who = mine ? '' : name.trim(); const tel = mine ? '' : phone.replace(/\D/g, '');
    if (!mine && (!who || tel.length !== 10)) return Alert.alert('Address', "Please enter the receiver's name and a 10-digit phone number.");
    const a = await addAddress({ label, line: line.trim(), name: who, phone: tel, loc: addPlace });
    await choose(a.loc, a.id);
    setLine(''); setName(''); setPhone('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={s.top}>
            {view !== 'main' && <Pressable onPress={() => setView('main')} hitSlop={10} accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>}
            <Text style={s.h}>{view === 'add' ? 'Add address details' : view === 'map' ? 'Confirm location' : 'Select delivery location'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={s.x}><Ionicons name="close" size={18} color={c.text} /></Pressable>
          </View>

          {view === 'map' && pending?.lat != null ? (
            <View>
              <MapPicker lat={pending.lat} lng={pending.lng!} onMove={moved} />
              <View style={s.placeBox}>
                <Ionicons name="location" size={22} color={c.accent} />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: c.muted }}>{locating1 ? 'Finding this spot…' : 'Delivering to'}</Text><Text style={{ fontWeight: '800' }} numberOfLines={3}>{pending.formatted || where(pending)}</Text></View>
              </View>
              {note ? <Text style={s.note}>{note}</Text> : null}
              <Button title="Add address details" disabled={locating1} onPress={() => { setAddPlace(pending); setView('add'); }} />
              <Pressable onPress={() => choose(pending)} disabled={locating1} style={{ alignItems: 'center', padding: 14 }}><Text style={s.change}>Just deliver here</Text></Pressable>
            </View>
          ) : view === 'main' ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.search}>
                <Ionicons name="search" size={20} color="#777" />
                <TextInput style={s.input} value={q} onChangeText={setQ} placeholder="Search for area, street name or pincode…" accessibilityLabel="Search for your area or pincode" />
                {searching && <ActivityIndicator size="small" color={c.loader} />}
              </View>
              {sugg.map((sg) => (
                <Pressable key={sg.id} onPress={() => pickSuggestion(sg)} style={s.res} accessibilityRole="button">
                  <Ionicons name="location-outline" size={20} color={c.muted} />
                  <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '700' }}>{sg.text}</Text><Text style={{ fontSize: 12, color: c.muted }} numberOfLines={1}>{sg.secondary}</Text></View>
                </Pressable>
              ))}
              {results.map((l) => (
                <Pressable key={`${l.pin}${l.area}`} onPress={() => choose(l)} style={s.res} accessibilityRole="button">
                  <Ionicons name="location-outline" size={20} color={c.muted} /><Text style={{ flex: 1, fontSize: 14 }}>{where(l)}</Text>
                </Pressable>
              ))}
              {note ? <Text style={s.note} accessibilityLiveRegion="polite">{note}</Text> : null}

              <View style={s.card}>
                <Pressable onPress={useCurrent} disabled={locating} style={s.row} accessibilityRole="button">
                  {locating ? <ActivityIndicator color={c.loader} /> : <Ionicons name="locate" size={22} color={c.greenDark} />}
                  <View style={{ flex: 1 }}><Text style={s.green}>{locating ? 'Finding you…' : 'Use current location'}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={c.muted} />
                </Pressable>
                <View style={s.hr} />
                <Pressable onPress={() => { if (current) { setAddPlace(current); setView('add'); } else setNote('Search for your area first, then add the address details.'); }} style={s.row} accessibilityRole="button">
                  <Ionicons name="add" size={24} color={c.greenDark} /><Text style={[s.green, { flex: 1 }]}>Add new address</Text><Ionicons name="chevron-forward" size={18} color={c.muted} />
                </Pressable>
              </View>

              {saved.length > 0 && <Text style={s.sub}>Your saved addresses</Text>}
              {[...saved].reverse().map((a) => (
                <Pressable key={a.id} onPress={() => choose(a.loc, a.id)} style={[s.addr, current && current.pin === a.loc.pin && current.area === a.loc.area && { borderColor: c.accent }]} accessibilityRole="button" accessibilityLabel={`${a.label}: ${a.line}`}>
                  <View style={s.icon}><Ionicons name={a.label === 'Home' ? 'home' : a.label === 'Work' ? 'briefcase' : 'location'} size={22} color={c.greenDark} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800' }}>{a.label}</Text>
                    <Text style={{ color: '#444', marginTop: 2 }} numberOfLines={2}>{a.line}, {where(a.loc)}</Text>
                    {a.name ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{a.name} · {a.phone}</Text> : null}
                  </View>
                  <Pressable onPress={() => Alert.alert('Remove address', `Remove your ${a.label} address?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeAddress(a.id).then(refresh) }])} hitSlop={10} accessibilityLabel={`Remove ${a.label} address`}>
                    <Ionicons name="trash-outline" size={20} color={c.muted} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.placeBox}>
                <Ionicons name="location" size={22} color={c.accent} />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: c.muted }}>Area</Text><Text style={{ fontWeight: '800' }}>{addPlace ? where(addPlace) : ''}</Text></View>
                <Pressable onPress={() => setView('main')} hitSlop={8}><Text style={s.change}>Change</Text></Pressable>
              </View>
              {/* The drop point for hyperlocal delivery: the delivery partner navigates to this pin. */}
              <Pressable onPress={() => { if (addPlace?.lat != null && Platform.OS !== 'web') { setPending(addPlace); setView('map'); } else if (maps) setNote('Search for your area or use current location to place the pin.'); }}
                style={[s.drop, addPlace?.lat == null && maps ? { borderColor: c.deal, backgroundColor: c.dealSoft } : null]} accessibilityRole="button" accessibilityLabel="Drop location on the map">
                <Ionicons name={addPlace?.lat != null ? 'location' : 'location-outline'} size={22} color={addPlace?.lat != null ? c.danger : c.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800' }}>{addPlace?.lat != null ? 'Drop location pinned on map' : 'Drop location not pinned'}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{addPlace?.lat != null ? 'Tap to move the pin' : maps ? 'Go back and pick a place or use your current location' : 'Map pin is not available yet'}</Text>
                </View>
                {addPlace?.lat != null && Platform.OS !== 'web' && <Text style={s.change}>Move</Text>}
              </Pressable>
              {note ? <Text style={s.note}>{note}</Text> : null}
              <Field label="Complete address*" value={line} onChangeText={setLine} placeholder="House / flat no., floor, street, landmark" multiline />
              <Text style={s.sub}>Contact details</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {[{ v: true, t: 'Myself' }, { v: false, t: 'Someone else' }].map((o) => (
                  <Pressable key={o.t} onPress={() => setMine(o.v)} style={[s.chip, mine === o.v && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: mine === o.v }}><Text style={[s.chipT, mine === o.v && { color: c.accent }]}>{o.t}</Text></Pressable>
                ))}
              </View>
              {!mine && (<>
                <Field label="Receiver's name*" value={name} onChangeText={setName} autoCapitalize="words" />
                <Field label="Receiver's phone number*" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
              </>)}
              <Text style={s.sub}>Save as</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {LABELS.map((l) => <Pressable key={l} onPress={() => setLabel(l)} style={[s.chip, label === l && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: label === l }}><Text style={[s.chipT, label === l && { color: c.accent }]}>{l}</Text></Pressable>)}
              </View>
              <Button title="Save address" onPress={save} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '88%', backgroundColor: '#f6f7f9', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  h: { flex: 1, fontSize: 18, fontWeight: '900', color: c.text },
  x: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: r.md, paddingHorizontal: 14, minHeight: 50, borderWidth: 1, borderColor: c.line },
  input: { flex: 1, fontSize: 15, color: c.text, height: 50 },
  res: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  note: { color: c.muted, fontSize: 13, paddingVertical: 10, lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: r.md, marginTop: 14, borderWidth: 1, borderColor: c.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 48 },
  green: { color: c.greenDark, fontWeight: '800', fontSize: 15 },
  sub: { fontSize: 13, fontWeight: '800', color: c.muted, marginTop: 16, marginBottom: 8 },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: r.md, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  icon: { width: 44, height: 44, borderRadius: 10, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' },
  placeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: r.md, padding: 14, borderWidth: 1, borderColor: c.line, marginBottom: 14 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', marginBottom: 14 },
  change: { color: c.greenDark, fontWeight: '800' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: r.pill, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' },
  chipOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  chipT: { fontSize: 14, fontWeight: '700', color: c.text },
});
