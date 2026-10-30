import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, FlatList, Keyboard, LayoutAnimation, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { isHyderabad, loadLoc } from '@/location';
import type { Loc } from '@/location';
import { useWishlist } from '@/wishlist';
import LocationSheet from '@/components/LocationSheet';
import { Button, Card, Spinner } from '@/components/ui';
import { decodeHtml, minorToInr, withTax } from '@/format';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store';
import { useFetch } from '@/useFetch';
import { storage } from '@/storage';
import { useFlag } from '@/appConfig';
import type { CartItem, Product } from '@/types';
import { c, r } from '@/theme';

type Undo = { label: string; restore: () => Promise<void> };

export default function CartScreen() {
  const { cart, cartToken, ready, syncing, itemCount, refresh, addItem, updateItem, removeItem, applyCoupon, removeCoupon, quoteShipping } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const freeShip = useFetch<{ min: number | null }>('/api/cart/free-shipping'); // the store's real free-shipping amount, if it has one
  const [code, setCode] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [pinOpen, setPinOpen] = useState(false); // the same "Select delivery location" sheet as Home, right here in the cart
  const [undo, setUndo] = useState<Undo | null>(null); // the last removed line, restorable for a few seconds
  const [kb, setKb] = useState(false);
  const offersOn = useFlag('offers');
  const { has, toggle } = useWishlist();
  // The focus effect reads these through a ref, so it runs once per visit rather than on every cart change.
  const latest = useRef({ quoteShipping, cartToken, quotable: false });
  const quoted = useRef(''); // cart + pin last quoted, so a changed location is re-quoted but a plain revisit is not
  latest.current.quoteShipping = quoteShipping; latest.current.cartToken = cartToken;
  useFocusEffect(useCallback(() => {
    loadLoc().then(({ loc: l }) => {
      setLoc(l);
      // A saved location with no delivery quote yet (app restarted, or the cart is new): quote it now, so Delivery and the total are real.
      const x = latest.current;
      const key = `${x.cartToken}|${l?.pin}`;
      if (l && x.cartToken && (x.quotable || quoted.current !== key) && /^\d{6}$/.test(l.pin)) { quoted.current = key; x.quoteShipping(l.stateCode, l.pin, l.city, { lat: l.lat, lng: l.lng }).then(refresh).catch(() => {}); }
    }).catch(() => {});
    refresh();
  }, [refresh])); // also pick up changes made elsewhere
  const offers = useFetch<{ offers: unknown[] }>(offersOn ? '/api/offers' : null); // the link below appears only when there is something to show
  const popular = useFetch<Product[]>('/api/catalog/products?orderby=popularity&per_page=12'); // hook stays above the early returns
  // Is each line still in stock, and has its price moved since the shopper last saw the cart? (Variations are not checked: the list holds only their parent product.)
  const lines = cart?.items ?? [];
  const plain = lines.filter((i) => !i.variation?.length).map((i) => i.id);
  const stock = useFetch<Product[]>(plain.length ? `/api/catalog/products?include=${plain.join(',')}&per_page=40` : null);
  const gone = new Set(lines.filter((i) => stock.data?.some((p) => p.id === i.id && !p.is_in_stock)).map((i) => i.key));
  const [moved, setMoved] = useState<Record<string, { was: number; now: number }>>({});
  const sig = lines.map((i) => `${i.id}:${i.prices.price}`).join(',');
  useEffect(() => {
    if (!lines.length) return;
    let live = true;
    (async () => {
      let prev: Record<string, number> = {};
      try { prev = JSON.parse((await storage.get('ksp_cart_prices')) ?? '{}'); } catch { /* first look */ }
      const ch: Record<string, { was: number; now: number }> = {};
      for (const i of lines) { const was = prev[i.id], now = Number(i.prices.price); if (was && was !== now) ch[i.key] = { was, now }; }
      storage.set('ksp_cart_prices', JSON.stringify(Object.fromEntries(lines.map((i) => [i.id, Number(i.prices.price)])))).catch(() => {});
      if (live && Object.keys(ch).length) setMoved((m) => ({ ...m, ...ch }));
    })();
    return () => { live = false; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t); }, [undo]);
  useEffect(() => {
    const on = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const off = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { on.remove(); off.remove(); };
  }, []);
  if (!ready) return <Spinner />;
  const items = cart?.items ?? [];
  const act = (fn: () => Promise<void>) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); return fn().catch((e: Error) => Alert.alert('Cart', e.message)); };
  const inCart = new Set(items.map((i) => i.id));
  const more = (popular.data ?? []).filter((p) => !inCart.has(p.id) && p.is_in_stock).slice(0, 8);

  // Removing a line (or moving it to the wishlist) can be taken back for a few seconds.
  const removeLine = (item: CartItem, toWishlist: boolean) => act(async () => {
    await removeItem(item.key);
    const added = toWishlist && !has(item.id);
    if (added) toggle(item.id);
    setUndo({ label: `${decodeHtml(item.name)} ${toWishlist ? 'moved to wishlist' : 'removed'}`, restore: async () => { await addItem(item.id, item.quantity, item.variation); if (added) toggle(item.id); } });
  });
  const undoBar = undo && (
    <View style={s.undo} accessibilityLiveRegion="polite">
      <Text style={{ flex: 1, color: '#fff', fontSize: 13 }} numberOfLines={2}>{undo.label}</Text>
      <Pressable onPress={() => { const u = undo; setUndo(null); act(u.restore); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Undo"><Text style={{ color: '#9cc0ff', fontWeight: '800', fontSize: 14 }}>UNDO</Text></Pressable>
    </View>
  );

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Your cart is empty</Text>
          <Text style={{ color: c.muted, marginBottom: 18 }}>Add something to get started.</Text>
          <Button title="Start shopping" onPress={() => router.push('/(tabs)/shop')} />
          <Pressable onPress={() => router.push('/wishlist')} style={{ padding: 14 }} accessibilityRole="button"><Text style={{ color: c.accent, fontWeight: '800' }}>View your wishlist</Text></Pressable>
        </View>
        {more.length > 0 && (
          <View style={{ paddingLeft: 12, paddingBottom: 12 }}>
            <Text style={[s.h, { marginBottom: 4 }]}>Popular right now</Text>
            <FlatList horizontal data={more} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false} renderItem={({ item, index }) => <ProductCard product={item} width={140} index={index} />} />
          </View>
        )}
        {undoBar}
      </View>
    );
  }
  const t = cart!.totals; const m = t.currency_minor_unit;
  const subtotal = withTax(t.total_items, t.total_items_tax) / 10 ** m; // with GST: the amount the free-shipping rule counts and the shopper recognises
  const FREE_SHIPPING = freeShip.data?.min ?? null;
  const left = FREE_SHIPPING == null ? null : FREE_SHIPPING - subtotal;
  // Blinkit's "you're saving" banner: sale markdowns plus any coupon discount.
  const saved = (items.reduce((n, i) => n + Math.max(0, Number(i.prices.regular_price) - Number(i.prices.price)) * i.quantity, 0) + withTax(t.total_discount, t.total_discount_tax)) / 10 ** m;
  // WooCommerce keeps the shipping from the last address that was quoted, and the total already includes it: show it, so the rows add up to the total.
  // A zero only means "free" once a rate was actually chosen; a bare 0 can be a cart nobody has quoted yet.
  const shipping = withTax(t.total_shipping, t.total_shipping_tax);
  const rateChosen = Boolean(cart!.shipping_rates?.some((p) => p.shipping_rates.some((x) => x.selected)));
  const shipKnown = t.total_shipping != null && t.total_shipping !== '' && (shipping > 0 || rateChosen);
  latest.current.quotable = !shipKnown;
  const chosen = cart!.shipping_rates?.[0]?.shipping_rates.find((x) => x.selected); // the courier now selected: its name carries the delivery date
  const eta = chosen?.name.match(/Delivery By ([A-Za-z]+ \d+)/i)?.[1] ?? '';
  const apply = () => act(async () => { setCouponBusy(true); try { await applyCoupon(code.trim()); setCode(''); } finally { setCouponBusy(false); } });

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <FlatList data={items} keyExtractor={(i) => i.key} contentContainerStyle={{ padding: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} tintColor={c.loader} />}
        ListHeaderComponent={
          <>
            <Card>
              <Text style={{ fontSize: 17, fontWeight: '900', color: c.text }}>{!loc ? 'Where should we deliver?' : `Delivery to ${loc.city}${eta ? ` · by ${eta}` : ''}`}</Text>
              <Pressable onPress={() => setPinOpen(true)} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel="Change delivery location" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={{ flex: 1, color: '#444', fontSize: 13 }} numberOfLines={2}>{loc ? `${loc.area}, ${loc.city} · ${loc.pin}` : 'Set your delivery location'}</Text>
                <Text style={{ color: c.accent, fontWeight: '800', fontSize: 13 }}>{loc ? 'Change' : 'Set'}</Text>
              </Pressable>
              <Text style={{ color: c.muted, marginTop: 6 }}>{itemCount} item{itemCount > 1 ? 's' : ''} in your cart</Text>
            </Card>
            {gone.size > 0 && (
              <Card style={{ backgroundColor: "#fdecec", borderColor: c.danger }}>
                <Text style={{ fontWeight: '800', color: c.danger }}>{gone.size} item{gone.size > 1 ? 's are' : ' is'} out of stock</Text>
                <Text style={{ color: '#444', marginTop: 2, fontSize: 13 }}>Remove {gone.size > 1 ? 'them' : 'it'} or move {gone.size > 1 ? 'them' : 'it'} to your wishlist to check out.</Text>
              </Card>
            )}
            {FREE_SHIPPING != null && left != null && (
              <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
                <Text style={{ fontWeight: '700', color: c.accent }}>{left > 0 ? `Add ${minorToInr(left * 10 ** m, m)} more for free shipping` : '🎉 You get free shipping'}</Text>
                <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }]} /></View>
              </Card>
            )}
          </>
        }
        renderItem={({ item }) => {
          const name = decodeHtml(item.name);
          const slug = item.permalink?.split('/').filter(Boolean).pop();
          const max = item.quantity_limits?.maximum ?? Infinity, atMax = item.quantity >= max;
          const line = withTax(item.totals.line_total, item.totals.line_total_tax), cur = item.totals.currency_minor_unit;
          const unit = Number(item.prices.price), mrp = Number(item.prices.regular_price);
          const strike = mrp > unit && unit > 0 ? (mrp / unit) * line : 0; // the MRP of the whole line, on the same GST footing as the price shown
          return (
            <Card style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => slug && router.push({ pathname: '/product/[slug]', params: { slug } })} disabled={!slug} accessibilityRole="link" accessibilityLabel={`Open ${name}`}>
                <Image source={item.images[0]?.thumbnail || item.images[0]?.src} style={[s.img, gone.has(item.key) && { opacity: 0.4 }]} contentFit="contain" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => slug && router.push({ pathname: '/product/[slug]', params: { slug } })} disabled={!slug} accessibilityRole="link" accessibilityLabel={`Open ${name}`}>
                  <Text numberOfLines={2} style={s.name}>{name}</Text>
                </Pressable>
                {stock.data?.find((p) => p.id === item.id)?.quick ? <View style={s.qk}><Ionicons name="flash" size={11} color={c.accent} /><Text style={s.qkT}>Quick</Text></View> : null}
                {item.variation?.length ? <Text style={s.var}>{item.variation.map((v) => v.value).join(' / ')}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <Text style={s.price}>{minorToInr(line, cur)}</Text>
                  {strike > line ? <Text style={s.mrp}>{minorToInr(strike, cur)}</Text> : null}
                </View>
                {gone.has(item.key) ? <Text style={[s.limit, { color: c.danger }]}>Out of stock</Text> : null}
                {moved[item.key] ? <Text style={[s.limit, { color: moved[item.key].now < moved[item.key].was ? c.success : c.dealText }]}>Price {moved[item.key].now < moved[item.key].was ? 'dropped' : 'changed'}: was {minorToInr(moved[item.key].was, cur)}</Text> : null}
                {item.quantity > 1 ? <Text style={s.var}>{minorToInr(line / item.quantity, cur)} each</Text> : null}
                <View style={s.ctl}>
                  <View style={s.qty}>
                    <Pressable onPress={() => item.quantity > 1 ? act(() => updateItem(item.key, item.quantity - 1)) : removeLine(item, false)} style={s.qb} accessibilityRole="button" accessibilityLabel={item.quantity > 1 ? `Decrease quantity of ${name}` : `Remove ${name}`}><Text style={s.qt}>−</Text></Pressable>
                    <Qty item={item} onSet={(n) => act(() => updateItem(item.key, n))} />
                    <Pressable onPress={() => act(() => updateItem(item.key, item.quantity + 1))} disabled={atMax} style={[s.qb, atMax && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel={`Increase quantity of ${name}`}><Text style={s.qt}>+</Text></Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable onPress={() => removeLine(item, true)} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} style={s.save} accessibilityRole="button" accessibilityLabel={`Move ${name} to wishlist`}><Ionicons name="heart-outline" size={15} color={c.accent} /><Text style={s.saveT}>Save</Text></Pressable>
                    <Pressable onPress={() => removeLine(item, false)} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} style={s.save} accessibilityRole="button" accessibilityLabel={`Remove ${name} from cart`}><Ionicons name="trash-outline" size={15} color={c.danger} /><Text style={[s.saveT, { color: c.danger }]}>Remove</Text></Pressable>
                  </View>
                </View>
                {atMax && max < 9999 ? <Text style={s.limit}>Maximum {max} per order</Text> : item.low_stock_remaining ? <Text style={s.limit}>Only {item.low_stock_remaining} left</Text> : null}
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          <>
            {more.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={[s.h, { marginHorizontal: 4, marginTop: 4, marginBottom: 4 }]}>Complete your order</Text>
                <FlatList horizontal data={more} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false}
                  renderItem={({ item, index }) => <ProductCard product={item} width={140} index={index} />} />
              </View>
            )}
            <Card>
              <Text style={s.h}>Coupon</Text>
              {offersOn && offers.data?.offers?.length ? <Pressable onPress={() => router.push('/offers')} hitSlop={{ top: 8, bottom: 8 }} style={{ marginBottom: 10 }} accessibilityRole="button"><Text style={{ color: c.accent, fontWeight: '800' }}>View available offers</Text></Pressable> : null}
              {cart!.coupons.map((cp) => (
                <View key={cp.code} style={s.coupon}><Text style={{ fontWeight: '700', color: c.success }}>{cp.code.toUpperCase()} applied</Text><Pressable onPress={() => act(() => removeCoupon(cp.code))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={`Remove coupon ${cp.code}`}><Text style={{ color: c.danger }}>Remove</Text></Pressable></View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={s.input} placeholder="Coupon code" placeholderTextColor="#767676" autoCapitalize="characters" autoCorrect={false} returnKeyType="done" accessibilityLabel="Coupon code" value={code} onChangeText={setCode}
                  onSubmitEditing={() => { if (code.trim() && !couponBusy) apply(); }} />
                <Button title="Apply" variant="outline" loading={couponBusy} disabled={!code.trim()} onPress={apply} />
              </View>
            </Card>
            <Card>
              <Text style={s.h}>Bill details</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#555' }}>Items total</Text>
                  {saved >= 1 && <View style={s.chip}><Text style={s.chipT}>Saved {minorToInr(saved * 10 ** m, m)}</Text></View>}
                </View>
                <Text style={{ fontWeight: '600' }}>{minorToInr(withTax(t.total_items, t.total_items_tax), m)}</Text>
              </View>
              {Number(t.total_discount) > 0 && <Row k="Coupon discount" v={`−${minorToInr(withTax(t.total_discount, t.total_discount_tax), m)}`} color={c.success} />}
              <Row k="Delivery" v={shipKnown ? (shipping > 0 ? minorToInr(shipping, m) : 'FREE') : 'Calculated at checkout'} color={shipKnown && shipping <= 0 ? c.success : undefined} />
              <View style={{ height: 1, backgroundColor: c.line, marginVertical: 6 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '900' }}>Estimated total</Text><Text style={{ fontSize: 16, fontWeight: '900' }}>{minorToInr(t.total_price, m)}</Text>
              </View>
              <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>Includes GST {minorToInr(t.total_tax, m)}</Text>
              {saved >= 1 && <View style={s.savings}><Text style={s.chipT}>Your total savings</Text><Text style={s.chipT}>{minorToInr(saved * 10 ** m, m)}</Text></View>}
            </Card>
          </>
        } />
      {undoBar}
      {!kb && (
        <View style={s.barWrap}>
          <View style={s.bar}>
            <View><Text style={{ color: c.muted, fontSize: 12 }}>Estimated total</Text><Text style={{ fontSize: 20, fontWeight: '900' }}>{minorToInr(t.total_price, m)}</Text></View>
            {/* Waits for quantity changes still on their way, so checkout always opens on the cart the shopper sees. */}
            <Button title={gone.size ? 'Remove unavailable items' : 'Proceed to checkout'} loading={syncing} disabled={gone.size > 0} style={{ flex: 1, marginLeft: 16 }} onPress={() => router.push('/checkout')} />
          </View>
        </View>
      )}
      <LocationSheet visible={pinOpen} onClose={() => setPinOpen(false)} onChange={(l) => {
        setLoc(l);
        // Quote delivery for the new place right away, so the Delivery row and the total match it (not the address quoted last time).
        if (cartToken && /^\d{6}$/.test(l.pin)) quoteShipping(l.stateCode, l.pin, l.city, { lat: l.lat, lng: l.lng }).catch(() => refresh());
        else refresh();
      }} />
    </View>
  );
}

// The quantity is typed as well as stepped: bulk parts (resistors, screws) would take hundreds of taps.
function Qty({ item, onSet }: { item: CartItem; onSet: (n: number) => void }) {
  const [txt, setTxt] = useState<string | null>(null);
  const lim = item.quantity_limits;
  const commit = () => {
    const n = parseInt(txt ?? '', 10); setTxt(null);
    if (!Number.isFinite(n)) return;
    const step = lim?.multiple_of || 1;
    const q = Math.max(lim?.minimum ?? 1, Math.min(lim?.maximum ?? 9999, Math.round(n / step) * step));
    if (q !== item.quantity) onSet(q);
  };
  return <TextInput value={txt ?? String(item.quantity)} onChangeText={(v) => setTxt(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" selectTextOnFocus returnKeyType="done" onBlur={commit} onSubmitEditing={commit}
    style={[s.qt, { minWidth: 40, textAlign: 'center', paddingVertical: 8 }]} accessibilityLabel={`Quantity of ${decodeHtml(item.name)}`} />;
}

const Row = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><Text style={{ color: color ?? '#555' }}>{k}</Text><Text style={{ fontWeight: '600', color: color ?? c.text }}>{v}</Text></View>
);

const s = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#fff', marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: c.accent },
  img: { width: 84, height: 84, borderRadius: r.sm, backgroundColor: c.surface },
  name: { fontSize: 14, fontWeight: '600', color: c.text },
  var: { fontSize: 12, color: c.muted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '800' },
  mrp: { fontSize: 12, color: c.muted, textDecorationLine: 'line-through' },
  limit: { fontSize: 12, color: c.dealText, fontWeight: '700', marginTop: 6 },
  ctl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', rowGap: 8 },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: r.sm },
  qb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qt: { fontSize: 16, fontWeight: '700', color: c.text },
  h: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  qk: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 3 },
  qkT: { color: c.accent, fontWeight: '800', fontSize: 11.5 },
  save: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 10, borderRadius: r.sm, borderWidth: 1, borderColor: c.line },
  saveT: { color: c.accent, fontWeight: '700', fontSize: 12.5 },
  coupon: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: r.md, paddingHorizontal: 12, minHeight: 48, fontSize: 15, color: c.text, backgroundColor: '#fff' }, // a background also removes Android's own underline
  barWrap: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: c.line },
  chip: { backgroundColor: c.accentSoft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipT: { fontSize: 12, fontWeight: '800', color: c.accent },
  savings: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.accentSoft, borderRadius: r.sm, padding: 10, marginTop: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff' },
  undo: { position: 'absolute', left: 12, right: 12, bottom: 92, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1f1f1f', borderRadius: r.md, paddingHorizontal: 16, paddingVertical: 14, elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
});
