import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance, TextInputInstance as RNTextInput } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { router, Stack } from 'expo-router';
import { Button, Card, Center, Field, H } from '@/components/ui';
import { api, ApiError } from '@/api';
import { Addr, CheckoutForm, emptyForm, IN_STATES, validate } from '@/checkoutForm';
import { decodeHtml, minorToInr, withTax } from '@/format';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setPayRequest, PayRequest } from '@/payRequest';
import { loadLoc, lookupPin } from '@/location';
import { selectedAddress } from '@/addresses';
import LocationSheet from '@/components/LocationSheet';
import DeliverySlots from '@/components/DeliverySlots';
import SearchButton from '@/components/SearchButton';
import { storage } from '@/storage';
import { SITE_URL, WHATSAPP } from '@/config';
import { useStore } from '@/store';
import type { Account, Cart } from '@/types';
import { track } from '@/analytics';
import { c, r } from '@/theme';
import StatePickerModal from '@/components/checkout/StatePickerModal';
import PaymentMethods, { payName } from '@/components/checkout/PaymentMethods';
import OrderSummary from '@/components/checkout/OrderSummary';

const PENDING = 'ksp_pending_order';
type GstInfo = { gstin: string; legalName: string; tradeName: string; status: string; active: boolean; address: string; city: string; pincode: string; state: string };
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
type WcAddr = Record<string, string>;
// A WooCommerce address, as the checkout form's address; null when the customer never filled it in.
const fromWc = (a?: WcAddr): Addr | null => (a?.address_1 ? { firstName: a.first_name ?? '', lastName: a.last_name ?? '', address: [a.address_1, a.address_2].filter(Boolean).join(', '), city: a.city ?? '', state: a.state || 'TS', pincode: a.postcode ?? '' } : null);
const oneLine = (a: Addr) => `${a.address}, ${a.city}${a.state ? `, ${a.state}` : ''} ${a.pincode}`.trim();

// The order the keyboard's "next" key walks the delivery fields in (state is a picker, so it is skipped).
const ORDER = ['email', 'phone', 'firstName', 'lastName', 'pincode', 'city', 'address'];

