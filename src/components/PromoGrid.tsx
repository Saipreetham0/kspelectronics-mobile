import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Truck } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Reveal, Tap } from './motion';
import { diwaliOn } from './Diwali';
import { useFetch } from '@/useFetch';
import { useScreen } from '@/useScreen';
import { useStore } from '@/store';
import { decodeHtml, inr } from '@/format';
import { track } from '@/analytics';
import type { Category, Product } from '@/types';
import { c, r } from '@/theme';

// The categories the grid features, first one in the tall tile. Any that the store doesn't have are filled from the rest of the list.
const PICKS = ['3d-printers-and-parts', 'raspberry-pi', 'development-boards', 'sensors-modules', 'engineering-projects'];
const GAP = 10;

// The price hook on a tile, from the category's own products (cheapest first): "Up to N% OFF" when some are discounted by 10% or more, otherwise "From ₹X".
// Only what the store really sells is quoted, so the hook is always true.
export function dealOf(rows: Pick<Product, 'prices'>[] | null | undefined): { off: number; from: number } | null {
  if (!rows?.length) return null;
  let off = 0, from = Infinity;
  for (const p of rows) {
    const m = p.prices.currency_minor_unit, now = Number(p.prices.price), was = Number(p.prices.regular_price);
    if (now > 0) from = Math.min(from, now / 10 ** m);
    if (was > now && now > 0) off = Math.max(off, Math.round(((was - now) / was) * 100));
  }
  return from === Infinity ? null : { off, from };
}

function Tile({ cat, width, height, tall }: { cat: Category; width: number; height: number; tall?: boolean }) {
  const rows = useFetch<Product[]>(`/api/catalog/products?category=${cat.slug}&orderby=price&order=asc&in_stock=true&per_page=20`);
  const deal = dealOf(rows.data);
  const name = decodeHtml(cat.name);
  const open = () => { track('banner_tap', { id: cat.slug }); router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } }); };
  const hook = deal ? (deal.off >= 10 ? { lead: 'Up to', hot: `${deal.off}% OFF` } : { lead: 'From', hot: inr(deal.from) }) : null;
  return (
    <View style={{ width, height }}>{/* Tap styles its inner view, so the tile's size is set here */}
      <Tap onPress={open} scaleTo={0.97} fill style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={hook ? `${name}, ${hook.lead} ${hook.hot}` : name}>
        <View style={s.tile}>{/* white, so the category photos (white backgrounds) blend in instead of sitting in boxes */}
          {hook ? (
            <View style={s.pill}>
              <Text style={s.pillLead}>{hook.lead}</Text>
              <Text style={s.pillHot}>{hook.hot}</Text>
            </View>
          ) : <View style={[s.pill, { opacity: 0 }]}><Text style={s.pillLead}> </Text></View>}
          <Text style={[s.name, tall && s.nameTall]} numberOfLines={2}>{name}</Text>
          {cat.image?.src ? <Image source={cat.image.src} style={s.img} contentFit="contain" transition={200} /> : <View style={{ flex: 1 }} />}
          {tall ? <Text style={s.cta}>Shop now</Text> : null}
        </View>
      </Tap>
    </View>
  );
}

// Blinkit's home promo block: one tall tile and a 2 × 2 grid on a soft band, each tile a category with a real price hook.
export default function PromoGrid({ cats }: { cats: Category[] | null }) {
  const { width } = useScreen();
  const { itemCount } = useStore();
  const ship = useFetch<{ min: number | null }>('/api/cart/free-shipping');
  if (!cats?.length) return null;
  const withPhoto = cats.filter((x) => x.image?.src);
  const chosen = PICKS.map((slug) => withPhoto.find((x) => x.slug === slug)).filter((x): x is Category => Boolean(x));
  for (const x of withPhoto) if (chosen.length < 5 && !chosen.includes(x)) chosen.push(x);
  if (chosen.length < 5) return null;

  const festive = diwaliOn();
  const inner = width - 24;
  const col = Math.floor((inner - GAP * 2) / 3);
  const small = Math.round(col * 1.08);
  const [hero, ...rest] = chosen;
  return (
    <Reveal index={0}>
      <LinearGradient colors={festive ? ['#fff1d6', '#ffffff'] : [c.accentTint, '#ffffff']} style={s.band}>
        <View style={s.head}>
          <Text style={s.h}>{festive ? 'Diwali deals' : 'Deals on bestsellers'}</Text>
          <Text style={s.all} onPress={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1', onsale: '1' } })} accessibilityRole="link">See all</Text>
        </View>
        {ship.data?.min && itemCount === 0 ? (
          <View style={s.ship}><Truck size={16} weight="fill" color={c.success} /><Text style={s.shipT}>Free delivery on orders over {inr(ship.data.min)}</Text></View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: GAP }}>
          <Tile cat={hero} width={col} height={small * 2 + GAP} tall />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {rest.map((x) => <Tile key={x.slug} cat={x} width={col} height={small} />)}
          </View>
        </View>
      </LinearGradient>
    </Reveal>
  );
}

const s = StyleSheet.create({
  band: { marginTop: 14, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  h: { fontSize: 17, fontWeight: '800', color: c.text },
  all: { fontSize: 13, fontWeight: '800', color: c.accent },
  ship: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  shipT: { fontSize: 12, fontWeight: '600', color: c.success },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: r.lg, borderWidth: 1, borderColor: c.line, padding: 8, alignItems: 'center', overflow: 'hidden' },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: r.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, overflow: 'hidden' },
  pillLead: { fontSize: 11, fontWeight: '600', color: c.text2, paddingLeft: 7, paddingRight: 4, paddingVertical: 2 },
  pillHot: { fontSize: 11, fontWeight: '800', color: '#fff', backgroundColor: c.accent, paddingHorizontal: 6, paddingVertical: 2 },
  name: { fontSize: 12, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: 6, lineHeight: 15 },
  nameTall: { fontSize: 15, lineHeight: 19, marginTop: 10 },
  img: { flex: 1, width: '100%', marginTop: 4 },
  cta: { fontSize: 12, fontWeight: '800', color: '#fff', backgroundColor: c.accent, borderRadius: r.pill, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden', marginTop: 6 },
});
