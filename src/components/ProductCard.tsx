import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Clock, Heart, Star } from 'phosphor-react-native';
import type { Product } from '@/types';
import { decodeHtml, minorToInr } from '@/format';
import { useWishlist } from '@/wishlist';
import { useBought } from '@/bought';
import { useMode } from '@/mode';
import AddButton from './AddButton';
import { Pop, Reveal, Tap } from './motion';
import { c, r } from '@/theme';

export const priceOf = (p: Product) => {
  const m = p.prices.currency_minor_unit;
  if (p.prices.price_range) return { now: `From ${minorToInr(p.prices.price_range.min_amount, m)}`, was: '', off: 0 };
  const reg = Number(p.prices.regular_price), now = Number(p.prices.price);
  const sale = reg > now;
  return { now: minorToInr(now, m), was: sale ? minorToInr(reg, m) : '', off: sale ? Math.round(((reg - now) / reg) * 100) : 0 };
};

// Blinkit-style card: image with a wishlist heart, an option hint beside a compact "+" control, bold price with the MRP struck through,
// a coloured "% OFF" line, the name and the delivery time.
export default function ProductCard({ product: p, width, index = 0 }: { product: Product; width?: number; index?: number }) {
  const { now, was, off } = priceOf(p);
  const { has, toggle } = useWishlist();
  const saved = has(p.id);
  const bought = useBought().has(p.id);
  const sameDay = useMode().mode === 'quick'; // "Same-day" is promised only in Quick mode, where a rider brings it
  // WooCommerce reports the remaining stock once it is low; 0 is ignored (it also shows up on items that can still be ordered).
  const left = p.is_in_stock && p.low_stock_remaining && p.low_stock_remaining > 0 && p.low_stock_remaining <= 5 ? p.low_stock_remaining : 0;
  const hint = p.variations.length ? `${p.variations.length} options` : p.has_options ? 'Options' : '';
  // The "+" control and the heart are siblings of the tappable area, not children: nested buttons are invalid on web.
  return (
    <Reveal index={index} style={[s.card, width ? { width } : { flex: 1 }]}>
      <Tap onPress={() => router.push(`/product/${p.slug}`)} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={decodeHtml(p.name)}>
        <Image source={p.images[0]?.thumbnail || p.images[0]?.src} style={s.img} contentFit="contain" transition={200} />
      </Tap>
      <Pressable onPress={() => toggle(p.id)} hitSlop={8} style={s.heart} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}>
        <Pop on={saved}><Heart size={18} weight={saved ? 'fill' : 'regular'} color={saved ? c.danger : '#9aa0a6'} /></Pop>
      </Pressable>
      {bought && <View style={s.bought} pointerEvents="none"><Text style={s.boughtT}>Bought earlier</Text></View>}
      <View style={s.foot}>
        <Text style={s.hint} numberOfLines={1}>{hint}</Text>
        <AddButton product={p} compact />
      </View>
      <Tap onPress={() => router.push(`/product/${p.slug}`)} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${decodeHtml(p.name)} details`}>
        <View style={s.priceRow}>
          <Text style={s.price} numberOfLines={1}>{now}</Text>
          {was ? <Text style={s.was}>{was}</Text> : null}
        </View>
        {off > 0 && <View style={s.offPill}><Text style={s.off}>{off}% OFF</Text></View>}
        <Text numberOfLines={2} style={s.name}>{decodeHtml(p.name)}</Text>
        {p.review_count > 0 && (
          <View style={s.eta}><Star size={12} weight="fill" color={c.deal} /><Text style={s.etaT}>{Number(p.average_rating).toFixed(1)} ({p.review_count})</Text></View>
        )}
        {(sameDay || left > 0) && (
          <View style={s.eta}>
            {sameDay && <><Clock size={12} weight="fill" color={c.muted} /><Text style={s.etaT}>Same-day</Text></>}
            {left > 0 && <Text style={s.left}>{sameDay ? '· ' : ''}Only {left} left</Text>}
          </View>
        )}
      </Tap>
    </Reveal>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: r.md, borderWidth: 1, borderColor: c.line, padding: 8, margin: 5 },
  img: { width: '100%', aspectRatio: 1, backgroundColor: c.surface, borderRadius: r.sm },
  heart: { position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, minHeight: 36 },
  hint: { flex: 1, fontSize: 12, fontWeight: '600', color: c.muted, marginRight: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  price: { fontSize: 15, fontWeight: '800', color: c.text },
  was: { fontSize: 11, color: c.muted, textDecorationLine: 'line-through' },
  offPill: { alignSelf: 'flex-start', backgroundColor: c.dealSoft, borderRadius: r.sm, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  off: { fontSize: 11, fontWeight: '800', color: c.dealText },
  name: { fontSize: 13, color: c.text, marginTop: 4, minHeight: 34, fontWeight: '600', lineHeight: 17 },
  eta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  etaT: { fontSize: 11, fontWeight: '700', color: c.muted },
  left: { fontSize: 11, fontWeight: '800', color: c.dealText },
  bought: { position: 'absolute', top: 14, left: 14, backgroundColor: c.greenSoft, borderTopLeftRadius: r.sm, borderBottomRightRadius: r.sm, paddingHorizontal: 7, paddingVertical: 3 },
  boughtT: { fontSize: 10, fontWeight: '800', color: c.greenDark },
});
