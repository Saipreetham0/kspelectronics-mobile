import React, { useCallback, useState } from 'react';
import { Alert, FlatList, LayoutAnimation, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { isHyderabad, loadLoc } from '@/location';
import type { Loc } from '@/location';
import { useWishlist } from '@/wishlist';
import LocationSheet from '@/components/LocationSheet';
import { Button, Card, Center, Spinner } from '@/components/ui';
import { decodeHtml, minorToInr, withTax } from '@/format';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store';
import { api } from '@/api';
import { useFetch } from '@/useFetch';
import type { Cart, Product } from '@/types';
import { c, r } from '@/theme';

export default function CartScreen() {
  const { cart, cartToken, setCart, ready, busy, itemCount, refresh, updateItem, removeItem, applyCoupon, removeCoupon } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const freeShip = useFetch<{ min: number | null }>('/api/cart/free-shipping'); // the store's real free-shipping amount, if it has one
  const [code, setCode] = useState('');
  const [loc, setLoc] = useState<Loc | null>(null);
  const [pinOpen, setPinOpen] = useState(false); // the same "Select delivery location" sheet as Home, right here in the cart
  const { has, toggle } = useWishlist();
  useFocusEffect(useCallback(() => { loadLoc().then((l) => setLoc(l.loc)).catch(() => {}); refresh(); }, [refresh])); // also pick up changes made elsewhere
  const popular = useFetch<Product[]>('/api/catalog/products?orderby=popularity&per_page=12'); // hook stays above the early returns
  if (!ready) return <Spinner />;
  const items = cart?.items ?? [];
  if (!items.length) {
    return (
      <Center>
        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Your cart is empty</Text>
        <Text style={{ color: c.muted, marginBottom: 18 }}>Add something to get started.</Text>
        <Button title="Start shopping" onPress={() => router.push('/(tabs)/shop')} />
      </Center>
    );
  }
  const t = cart!.totals; const m = t.currency_minor_unit;
  const subtotal = withTax(t.total_items, t.total_items_tax) / 10 ** m; // with GST: the amount the free-shipping rule counts and the shopper recognises
  const FREE_SHIPPING = freeShip.data?.min ?? null;
  const left = FREE_SHIPPING == null ? null : FREE_SHIPPING - subtotal;
  // Blinkit's "you're saving" banner: sale markdowns plus any coupon discount.
  const saved = (items.reduce((n, i) => n + Math.max(0, Number(i.prices.regular_price) - Number(i.prices.price)) * i.quantity, 0) + withTax(t.total_discount, t.total_discount_tax)) / 10 ** m;
  // WooCommerce keeps the shipping from the last address that was quoted (at checkout), and the total already includes it: show it, so the rows add up to the total.
  const shipKnown = t.total_shipping != null && t.total_shipping !== '';
  const shipping = withTax(t.total_shipping, t.total_shipping_tax);
  const inCart = new Set(items.map((i) => i.id));
  const more = (popular.data ?? []).filter((p) => !inCart.has(p.id) && p.is_in_stock).slice(0, 8);
  const act = (fn: () => Promise<void>) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); return fn().catch((e: Error) => Alert.alert('Cart', e.message)); };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <FlatList data={items} keyExtractor={(i) => i.key} contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} tintColor={c.loader} />}
        ListHeaderComponent={
          <>
            <Card>
              <Text style={{ fontSize: 17, fontWeight: '900', color: c.text }}>{!loc || isHyderabad(loc) ? 'Same-day delivery in Hyderabad' : `Delivery to ${loc.city}`}</Text>
              <Pressable onPress={() => setPinOpen(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Change delivery location" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={{ flex: 1, color: '#444', fontSize: 13 }} numberOfLines={2}>{loc ? `${loc.area}, ${loc.city} · ${loc.pin}` : 'Set your delivery location'}</Text>
                <Text style={{ color: c.accent, fontWeight: '800', fontSize: 13 }}>{loc ? 'Change' : 'Set'}</Text>
              </Pressable>
              <Text style={{ color: c.muted, marginTop: 6 }}>Shipment of {itemCount} item{itemCount > 1 ? 's' : ''}</Text>
            </Card>
            {FREE_SHIPPING != null && left != null && (
              <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
                <Text style={{ fontWeight: '700', color: c.accent }}>{left > 0 ? `Add ${minorToInr(left * 10 ** m, m)} more for free shipping` : '🎉 You get free shipping'}</Text>
                <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }]} /></View>
              </Card>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={item.images[0]?.thumbnail || item.images[0]?.src} style={s.img} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={s.name}>{decodeHtml(item.name)}</Text>
              {item.variation?.length ? <Text style={s.var}>{item.variation.map((v) => v.value).join(' / ')}</Text> : null}
              <Text style={s.price}>{minorToInr(withTax(item.totals.line_total, item.totals.line_total_tax), item.totals.currency_minor_unit)}</Text>
              <View style={s.ctl}>
                <View style={s.qty}>
                  <Pressable onPress={() => item.quantity > 1 ? act(() => updateItem(item.key, item.quantity - 1)) : act(() => removeItem(item.key))} style={s.qb} accessibilityRole="button" accessibilityLabel="Decrease quantity"><Text style={s.qt}>−</Text></Pressable>
                  <Text style={[s.qt, { minWidth: 26, textAlign: 'center' }]}>{item.quantity}</Text>
                  <Pressable onPress={() => act(() => updateItem(item.key, item.quantity + 1))} disabled={item.quantity >= (item.quantity_limits?.maximum ?? Infinity)} style={[s.qb, item.quantity >= (item.quantity_limits?.maximum ?? Infinity) && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Increase quantity"><Text style={s.qt}>+</Text></Pressable>
                </View>
                <Pressable onPress={() => act(async () => { await removeItem(item.key); if (!has(item.id)) toggle(item.id); })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Move to wishlist"><Text style={{ color: c.muted, fontWeight: '600', textDecorationLine: 'underline' }}>Move to wishlist</Text></Pressable>
              </View>
            </View>
          </Card>
        )}
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
              {cart!.coupons.map((cp) => (
                <View key={cp.code} style={s.coupon}><Text style={{ fontWeight: '700', color: c.success }}>{cp.code.toUpperCase()} applied</Text><Pressable onPress={() => act(() => removeCoupon(cp.code))}><Text style={{ color: c.danger }}>Remove</Text></Pressable></View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={s.input} placeholder="Coupon code" autoCapitalize="characters" value={code} onChangeText={setCode} />
                <Button title="Apply" variant="outline" disabled={!code.trim()} onPress={() => act(async () => { await applyCoupon(code.trim()); setCode(''); })} />
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
      <View style={s.barWrap}>
        <View style={s.addr}>
          <Text style={{ flex: 1, fontSize: 13, color: '#444' }} numberOfLines={1}>
            <Text style={{ fontWeight: '800' }}>Delivering to </Text>{loc ? `${loc.area}, ${loc.city} · ${loc.pin}` : 'set your location'}
          </Text>
          <Pressable onPress={() => setPinOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change delivery location"><Text style={{ color: c.accent, fontWeight: '800', fontSize: 13 }}>Change</Text></Pressable>
        </View>
        <View style={s.bar}>
          <View><Text style={{ color: c.muted, fontSize: 12 }}>Estimated total</Text><Text style={{ fontSize: 20, fontWeight: '900' }}>{minorToInr(t.total_price, m)}</Text></View>
          <Button title="Proceed to checkout" loading={busy} style={{ flex: 1, marginLeft: 16 }} onPress={() => router.push('/checkout')} />
        </View>
      </View>
      <LocationSheet visible={pinOpen} onClose={() => setPinOpen(false)} onChange={(l) => {
        setLoc(l);
        // Quote delivery for the new place right away, so the Delivery row and the total match it (not the address quoted last time).
        if (cartToken && /^\d{6}$/.test(l.pin)) api<Cart>('/api/cart/shipping', { method: 'POST', body: { token: cartToken, state: l.stateCode, postcode: l.pin, city: l.city } }).then(setCart).catch(() => refresh());
        else refresh();
      }} />
    </View>
  );
}

const Row = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><Text style={{ color: color ?? '#555' }}>{k}</Text><Text style={{ fontWeight: '600', color: color ?? c.text }}>{v}</Text></View>
);

const s = StyleSheet.create({
  saved: { backgroundColor: c.greenSoft, borderRadius: r.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10 },
  savedT: { color: c.greenDark, fontWeight: '800', fontSize: 13 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#fff', marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: c.accent },
  img: { width: 84, height: 84, borderRadius: r.sm, backgroundColor: c.surface },
  name: { fontSize: 14, fontWeight: '600', color: c.text },
  var: { fontSize: 12, color: c.muted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  ctl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: r.sm },
  qb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qt: { fontSize: 16, fontWeight: '700', color: c.text },
  h: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  coupon: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: r.md, paddingHorizontal: 12, minHeight: 48, fontSize: 15 },
  barWrap: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: c.line },
  addr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10 },
  chip: { backgroundColor: c.accentSoft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipT: { fontSize: 12, fontWeight: '800', color: c.accent },
  savings: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.accentSoft, borderRadius: r.sm, padding: 10, marginTop: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff' },
});