export default function Checkout() {
  const { cart, cartToken, user, account, clearLocalCart, ready, showLogin } = useStore();
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [methods, setMethods] = useState<string[]>([]);
  const [native, setNative] = useState(false);
  const [method, setMethod] = useState('');
  const [quote, setQuote] = useState<Cart | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false); // set at once: two quick taps arrive before `placing` disables the button, and each would create an order
  const [error, setError] = useState('');
  const [wantGst, setWantGst] = useState(false);
  // What the GST registry says about the typed GSTIN (looked up through our server; 'off' = the store has no lookup set up, so the fields stay manual).
  const [gst, setGst] = useState<{ s: 'idle' | 'loading' | 'ok' | 'notfound' | 'down' | 'off'; info?: GstInfo }>({ s: 'idle' });
  // Is a Shiprocket Quick rider available to the pinned drop point? Asked a moment after the pin or pincode settles; "no" simply means normal shipping.
  const [rider, setRider] = useState<{ available: boolean; courier?: string } | null>(null);
  const [editing, setEditing] = useState(false); // false: a customer whose details are already complete sees one "Deliver to" card; any edit opens the full form
  const [acct, setAcct] = useState<{ shipping: WcAddr; billing: WcAddr } | null>(null); // the customer's addresses stored in WooCommerce
  const [pinOpen, setPinOpen] = useState(false);
  const [dropPin, setDropPin] = useState(''); // the pincode the pinned drop point lies in: typing a different pincode drops the pin
  const scroller = useRef<ScrollViewInstance>(null);
  const inputs = useRef<Record<string, RNTextInput | null>>({});
  const [blurred, setBlurred] = useState<Record<string, boolean>>({}); // fields the shopper has left: their errors show without waiting for "Place order"
  const [needAddr, setNeedAddr] = useState(false); // the delivery area changed, so the street line was cleared
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const on = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const off = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { on.remove(); off.remove(); };
  }, []);
  const cardY = useRef<Record<string, number>>({});
  const [picker, setPicker] = useState<'' | 'state' | 'b.state'>('');
  const errors = validate(form);
  const pinOk = /^\d{6}$/.test(form.pincode);

  // The delivery location chosen on the home screen pre-fills pincode, city and state (the form used to assume Telangana for every pincode).
  // A saved address picked in the location sheet wins (it also fills the receiver's name and phone), then the saved location.
  // Both are applied in one update, and the account's address (below) waits for it: three sources filling at their own pace used to mix streets and pincodes.
  const placeReady = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    placeReady.current = Promise.all([loadLoc(), selectedAddress()]).then(([{ loc, pin }, a]) => {
      if (a) {
        const [first, ...rest] = a.name.split(' ');
        if (a.loc.lat != null) setDropPin(a.loc.pin);
        setForm((f) => ({ ...f, drop: a.loc.lat != null && a.loc.lng != null ? { lat: a.loc.lat, lng: a.loc.lng } : f.drop, address: f.address || a.line, city: a.loc.city, state: a.loc.stateCode || f.state, pincode: a.loc.pin,
          firstName: f.firstName || first || '', lastName: f.lastName || rest.join(' '), phone: f.phone || a.phone }));
      } else if (pin) {
        if (loc?.lat != null) setDropPin(loc.pin);
        setForm((f) => ({ ...(f.pincode ? f : { ...f, pincode: pin, city: f.city || loc?.city || '', state: loc?.stateCode || f.state }), drop: loc?.lat != null && loc.lng != null ? { lat: loc.lat, lng: loc.lng } : f.drop }));
      }
    }).catch(() => {});
  }, []);

  // Signed-in shoppers get their saved details. The account's street, city and state are used only when they belong with the pincode already chosen.
  useEffect(() => {
    if (!user) return;
    placeReady.current.then(() => account()).then((a: Account) => {
      const cu = a.customer; if (!cu) return;
      setAcct({ shipping: cu.shipping ?? {}, billing: cu.billing ?? {} });
      const ad = cu.shipping?.address_1 ? cu.shipping : cu.billing;
      setForm((f) => {
        const same = !f.pincode || f.pincode === ad?.postcode;
        return { ...f, email: f.email || cu.billing?.email || a.user.email || '', phone: f.phone || cu.billing?.phone || '', firstName: f.firstName || ad?.first_name || cu.first_name || '', lastName: f.lastName || ad?.last_name || cu.last_name || '',
          ...(same ? { address: f.address || ad?.address_1 || '', city: f.city || ad?.city || '', state: ad?.state && f.state === 'TS' ? ad.state : f.state, pincode: f.pincode || ad?.postcode || '' } : null) };
      });
    }).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cartToken) return;
    api<{ methods: string[]; razorpayNative?: boolean }>('/api/checkout', { cartToken }).then((d) => {
      setMethods(d.methods); setNative(Boolean(d.razorpayNative));
      setMethod((m) => m || (d.razorpayNative && d.methods.includes('razorpay') ? 'razorpay' : d.methods[0]) || '');
    }).catch(() => {});
  }, [cartToken]);

  // The pincode decides the city and state: once six digits are typed, they are filled in from India Post's directory (delivery and billing alike).
  // What the lookup found is shown under the field; typing the pincode again re-fills them, but city and state can still be edited afterwards.
  const [pinNote, setPinNote] = useState<Record<string, string>>({});
  const typedPin = useRef<Record<string, string>>({}); // pincodes the shopper typed themselves; a pincode filled in from a saved address keeps its own city and state
  const billPin = form.billing.pincode;
  useEffect(() => {
    let live = true;
    const run = (which: 'delivery' | 'billing', pin: string) => {
      if (!/^\d{6}$/.test(pin)) { setPinNote((n) => ({ ...n, [which]: '' })); return; }
      lookupPin(pin).then((l) => {
        if (!live) return;
        setPinNote((n) => ({ ...n, [which]: `${l.area}, ${l.city}, ${l.state}` }));
        if (typedPin.current[which] !== pin) return;
        const apply = (a: Addr): Addr => ({ ...a, city: l.city || a.city, state: l.stateCode || a.state });
        setForm((f) => (which === 'delivery' ? (f.pincode === pin ? { ...f, ...apply(f) } : f) : (f.billing.pincode === pin ? { ...f, billing: apply(f.billing) } : f)));
      }).catch(() => { if (live) setPinNote((n) => ({ ...n, [which]: "We couldn't find this pincode. Check the digits." })); });
    };
    run('delivery', form.pincode);
    run('billing', billPin);
    return () => { live = false; };
  }, [form.pincode, billPin]);

  const dropLat = form.drop?.lat, dropLng = form.drop?.lng;
  useEffect(() => {
    if (dropLat == null || dropLng == null || !pinOk) { setRider(null); return; }
    let live = true;
    const t = setTimeout(() => {
      api<{ available: boolean; courier?: string }>(`/api/shiprocket/quote?lat=${dropLat}&lng=${dropLng}&pincode=${form.pincode}&cod=${method === 'cod' ? 1 : 0}`)
        .then((r) => live && setRider(r)).catch(() => live && setRider(null));
    }, 600);
    return () => { live = false; clearTimeout(t); };
  }, [dropLat, dropLng, pinOk, form.pincode, method]);

  // GST registry lookup once a full, well-formed GSTIN is typed (only while the GST invoice option is on).
  const gstin = form.gstin.trim().toUpperCase();
  useEffect(() => {
    if (!wantGst || !GSTIN_RE.test(gstin)) { setGst((g) => (g.s === 'idle' ? g : { s: 'idle' })); return; }
    let live = true; setGst({ s: 'loading' });
    api<GstInfo>(`/api/gstin/${gstin}`)
      .then((info) => live && setGst({ s: 'ok', info }))
      .catch((e) => live && setGst({ s: e instanceof ApiError && e.status === 404 ? 'notfound' : e instanceof ApiError && e.status === 501 ? 'off' : 'down' }));
    return () => { live = false; };
  }, [gstin, wantGst]);
  // Billing comes from the GST registry and nowhere else: when the lookup answers, the company name and billing address are set from it (not editable).
  // Without an answer (lookup down or not set up) the invoice goes to the delivery address and the company name is typed in.
  useEffect(() => {
    if (!wantGst) return;
    if (gst.s === 'ok' && gst.info) {
      const i = gst.info;
      setForm((f) => ({ ...f, company: i.legalName || i.tradeName || f.company, sameBilling: false,
        billing: { firstName: f.firstName, lastName: f.lastName, address: i.address || f.address, city: i.city || f.city, state: i.state || f.state, pincode: i.pincode || f.pincode } }));
    } else setForm((f) => (f.sameBilling ? f : { ...f, sameBilling: true }));
  }, [gst.s, gst.info, wantGst]);

  // Live shipping quote once the delivery pincode is complete.
  useEffect(() => {
    if (!cartToken || !pinOk) { setQuote(null); return; }
    let live = true; setQuoting(true);
    const t = setTimeout(() => {
      api<Cart>('/api/cart/shipping', { method: 'POST', body: { token: cartToken, state: form.state, postcode: form.pincode, city: form.city, lat: dropLat, lng: dropLng } })
        .then((q) => live && setQuote(q)).catch(() => live && setQuote(null)).finally(() => live && setQuoting(false));
    }, 500);
    return () => { live = false; clearTimeout(t); };
  }, [cartToken, pinOk, form.state, form.pincode, form.city, dropLat, dropLng]);
  // Quick delivery carries Shiprocket's fee, which only online payment and cash on delivery can charge: the other methods are hidden while it is selected.
  const quickSel = Boolean(quote?.shipping_rates?.[0]?.shipping_rates.some((x) => x.selected && x.quick));
  const shownMethods = methods.filter((id) => !(id === 'cashfree' && methods.includes('razorpay'))).filter((id) => !quickSel || ['razorpay', 'cashfree', 'cod'].includes(id));
  useEffect(() => { if (method && shownMethods.length && !shownMethods.includes(method)) setMethod(shownMethods[0]); }, [shownMethods.join(','), method]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickRate = async (packageId: number | string, rateId: string) => {
    setQuoting(true);
    try { setQuote(await api<Cart>('/api/cart/shipping', { method: 'POST', body: { token: cartToken, packageId, rateId, postcode: form.pincode, lat: dropLat, lng: dropLng } })); } catch { /* keep the previous quote */ }
    setQuoting(false);
  };

  // Typing a different pincode than the pinned spot's means the pin no longer matches the address: it is removed, and the shopper is asked to pin again.
  const set = (k: keyof CheckoutForm) => (v: string) => { setEditing(true); setForm((f) => ({ ...f, [k]: v, ...(k === 'pincode' && f.drop && v !== dropPin ? { drop: undefined } : null) })); };
  const setB = (k: keyof Addr) => (v: string) => { setEditing(true); setForm((f) => ({ ...f, billing: { ...f.billing, [k]: v } })); };
  // Notes, GSTIN and company are typed without leaving the "Deliver to" summary, so they don't count as editing the address.
  const setQuiet = (k: keyof CheckoutForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const err = (k: string) => (touched || blurred[k] ? errors[k] : undefined);
  const focusField = (k: string) => {
    const el = inputs.current[k], sc = scroller.current;
    if (!el) return false;
    if (sc) el.measureLayout(sc as never, (_x: number, y: number) => sc.scrollTo({ y: Math.max(0, y - 90), animated: true }), () => {});
    el.focus();
    return true;
  };
  const nextOf = (k: string) => ORDER.slice(ORDER.indexOf(k) + 1).find((x) => inputs.current[x]);
  // Per-field wiring: the ref, "next" key, and showing the error once the field is left.
  const fld = (k: string) => ({
    inputRef: (el: RNTextInput | null) => { inputs.current[k] = el; },
    onBlur: () => setBlurred((b) => (b[k] ? b : { ...b, [k]: true })),
    returnKeyType: (nextOf(k) ? 'next' : 'done') as 'next' | 'done',
    blurOnSubmit: !nextOf(k),
    onSubmitEditing: () => { const n = nextOf(k); if (n) focusField(n); },
  });

  const NOTES = ['Leave at door', 'Leave with guard', 'Avoid calling'];
  const toggleNote = (label: string) => setForm((f) => {
    const has = f.notes.includes(label);
    return { ...f, notes: has ? f.notes.replace(`${label}. `, '').replace(label, '').trim() : `${f.notes}${f.notes && !f.notes.endsWith(' ') ? ' ' : ''}${label}. ` };
  });
  const toggleGst = () => { if (wantGst) setForm((f) => ({ ...f, company: '', gstin: '', sameBilling: true })); setWantGst(!wantGst); };

  if (!ready) return null;
  const items = cart?.items ?? [];
  if (!items.length) return <Center><Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 14 }}>Your cart is empty</Text><Button title="Continue shopping" onPress={() => router.replace('/(tabs)/shop')} /></Center>;

  const detailsOk = ['email', 'phone', 'firstName', 'lastName', 'address', 'city', 'state', 'pincode'].every((k) => !errors[k]);
  const showSummary = !editing && detailsOk;
  const t = (quote ?? cart)!.totals; const m = t.currency_minor_unit;
  const rates = quote?.shipping_rates?.[0];
  const sameDay = Boolean(rates?.shipping_rates.some((x) => x.quick)); // the server offers Quick for this cart (a rider can come and every item is tagged): the only way a rider is booked
  const mrp = items.reduce((n, i) => n + Number(i.prices.regular_price || i.prices.price) * i.quantity, 0);
  const itemsNow = items.reduce((n, i) => n + Number(i.prices.price) * i.quantity, 0);
  const saved = Math.max(0, mrp - itemsNow) + withTax(t.total_discount, t.total_discount_tax);
  const needsShip = quote ? quote.needs_shipping !== false : true;
  const noRates = Boolean(quote) && needsShip && !rates?.shipping_rates.length;
  const shipReady = pinOk && !quoting && Boolean(quote) && (!needsShip || Boolean(rates?.shipping_rates.some((x) => x.selected)));

  // A signed-in customer's delivery (and billing) address goes back to their WooCommerce account, so it is there next time and on every phone.
  // Only what the shopper typed is saved: an address picked from the saved list (maybe a gift for someone else) must not replace their own details,
  // and billing is written only for a GST invoice or when the account has none yet.
  const saveToAccount = () => {
    if (!user || !editing) return;
    const wc = (a: Addr) => ({ first_name: a.firstName, last_name: a.lastName, address_1: a.address, city: a.city, state: a.state, postcode: a.pincode, country: 'IN' });
    const billing = wantGst || !acct?.billing?.address_1 ? { billing: { ...wc(form.sameBilling ? form : form.billing), email: form.email, phone: form.phone, company: form.company } } : null;
    api('/api/auth/profile', { method: 'PUT', body: { shipping: { ...wc(form), phone: form.phone }, ...billing } }).catch(() => {});
  };
  const place = async () => {
    if (placingRef.current) return;
    track('begin_checkout', { items: items.length, method });
    setTouched(true);
    const bad = ORDER.find((k) => errors[k]) ?? Object.keys(errors)[0];
    if (bad && !focusField(bad)) { const card = bad === 'email' || bad === 'phone' ? 'contact' : bad === 'gstin' || bad.startsWith('b.') ? 'billing' : 'delivery'; scroller.current?.scrollTo({ y: Math.max(0, (cardY.current[card] ?? 0) - 8), animated: true }); }
    const gstProblem = !wantGst ? '' : !gstin ? 'Enter your GSTIN, or untick "Issue GST invoice".' : !GSTIN_RE.test(gstin) ? 'Enter a valid 15-character GSTIN.'
      : gst.s === 'loading' ? 'Checking your GSTIN… try again in a moment.' : gst.s === 'notfound' ? 'This GSTIN is not registered. Check the number.' : gst.s !== 'ok' && !form.company.trim() ? 'Enter the company name for your GST invoice.' : '';
    const billBad = wantGst && Object.keys(errors).some((k) => k.startsWith('b.'));
    const problem = gstProblem || (billBad ? 'The billing address from the GST registry looks incomplete. Untick "Issue GST invoice" to continue, or check the GSTIN.' : Object.keys(errors).length ? 'Please fix the highlighted fields.' : !method ? 'Choose a payment method.'
      : noRates ? "Sorry, we can't deliver to this pincode yet. Please contact us on WhatsApp." : !shipReady ? (quoting ? 'Calculating shipping… try again in a moment.' : 'We could not calculate shipping. Check your pincode and state.') : '');
    if (problem) return setError(problem);
    placingRef.current = true;
    setPlacing(true); setError('');
    try {
      if (native && method === 'razorpay') {
        const prev = Number(await storage.get(PENDING).catch(() => 0)) || 0;
        const d = await api<PayRequest>('/api/pay/razorpay/create', { method: 'POST', body: { token: cartToken, form, previousOrderId: prev } });
        await storage.set(PENDING, String(d.orderId)).catch(() => {}); // the order exists already: a failed note must not look like a failed order
        saveToAccount();
        await setPayRequest(d);
        router.push('/pay');
      } else {
        const d = await api<{ orderId: number; orderKey?: string; redirect: string | null }>('/api/checkout', { method: 'POST', body: { token: cartToken, form, paymentMethod: method } });
        saveToAccount();
        if (d.redirect && !/order-received/.test(d.redirect)) {
          // Pay-later and other redirect gateways: the shopper pays on their page, and this screen waits for the order to turn paid (or failed).
          await Linking.openURL(d.redirect);
          router.replace({ pathname: '/order-success', params: { orderId: String(d.orderId), key: d.orderKey ?? '' } });
        } else { await clearLocalCart(); router.replace({ pathname: '/order-success', params: { orderId: String(d.orderId), key: d.orderKey ?? '' } }); }
      }
    } catch (e) { setError((e as Error).message); }
    placingRef.current = false;
    setPlacing(false);
  };

  // A plain function that returns the fields (called, not rendered as <Component/>): a component defined inside the screen is a new type on every render, which rebuilt the inputs and closed the keyboard after each character.
  const addrFields = (pre: '' | 'b.') => {
    const v = (k: keyof Addr) => (pre ? form.billing[k] : form[k]);
    const on = (k: keyof Addr) => (pre ? setB(k) : set(k));
    return (
      <>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="First name" value={v('firstName')} onChangeText={on('firstName')} error={err(`${pre}firstName`)} autoComplete="given-name" textContentType="givenName" {...(pre ? null : fld('firstName'))} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Last name" value={v('lastName')} onChangeText={on('lastName')} error={err(`${pre}lastName`)} autoComplete="family-name" textContentType="familyName" {...(pre ? null : fld('lastName'))} />
          </View>
        </View>
        {/* The pincode comes first: it fills in the city and state below. */}
        <Field label="Pincode" value={v('pincode')} onChangeText={(t) => { typedPin.current[pre ? 'billing' : 'delivery'] = t; on('pincode')(t); }} error={err(`${pre}pincode`)} keyboardType="number-pad" maxLength={6} autoComplete="postal-code" textContentType="postalCode" {...(pre ? null : fld('pincode'))} />
        {pinNote[pre ? 'billing' : 'delivery'] ? <Text style={{ color: pinNote[pre ? 'billing' : 'delivery'].startsWith('We couldn') ? c.danger : c.success, fontSize: 12, marginTop: -8, marginBottom: 12 }} accessibilityLiveRegion="polite">{pinNote[pre ? 'billing' : 'delivery']}</Text> : null}
        <Field label="City" value={v('city')} onChangeText={on('city')} error={err(`${pre}city`)} textContentType="addressCity" {...(pre ? null : fld('city'))} />
        <Text style={s.lbl}>State</Text>
        <Pressable style={s.select} onPress={() => setPicker(pre ? 'b.state' : 'state')} accessibilityRole="button" accessibilityLabel={`State: ${IN_STATES.find(([x]) => x === v('state'))?.[1] ?? 'not chosen'}. Tap to change`}><Text style={{ fontSize: 15 }}>{IN_STATES.find(([x]) => x === v('state'))?.[1]}</Text><Text style={{ color: c.muted }}>▾</Text></Pressable>
        <Field label="Address (house no., street, area)" value={v('address')} onChangeText={on('address')} error={err(`${pre}address`)} autoComplete="street-address" textContentType="streetAddressLine1" {...(pre ? null : fld('address'))} />
        {!pre && needAddr && !form.address ? <Text style={{ color: c.accent, fontSize: 12, fontWeight: '700', marginTop: -8, marginBottom: 12 }} accessibilityLiveRegion="polite">You changed your delivery area. Add the house number and street for it.</Text> : null}
      </>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ headerRight: () => <SearchButton /> }} />
      <ScrollView ref={scroller} contentContainerStyle={{ padding: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {showSummary ? (
          <Card>
            <View style={s.line}><H>Deliver to</H><Pressable onPress={() => setEditing(true)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityRole="button" accessibilityLabel="Edit delivery details"><Text style={{ color: c.accent, fontWeight: '800' }}>Edit</Text></Pressable></View>
            <Text style={{ fontWeight: '800' }}>{`${form.firstName} ${form.lastName}`.trim()} · {form.phone}</Text>
            <Text style={{ color: '#444', marginTop: 2 }}>{oneLine(form)}</Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{form.email}</Text>
            {(pinNote.delivery ?? '').startsWith("We couldn") ? <Text style={{ color: c.danger, fontSize: 12, marginTop: 4 }} accessibilityLiveRegion="polite">{pinNote.delivery} Tap Edit to fix it.</Text> : null}
            <Pressable onPress={() => setPinOpen(true)} style={[s.drop, { marginTop: 12, marginBottom: 0 }]} accessibilityRole="button" accessibilityLabel="Search or pin your drop location">
              <Text style={{ fontSize: 20 }}>{form.drop ? '📍' : '🗺️'}</Text>
              <Text style={{ flex: 1, fontWeight: '700' }}>{form.drop ? 'Drop location pinned' : 'Pin your drop location (optional)'}</Text>
              <Text style={{ color: c.accent, fontWeight: '800' }}>{form.drop ? 'Change' : 'Set'}</Text>
            </Pressable>
            {rider?.available && sameDay && form.drop && <View style={s.rider} accessibilityRole="text" accessibilityLabel="Same-day rider delivery is available: choose it under Delivery option"><Text style={{ fontSize: 18 }}>🛵</Text><View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: c.greenDark }}>Rider delivery available</Text><Text style={{ color: '#444', fontSize: 12 }}>Choose the ⚡ Quick option under Delivery option and a rider brings it to your pinned location.</Text></View></View>}
          </Card>
        ) : (
          <>
        <Card onLayout={(e) => { cardY.current.contact = e.nativeEvent.layout.y; }}>
          <H>1. Contact</H>
          <Field label="Email" value={form.email} onChangeText={set('email')} error={err('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" {...fld('email')} />
          <Field label="Mobile number" value={form.phone} onChangeText={set('phone')} error={err('phone')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="10-digit mobile" {...fld('phone')} />
        </Card>
        <Card onLayout={(e) => { cardY.current.delivery = e.nativeEvent.layout.y; }}>
          <H>2. Delivery address</H>
          {/* The drop point on Google Maps: what a hyperlocal rider navigates to. */}
          <Pressable onPress={() => setPinOpen(true)} style={s.drop} accessibilityRole="button" accessibilityLabel="Search or pin your drop location">
            <Text style={{ fontSize: 22 }}>{form.drop ? '📍' : '🗺️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800' }}>{form.drop ? 'Drop location pinned' : 'Pin your drop location (optional)'}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={2}>{form.drop ? `${form.city}${form.pincode ? ` · ${form.pincode}` : ''} — tap to change on the map` : 'Helps the delivery partner find you, and unlocks rider delivery where it is available.'}</Text>
            </View>
            <Text style={{ color: c.accent, fontWeight: '800' }}>{form.drop ? 'Change' : 'Set'}</Text>
          </Pressable>
          {rider?.available && sameDay && form.drop && <View style={s.rider} accessibilityRole="text" accessibilityLabel="Same-day rider delivery is available: choose it under Delivery option"><Text style={{ fontSize: 18 }}>🛵</Text><View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: c.greenDark }}>Rider delivery available</Text><Text style={{ color: '#444', fontSize: 12 }}>Choose the ⚡ Quick option under Delivery option and a rider brings it to your pinned location.</Text></View></View>}
          {user ? (() => {
            const ship = fromWc(acct?.shipping);
            return (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.lbl}>Saved in your account</Text>
                {!ship && <Text style={{ color: c.muted, fontSize: 13 }}>No address saved in your account yet. It will be saved from this order.</Text>}
                {([['Shipping address', ship, acct?.shipping]] as const).map(([title, a, raw]) => a && (
                  <Pressable key={title} onPress={() => setForm((f) => ({ ...f, ...a, phone: f.phone || raw?.phone || '', drop: f.drop && a.pincode === dropPin ? f.drop : undefined }))} style={s.savedAddr} accessibilityRole="button" accessibilityLabel={`Use saved ${title}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800' }}>{title}</Text>
                      <Text style={{ color: '#444', marginTop: 2 }} numberOfLines={3}>{[`${a.firstName} ${a.lastName}`.trim(), oneLine(a)].filter(Boolean).join('\n')}</Text>
                    </View>
                    <Text style={{ color: c.accent, fontWeight: '800' }}>Use</Text>
                  </Pressable>
                ))}
              </View>
            );
          })() : (
            <Pressable onPress={showLogin} style={s.savedAddr} accessibilityRole="button" accessibilityLabel="Log in to use your saved addresses">
              <Text style={{ flex: 1, color: '#444' }}>Log in to use the shipping address saved in your account, or just fill it in below.</Text><Text style={{ color: c.accent, fontWeight: '800' }}>Log in</Text>
            </Pressable>
          )}
          {addrFields('')}
        </Card>
          </>
        )}
        <Card>
          <Text style={s.lbl}>Delivery instructions</Text>
          <View style={s.chips}>
            {NOTES.map((n) => { const on = form.notes.includes(n); return (
              <Pressable key={n} onPress={() => toggleNote(n)} style={[s.chip, on && s.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}><Text style={[s.chipT, on && { color: c.accent }]}>{on ? '✓ ' : ''}{n}</Text></Pressable>
            ); })}
          </View>
          <Field label="Order notes (optional)" value={form.notes} onChangeText={setQuiet('notes')} multiline placeholder="Anything else the delivery partner should know…" />
        </Card>
        <DeliverySlots pincode={form.pincode} value={form.slot} onChange={(slot, slotLabel) => setForm((f) => (f.slot === slot ? f : { ...f, slot, slotLabel }))} />
        <Card onLayout={(e) => { cardY.current.billing = e.nativeEvent.layout.y; }}>
          <Pressable onPress={toggleGst} style={s.switchRow} accessibilityRole="checkbox" accessibilityState={{ checked: wantGst }}>
            <View style={[s.box, wantGst && { backgroundColor: c.accent, borderColor: c.accent }]}>{wantGst && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}</View>
            <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontSize: 15, fontWeight: '700' }}>Issue GST invoice</Text><Text style={{ color: c.muted, fontSize: 12 }}>Tick to add your company name, GSTIN and billing address.</Text></View>
          </Pressable>
          {wantGst && (
            <View style={{ marginTop: 14 }}>
              <Field label="GSTIN" value={form.gstin} onChangeText={setQuiet('gstin')} error={err('gstin')} autoCapitalize="characters" maxLength={15} />
              {gst.s === 'loading' && <Text style={s.gstNote}>Checking this GSTIN…</Text>}
              {gst.s === 'notfound' && <Text style={[s.gstNote, { color: c.danger }]}>This GSTIN is not registered. Check the number.</Text>}
              {gst.s === 'ok' && gst.info && (
                <View style={[s.gstCard, !gst.info.active && { borderColor: c.danger, backgroundColor: '#fdecec' }]} accessibilityLiveRegion="polite">
                  <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>BILLING DETAILS FROM THE GST REGISTRY</Text>
                  <Text style={{ fontWeight: '800', marginTop: 2 }}>{gst.info.legalName || gst.info.tradeName}</Text>
                  {gst.info.tradeName && gst.info.tradeName !== gst.info.legalName ? <Text style={{ color: c.muted, fontSize: 12 }}>{gst.info.tradeName}</Text> : null}
                  <Text style={{ color: gst.info.active ? c.success : c.danger, fontWeight: '800', fontSize: 12, marginTop: 4 }}>{gst.info.active ? '✓ Active GSTIN' : `GSTIN is ${gst.info.status || 'not active'}: an invoice to it may not be valid`}</Text>
                  <Text style={{ color: '#444', marginTop: 4, fontSize: 13 }}>{[gst.info.address, gst.info.pincode].filter(Boolean).join(' · ')}</Text>
                </View>
              )}
              {(gst.s === 'down' || gst.s === 'off') && GSTIN_RE.test(gstin) && (<>
                <Text style={s.gstNote}>We couldn't check this GSTIN just now. Enter the company name as on the registration; the invoice will use your delivery address.</Text>
                <Field label="Company name" value={form.company} onChangeText={setQuiet('company')} error={touched && !form.company.trim() ? 'Required' : undefined} autoComplete="organization" />
              </>)}
            </View>
          )}
        </Card>
        {rates && rates.shipping_rates.length > 1 && (
          <Card>
            <H>Delivery option</H>
            {rates!.shipping_rates.map((x) => (
            <Pressable key={x.rate_id} onPress={() => pickRate(rates.package_id, x.rate_id)} style={s.rate}>
              <View style={[s.radio, x.selected && { borderColor: c.accent }]}>{x.selected && <View style={s.radioDot} />}</View>
              <Text style={{ flex: 1 }}>{x.quick ? '⚡ ' : ''}{decodeHtml(x.name)}</Text><Text style={{ fontWeight: '700' }}>{Number(x.price) > 0 ? minorToInr(x.price, m) : 'Free'}</Text>
            </Pressable>
            ))}
          </Card>
        )}
        <PaymentMethods methods={shownMethods} selected={method} onSelect={setMethod} native={native} />
        <OrderSummary
          items={items}
          totals={t}
          quote={quote}
          quoting={quoting}
          pinOk={pinOk}
          saved={saved}
          mrp={mrp}
          itemsNow={itemsNow}
          noRates={noRates}
          whatsapp={WHATSAPP}
          pincode={form.pincode}
        />
        <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
          By placing your order you agree to our <Text style={s.link} onPress={() => Linking.openURL(`${SITE_URL}/terms-conditions/`)} accessibilityRole="link">Terms</Text> and <Text style={s.link} onPress={() => Linking.openURL(`${SITE_URL}/refund_returns/`)} accessibilityRole="link">Refund Policy</Text>.
        </Text>
      </ScrollView>

      {/* Blinkit's sticky footer: where it's going, how it's paid, and the one big button. */}
      {!kb && <SafeAreaView edges={['bottom']} style={s.foot}>
        {error ? <Text style={{ color: c.danger, paddingHorizontal: 14, paddingTop: 8, fontSize: 13 }}>{error}</Text> : null}
        <View style={s.footAddr}>
          <Text style={{ flex: 1, fontSize: 13, color: '#444' }} numberOfLines={2}>
            {form.address || form.city ? <><Text style={{ fontWeight: '800' }}>Delivering to </Text>{form.address ? `${form.address}, ` : ''}{form.city}{form.pincode ? ` · ${form.pincode}` : ''}</> : <Text style={{ color: c.muted }}>Add your delivery address above</Text>}
          </Text>
        </View>
        <View style={s.footRow}>
          <View style={{ minWidth: 96, maxWidth: '38%' }}>
            <Text style={{ fontSize: 11, color: c.muted }} numberOfLines={1}>PAY USING</Text>
            <Text style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={2}>{method ? (native && method === 'razorpay' ? 'UPI / Card / Netbanking' : payName(method)) : '…'}</Text>
          </View>
          <Button title={`${quoting ? 'Updating total…' : minorToInr(t.total_price, m)}  ·  Place order`} loading={placing} onPress={place} style={{ flex: 1, marginLeft: 12 }} />
        </View>
      </SafeAreaView>}

      <LocationSheet visible={pinOpen} onClose={() => setPinOpen(false)} onChange={(l) => {
        const cleared = Boolean(form.address) && form.pincode !== l.pin;
        setDropPin(l.lat != null ? l.pin : '');
        // A different pincode means a different place: the old street line no longer belongs (a chosen saved address refills it just below).
        setForm((f) => ({ ...f, address: f.pincode === l.pin ? f.address : '', pincode: l.pin, city: l.city || f.city, state: l.stateCode || f.state, drop: l.lat != null && l.lng != null ? { lat: l.lat, lng: l.lng } : undefined }));
        selectedAddress().then((a) => { if (!a && cleared) { setNeedAddr(true); setTimeout(() => focusField('address'), 400); } if (a) setForm((f) => ({ ...f, address: a.line, firstName: a.name ? a.name.split(' ')[0] : f.firstName, lastName: a.name ? a.name.split(' ').slice(1).join(' ') : f.lastName, phone: a.phone || f.phone })); });
      }} />

      <StatePickerModal
        visible={Boolean(picker)}
        onClose={() => setPicker('')}
        value={picker === 'state' ? form.state : form.billing.state}
        onChange={(code) => {
          picker === 'state' ? set('state')(code) : setB('state')(code);
          setPicker('');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  lbl: { fontSize: 13, color: '#555', marginBottom: 6 },
  select: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: r.md, paddingHorizontal: 14, minHeight: 48, marginBottom: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  hr: { height: 1, backgroundColor: c.line, marginVertical: 8 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: r.pill, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' },
  chipOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  chipT: { fontSize: 13, fontWeight: '600', color: c.text },
  box: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  foot: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: c.line },
  footAddr: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 10 },
  footRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, marginBottom: 14 },
  link: { color: c.accent, fontWeight: '700', textDecorationLine: 'underline' },
  savedAddr: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', marginBottom: 8 },
  gstNote: { color: c.muted, fontSize: 12, marginTop: -8, marginBottom: 12 },
  gstCard: { padding: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.success, backgroundColor: c.greenSoft, marginTop: -4, marginBottom: 14 },
  rider: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: r.md, backgroundColor: c.greenSoft, borderWidth: 1, borderColor: c.green, marginTop: 10, marginBottom: 4 },
});
