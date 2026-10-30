import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance, TextInputInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/Text';
import { Button, Field } from '@/components/ui';
import { api, ApiError } from '@/api';
import { addAddress, listAddresses, MAX_ADDRESSES, removeAddress, selectAddress, selectedAddressId, updateAddress, type Saved } from '@/addresses';
import { loadLoc, lookupPin, saveLoc, type Loc } from '@/location';
import MapPicker from '@/components/MapPicker';
import { track } from '@/analytics';
import { tenDigits } from '@/phone';
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
  const [unresolved, setUnresolved] = useState(false); // the pin was moved somewhere we couldn't resolve to a pincode
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
  const [editId, setEditId] = useState<string | null>(null); // the saved address being edited, if any
  const [selId, setSelId] = useState<string | null>(null);
  const [needSettings, setNeedSettings] = useState(false);
  const [picking, setPicking] = useState(false); // choosing a new area for the address form (instead of changing the delivery location)
  const [mapFrom, setMapFrom] = useState<'main' | 'add'>('main'); // where the map's back arrow and buttons lead
  const [saving, setSaving] = useState(false);
  const [ferr, setFerr] = useState<Record<string, string>>({}); // inline errors of the address form
  const formRefs = useRef<Record<string, TextInputInstance | null>>({});
  const orig = useRef(''); // the form as it was opened, to tell a real change from an untouched edit
  const hadPin = useRef(true); // an old address saved without a map pin can still be edited without one
  const mainScroll = useRef<ScrollViewInstance>(null);
  const mapsCheck = useRef<Promise<boolean | null>>(Promise.resolve(null)); // the store's Google Maps check, so a fast first tap can wait for it

  const refresh = useCallback(() => { listAddresses().then(setSaved); selectedAddressId().then(setSelId); loadLoc().then((l) => setCurrent(l.loc)); }, []);
  useEffect(() => { if (visible) { setView('main'); setQ(''); setResults([]); setSugg([]); setNote(''); setNeedSettings(false); setSess(session()); setEditId(null); setPicking(false); setMapFrom('main'); setFerr({}); setSaving(false); setLine(''); setName(''); setPhone(''); setMine(true); setLabel('Home'); refresh();
      // Find out up front whether the store has Google Maps set up (501 = no), so the map step is available to every way of choosing a place. Asked once.
      if (maps === null) mapsCheck.current = api<unknown>('/api/places/autocomplete?q=').then(() => { setMaps(true); return true; }).catch((e) => { if (e instanceof ApiError && e.status === 501) { setMaps(false); return false; } return null; });
    }
  }, [visible, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  // A note (like "Search for your area first") can be above the fold of the scrolled list: bring it into view.
  useEffect(() => { if (note && view === 'main') mainScroll.current?.scrollTo({ y: 0, animated: true }); }, [note, view]);

  // Closing the add/edit form with something typed asks first.
  // The area only counts when editing (a new address may have its area changed for free).
  const snapOf = (place: Loc | null, f: { line: string; mine: boolean; name: string; phone: string; label: string }, withPlace: boolean) =>
    JSON.stringify([withPlace ? [place?.lat ?? null, place?.lng ?? null, place?.pin ?? ''] : '', f.line.trim(), f.mine, f.mine ? '' : f.name.trim(), f.mine ? '' : tenDigits(f.phone), f.label]);
  const dirty = view === 'add' && snapOf(addPlace, { line, mine, name, phone, label }, Boolean(editId)) !== orig.current;
  const discard = (then: () => void) => { if (dirty) Alert.alert('Discard your changes?', editId ? 'The changes to this address will be lost.' : 'What you typed will be lost.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: then }]); else then(); };
  const close = () => discard(onClose);
  const back = () => {
    if (view === 'map') setView(mapFrom);
    else if (view === 'add') discard(() => { setEditId(null); setFerr({}); setView('main'); });
    else if (picking) { setPicking(false); setView('add'); }
  };

  // Search: six digits is a pincode; three or more letters search places (Google when the store has it, else India Post area names).
  useEffect(() => {
    const t = q.trim();
    const pin = /^\d{6}$/.test(t);
    if (!pin && t.length < 3) { setResults([]); setSugg([]); setNote(''); setSearching(false); return; }
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
    if (picking) { setPicking(false); setAddPlace(l); setNote(''); setView('add'); return; } // a new area for the address form, not a new delivery location
    await saveLoc(l); await selectAddress(addressId); track('location_set'); onChange(l); onClose();
  };

  // Shows a place on the map to confirm (native with Google Maps set up); otherwise it is simply chosen.
  const confirm = (p: Loc, mapsOn = maps) => { if (mapsOn && Platform.OS !== 'web' && p.lat != null) { setPending(p); setUnresolved(false); setMapFrom(picking ? 'add' : 'main'); setView('map'); } else choose(p); };
  const pickSuggestion = async (sg: Suggestion) => {
    setSearching(true); setNote('');
    try { const p = await api<Loc>(`/api/places/place?id=${encodeURIComponent(sg.id)}&session=${sess}`); confirm(p, maps ?? (await mapsCheck.current)); setSess(session()); }
    catch (e) { setNote((e as Error).message); }
    setSearching(false);
  };
  // Only the latest move counts, and a spot we couldn't resolve (no pincode there) can't be confirmed: `pending` would still hold the old place.
  const moveSeq = useRef(0);
  const moved = async (lat: number, lng: number) => {
    const seq = ++moveSeq.current;
    setLocating1(true); setNote('');
    try { const p = await api<Loc>(`/api/places/reverse?lat=${lat}&lng=${lng}`); if (seq === moveSeq.current) { setPending(p); setUnresolved(false); } }
    catch (e) { if (seq === moveSeq.current) { setNote((e as Error).message); setUnresolved(true); } }
    if (seq === moveSeq.current) setLocating1(false);
  };

  const useCurrent = async () => {
    setLocating(true); setNote('');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setNeedSettings(true); throw new Error('Location access is off for this app. Turn it on in Settings, or search for your area instead.'); }
      // A weak GPS fix can take minutes: give it 8 seconds, then settle for the last known position.
      const pos = (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<null>((res) => setTimeout(() => res(null), 8000))])) ?? (await Location.getLastKnownPositionAsync());
      if (!pos) throw new Error("We couldn't get your location. Please search for your area instead.");
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

  // Beyond six saved addresses the oldest is dropped: say so before it happens.
  const save = async () => {
    if (!addPlace || saving) return;
    const oldest = saved[0];
    if (!editId && saved.length >= MAX_ADDRESSES && oldest) return Alert.alert('Saved address limit', `You can keep ${MAX_ADDRESSES} addresses. Saving this one removes your oldest (${oldest.label}: ${oldest.line}).`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Save anyway', onPress: () => doSave() }]);
    return doSave();
  };
  const doSave = async () => {
    if (!addPlace || saving) return;
    const e: Record<string, string> = {};
    const who = mine ? '' : name.trim(); const tel = mine ? '' : tenDigits(phone);
    if (line.trim().length < 5) e.line = 'Enter the complete address (house, street, landmark)';
    if (!mine && !who) e.name = "Enter the receiver's name";
    if (!mine && tel.length !== 10) e.phone = 'Enter a 10-digit mobile number';
    setFerr(e);
    const bad = ['line', 'name', 'phone'].find((k) => e[k]);
    if (bad) { formRefs.current[bad]?.focus(); return; }
    if (hadPin.current && addPlace.lat == null && (maps ?? (await mapsCheck.current))) return setNote('Pin your drop location on the map first, so the delivery partner can find you.');
    setSaving(true);
    try {
      const fields = { label, line: line.trim(), name: who, phone: tel, loc: addPlace };
      if (editId) {
        const a: Saved = { ...fields, id: editId };
        await updateAddress(a);
        // Fixing an address doesn't change where you're delivering, unless it is the one you're delivering to.
        if (editId === selId) { await choose(a.loc, a.id); return; }
        setEditId(null); refresh(); setView('main');
      } else { const a = await addAddress(fields); await choose(a.loc, a.id); }
      setLine(''); setName(''); setPhone('');
    } catch { Alert.alert('Address', "We couldn't save this address on your phone. Please shorten it and try again."); }
    finally { setSaving(false); }
  };
  const removeCurrent = () => Alert.alert('Remove address', `Remove your ${label} address?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { if (editId) removeAddress(editId).then(() => { setEditId(null); refresh(); setView('main'); }); } }]);

  const edit = (a: Saved) => { hadPin.current = a.loc.lat != null; orig.current = snapOf(a.loc, { line: a.line, mine: !a.name, name: a.name, phone: a.phone, label: a.label }, true); setFerr({}); setEditId(a.id); setAddPlace(a.loc); setLine(a.line); setMine(!a.name); setName(a.name); setPhone(a.phone); setLabel(a.label); setNote(''); setView('add'); };
  const newAddress = (place: Loc) => { hadPin.current = true; orig.current = snapOf(place, { line: '', mine: true, name: '', phone: '', label: 'Home' }, false); setFerr({}); setEditId(null); setLine(''); setName(''); setPhone(''); setMine(true); setLabel('Home'); setAddPlace(place); setView('add'); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={s.scrim} onPress={close} accessibilityLabel="Close" />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={s.top}>
            {(view !== 'main' || picking) && <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>}
            <Text style={s.h}>{view === 'add' ? (editId ? 'Edit address' : 'Add address details') : view === 'map' ? (mapFrom === 'add' ? 'Move the pin' : 'Confirm location') : picking ? 'Change area' : 'Select delivery location'}</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={s.x}><Ionicons name="close" size={18} color={c.text} /></Pressable>
          </View>

          {view === 'map' && pending?.lat != null ? (
            <View style={{ flexShrink: 1 }}>
              <MapPicker lat={pending.lat} lng={pending.lng!} onMove={moved} />
              <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[s.placeBox, { marginTop: 12 }]}>
                <Ionicons name="location" size={22} color={c.accent} />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: c.muted }}>{locating1 ? 'Finding this spot…' : 'Delivering to'}</Text><Text style={{ fontWeight: '800' }} numberOfLines={3}>{pending.formatted || where(pending)}</Text></View>
              </View>
              {note ? <Text style={s.note}>{note}</Text> : null}
              {mapFrom === 'add' ? <Button title="Use this pin" disabled={locating1 || unresolved} onPress={() => { setAddPlace(pending); setNote(''); setView('add'); }} /> : (<>
                <Button title="Deliver here" disabled={locating1 || unresolved} onPress={() => choose(pending)} />
                <Button title="Save as an address with details" variant="outline" disabled={locating1 || unresolved} onPress={() => newAddress(pending)} style={{ marginTop: 10 }} />
              </>)}
              </ScrollView>
            </View>
          ) : view === 'main' ? (
            <ScrollView ref={mainScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
              {needSettings && <Pressable onPress={() => Linking.openSettings().catch(() => {})} style={{ paddingBottom: 8 }} accessibilityRole="button"><Text style={s.change}>Open Settings</Text></Pressable>}

              {!picking && <View style={s.card}>
                <Pressable onPress={useCurrent} disabled={locating} style={s.row} accessibilityRole="button">
                  {locating ? <ActivityIndicator color={c.loader} /> : <Ionicons name="locate" size={22} color={c.accent} />}
                  <View style={{ flex: 1 }}><Text style={s.green}>{locating ? 'Finding you…' : 'Use current location'}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={c.muted} />
                </Pressable>
                <View style={s.hr} />
                <Pressable onPress={() => { if (current) newAddress(current); else setNote('Search for your area first, then add the address details.'); }} style={s.row} accessibilityRole="button">
                  <Ionicons name="add" size={24} color={c.accent} /><Text style={[s.green, { flex: 1 }]}>Add new address</Text><Ionicons name="chevron-forward" size={18} color={c.muted} />
                </Pressable>
              </View>}

              {!picking && saved.length > 0 && <Text style={s.sub}>Your saved addresses</Text>}
              {!picking && [...saved].reverse().map((a) => { const on = selId === a.id; return (
                <Pressable key={a.id} onPress={() => choose(a.loc, a.id)} style={[s.addr, on && { borderColor: c.accent }]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${a.label}: ${a.line}${on ? ', current delivery address' : ''}`}>
                  <View style={s.icon}><Ionicons name={a.label === 'Home' ? 'home' : a.label === 'Work' ? 'briefcase' : 'location'} size={22} color={c.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{a.label}</Text>{on && <><Ionicons name="checkmark-circle" size={16} color={c.accent} /><Text style={{ color: c.accent, fontSize: 12, fontWeight: '800' }}>Delivering here</Text></>}</View>
                    <Text style={{ color: '#444', marginTop: 2 }} numberOfLines={2}>{a.line}, {where(a.loc)}</Text>
                    {a.name ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{a.name} · {a.phone}</Text> : null}
                  </View>
                  <View>
                    <Pressable onPress={() => edit(a)} style={s.act} accessibilityRole="button" accessibilityLabel={`Edit ${a.label} address`}><Ionicons name="create-outline" size={20} color={c.muted} /></Pressable>
                    <Pressable onPress={() => Alert.alert('Remove address', `Remove your ${a.label} address?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeAddress(a.id).then(refresh) }])} style={s.act} accessibilityRole="button" accessibilityLabel={`Remove ${a.label} address`}><Ionicons name="trash-outline" size={20} color={c.muted} /></Pressable>
                  </View>
                </Pressable>
              ); })}
            </ScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.placeBox}>
                <Ionicons name="location" size={22} color={c.accent} />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: c.muted }}>Area</Text><Text style={{ fontWeight: '800' }}>{addPlace ? where(addPlace) : ''}</Text></View>
                <Pressable onPress={() => { setQ(''); setResults([]); setSugg([]); setNote(''); setPicking(true); setView('main'); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Change the area"><Text style={s.change}>Change</Text></Pressable>
              </View>
              {/* The drop point for hyperlocal delivery: the delivery partner navigates to this pin. */}
              <Pressable onPress={() => { if (addPlace?.lat != null && Platform.OS !== 'web') { setPending(addPlace); setUnresolved(false); setMapFrom('add'); setView('map'); } else if (maps) setNote('Tap Change above and pick a place to put the pin on.'); }}
                style={[s.drop, addPlace?.lat == null && maps && hadPin.current ? { borderColor: c.deal, backgroundColor: c.dealSoft } : null]} accessibilityRole="button" accessibilityLabel="Drop location on the map">
                <Ionicons name={addPlace?.lat != null ? 'location' : 'location-outline'} size={22} color={addPlace?.lat != null ? c.danger : c.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800' }}>{addPlace?.lat != null ? 'Drop location pinned on map' : 'Drop location not pinned'}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{addPlace?.lat != null ? 'Tap to move the pin' : maps ? hadPin.current ? 'Tap Change above and pick a place' : 'Optional for this address. Tap Change to pin it' : 'Map pin is not available yet'}</Text>
                </View>
                {addPlace?.lat != null && Platform.OS !== 'web' && <Text style={s.change}>Move</Text>}
              </Pressable>
              {note ? <Text style={s.note}>{note}</Text> : null}
              <Field label="Complete address*" value={line} onChangeText={(v) => { setLine(v); setFerr((x) => ({ ...x, line: '' })); }} error={ferr.line} inputRef={(el) => { formRefs.current.line = el; }} maxLength={200} placeholder="House / flat no., floor, street, landmark" multiline />
              <Text style={s.sub}>Contact details</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {[{ v: true, t: 'Myself' }, { v: false, t: 'Someone else' }].map((o) => (
                  <Pressable key={o.t} onPress={() => setMine(o.v)} style={[s.chip, mine === o.v && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: mine === o.v }}><Text style={[s.chipT, mine === o.v && { color: c.accent }]}>{o.t}</Text></Pressable>
                ))}
              </View>
              {!mine && (<>
                <Field label="Receiver's name*" value={name} onChangeText={(v) => { setName(v); setFerr((x) => ({ ...x, name: '' })); }} error={ferr.name} inputRef={(el) => { formRefs.current.name = el; }} autoCapitalize="words" autoComplete="name" textContentType="name" />
                <Field label="Receiver's phone number*" value={phone} onChangeText={(v) => { setPhone(tenDigits(v)); setFerr((x) => ({ ...x, phone: '' })); }} error={ferr.phone} inputRef={(el) => { formRefs.current.phone = el; }} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="10-digit mobile" />
              </>)}
              <Text style={s.sub}>Save as</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {LABELS.map((l) => <Pressable key={l} onPress={() => setLabel(l)} style={[s.chip, label === l && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: label === l }}><Text style={[s.chipT, label === l && { color: c.accent }]}>{l}</Text></Pressable>)}
              </View>
              {label !== 'Other' && saved.some((x) => x.label === label && x.id !== editId) && <Text style={[s.note, { marginTop: -8, paddingTop: 0 }]}>You already have a {label} address. Saving this makes two.</Text>}
              <Button title={editId ? 'Save changes' : 'Save address'} loading={saving} disabled={Boolean(editId) && !dirty} onPress={save} />
              {editId ? <Pressable onPress={removeCurrent} style={{ alignItems: 'center', padding: 14 }} accessibilityRole="button" accessibilityLabel="Remove this address"><Text style={{ color: c.danger, fontWeight: '800' }}>Remove this address</Text></Pressable> : null}
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
  green: { color: c.accent, fontWeight: '800', fontSize: 15 },
  sub: { fontSize: 13, fontWeight: '800', color: c.muted, marginTop: 16, marginBottom: 8 },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: r.md, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  icon: { width: 44, height: 44, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  placeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: r.md, padding: 14, borderWidth: 1, borderColor: c.line, marginBottom: 14 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', marginBottom: 14 },
  change: { color: c.accent, fontWeight: '800' },
  act: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: r.pill, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' },
  chipOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  chipT: { fontSize: 14, fontWeight: '700', color: c.text },
});
