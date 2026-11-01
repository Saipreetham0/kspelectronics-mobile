import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NATIVE } from '@/native';
import { Animated, Easing, FlatList, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, AnimatedText } from '@/components/Text';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useIsFocused, useScrollToTop } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadLoc, useLoc } from '@/location';
import LocationSheet from '@/components/LocationSheet';
import ModeToggle from '@/components/ModeToggle';
import { QUICK_TAG, useMode } from '@/mode';
import ProductCard from '@/components/ProductCard';
import BannerCarousel from '@/components/BannerCarousel';
import PromoGrid from '@/components/PromoGrid';
import SuggestList from '@/components/SuggestList';
import { DiwaliFx, DiwaliStrip, diwaliOn } from '@/components/Diwali';
import { FadeIn, Tap } from '@/components/motion';
import { ProductSkeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { decodeHtml } from '@/format';
import { addRecent, clearRecent, getRecent } from '@/recentSearches';
import { useFetch } from '@/useFetch';
import { useScreen } from '@/useScreen';
import { getViewed } from '@/recentlyViewed';
import type { Category, Product } from '@/types';
import { track } from '@/analytics';
import { useTabBarSpace } from '@/tabBarSpace';
import { c, r } from '@/theme';

const HINTS = ['Raspberry Pi', 'Bambu Lab printer', 'Arduino', 'ESP32', 'PLA filament', 'sensors'];

// A product row. Rows lower on the page leave out what an earlier row already shows (`exclude`), and tell Home what they show (`onIds`),
// so a small catalogue doesn't fill six rows with the same few products. `rank` re-orders the list (Top deals: biggest discount first).
function Row({ title, path, refreshKey, all = true, onAll, exclude, onIds, rank, max = 10 }: {
  title: string; path: string; refreshKey: number; all?: boolean; onAll?: () => void; exclude?: number[]; onIds?: (ids: number[]) => void; rank?: (p: Product[]) => Product[]; max?: number;
}) {
  const { data, loading, error, reload } = useFetch<Product[]>(`${path}${path.includes('?') ? '&' : '?'}k=${refreshKey}`);
  const { width } = useScreen();
  const cardW = Math.round(Math.max(128, Math.min(180, (width - 22) / 2.4))); // about two and a half cards across, so the next one peeks in
  const skip = new Set(exclude ?? []);
  const shown = data ? (rank ? rank(data) : data).filter((p) => !skip.has(p.id)).slice(0, max) : null;
  const key = shown?.map((p) => p.id).join(',') ?? '';
  useEffect(() => { if (shown) onIds?.(shown.map((p) => p.id)); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!loading && (shown?.length ?? 0) < 2 && !error) return null; // one lone card reads as a mistake
  return (
    <View style={{ marginTop: 22 }}>
      <View style={s.rowHead}>
        <Text style={s.h}>{title}</Text>
        {all && <Pressable onPress={onAll ?? (() => router.push('/(tabs)/shop'))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={`See all ${title}`}><Text style={s.more}>See all</Text></Pressable>}
      </View>
      {error && !data ? (
        <View style={{ paddingHorizontal: 16 }}><Text style={{ color: c.muted, marginBottom: 8 }}>Couldn't load this right now.</Text><Button title="Try again" variant="outline" onPress={reload} /></View>
      ) : loading && !data ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 11 }}>{[0, 1, 2].map((n) => <ProductSkeleton key={n} width={cardW} />)}</View>
      ) : (
        <FlatList horizontal data={shown ?? []} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 11 }}
          renderItem={({ item, index }) => <ProductCard product={item} width={cardW} index={index} />} />
      )}
    </View>
  );
}

// A row of popular products from the category of the last product the shopper opened.
function MoreLike({ id, refreshKey, exclude, onIds }: { id: number; refreshKey: number; exclude?: number[]; onIds?: (ids: number[]) => void }) {
  const one = useFetch<Product[]>(`/api/catalog/products?include=${id}&per_page=1`); // the light product (~1 KB) names its category
  const cat = one.data?.[0]?.categories?.[0];
  if (!cat) return null;
  return <Row title="More like what you viewed" path={`/api/catalog/products?category=${cat.slug}&orderby=popularity&in_stock=true&per_page=16`} refreshKey={refreshKey} exclude={exclude} onIds={onIds} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } })} />;
}

// Blinkit's row of round icon tabs under the search bar: the top categories, one tap away.
function CategoryTabs({ cats }: { cats: Category[] | null }) {
  const top = (cats ?? []).filter((x) => x.slug !== 'services').slice(0, 10);
  if (!top.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 12 }}>
      {top.map((cat) => (
        <Tap key={cat.id} onPress={() => router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } })} scaleTo={0.92} style={s.tab} accessibilityRole="button" accessibilityLabel={decodeHtml(cat.name)}>
          <View style={s.tabImg}>{cat.image?.src ? <Image source={cat.image.src} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Ionicons name="apps" size={20} color={c.accent} />}</View>
          <Text numberOfLines={2} style={s.tabName}>{decodeHtml(cat.name)}</Text>
        </Tap>
      ))}
      <Tap onPress={() => router.push('/(tabs)/shop')} scaleTo={0.92} style={s.tab} accessibilityRole="button" accessibilityLabel="All categories">
        <View style={[s.tabImg, { backgroundColor: c.accentSoft }]}><Ionicons name="grid" size={22} color={c.accent} /></View>
        <Text numberOfLines={2} style={[s.tabName, { color: c.accent }]}>All categories</Text>
      </Tap>
    </ScrollView>
  );
}

// Biggest discount first (Top deals), so the row leads with its best offer.
const offOf = (p: Product) => { const was = Number(p.prices.regular_price), now = Number(p.prices.price); return was > now && now > 0 ? (was - now) / was : 0; };
const byDiscount = (rows: Product[]) => [...rows].sort((a, b) => offOf(b) - offOf(a));

// Price shortcuts, Blinkit's "Starting at ₹19" idea: the cheap end of the catalogue in one tap, which is where add-on and impulse buys come from.
const BANDS: [string, string][] = [['Under ₹99', ':99'], ['Under ₹499', ':499'], ['Under ₹999', ':999'], ['Under ₹1,999', ':1999']];
function PriceBands() {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={s.rowHead}><Text style={s.h}>Shop by budget</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
        {BANDS.map(([label, price]) => (
          <Tap key={price} onPress={() => { track('banner_tap', { id: `price${price}` }); router.push({ pathname: '/(tabs)/shop', params: { list: '1', price, sort: 'price:asc' } }); }} scaleTo={0.95} style={s.band} accessibilityRole="button" accessibilityLabel={`Products ${label.toLowerCase()}`}>
            <Text style={s.bandLead}>Under</Text>
            <Text style={s.bandHot}>{label.replace('Under ', '')}</Text>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

// Shop by brand (Swiggy's "Featured favourites"): the brands KSP stocks in depth, as round badges in each brand's colour.
// Slugs are WooCommerce brand slugs, each checked to have products; a brand with only one or two products isn't worth a badge.
const BRANDS: { slug: string; name: string; bg: string }[] = [
  { slug: 'bambu-lab', name: 'Bambu Lab', bg: '#00ae42' },
  { slug: 'raspberry-pi', name: 'Raspberry Pi', bg: '#c51a4a' },
  { slug: 'creality', name: 'Creality', bg: '#1d1d1b' },
  { slug: 'elegoo', name: 'Elegoo', bg: '#1f4fa3' },
  { slug: 'espressif', name: 'Espressif', bg: '#e7352c' },
  { slug: 'arduino', name: 'Arduino', bg: '#00979c' },
];
function ShopByBrand() {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={s.rowHead}><Text style={s.h}>Shop by brand</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 14 }}>
        {BRANDS.map((b) => (
          <Tap key={b.slug} onPress={() => { track('banner_tap', { id: `brand-${b.slug}` }); router.push({ pathname: '/(tabs)/shop', params: { brand: b.slug, brandName: b.name } }); }} scaleTo={0.93} accessibilityRole="button" accessibilityLabel={`${b.name} products`}>
            <View style={[s.brand, { backgroundColor: b.bg }]}>
              <Text style={s.brandT} numberOfLines={2} adjustsFontSizeToFit>{b.name.split(' ').join('\n')}</Text>
            </View>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

// The rows on Home, top to bottom: each leaves out products an earlier row already shows.
const ROWS = ['viewed', 'deals', 'like', 'bambu', 'best', 'new'] as const;

export default function Home() {
  const festive = diwaliOn();
  const [q, setQ] = useState('');
  const [hint, setHint] = useState(0);
  const [pin, setPin] = useState('');
  const { mode, quickOk } = useMode();
  const quick = mode === 'quick' ? `&tag=${QUICK_TAG}` : ''; // Quick shows only what a rider can bring
  const loc = useLoc() ?? null; // shared: changing the location anywhere (cart, checkout, shop) shows here at once
  const isFocused = useIsFocused();
  const [pinOpen, setPinOpen] = useState(false);
  const tabPad = useTabBarSpace() + 90; // room for the floating tab bar and the cart pill above it
  const top = React.useRef(null); useScrollToTop(top as never); // tapping this tab again scrolls back to the top
  const { width } = useScreen();
  const [topFull, setTopFull] = useState(56); // the folding header block's real height, measured, so wrapped text is never clipped
  const etaSize = Math.round(Math.max(15, Math.min(18, width * 0.046)));
  const [key, setKey] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [viewed, setViewed] = useState<number[]>([]); // products opened lately, newest first
  const searchMode = focused || q.length > 0; // Blinkit-style: while searching, the search bar takes over the top of the screen
  const [refreshing, setRefreshing] = useState(false);
  const cats = useFetch<Category[]>('/api/catalog/categories');
  const [rowIds, setRowIds] = useState<Record<string, number[]>>({});
  const before = (row: (typeof ROWS)[number]) => ROWS.slice(0, ROWS.indexOf(row)).flatMap((k) => rowIds[k] ?? []);
  const report = (row: string) => (ids: number[]) => setRowIds((m) => (m[row]?.join(',') === ids.join(',') ? m : { ...m, [row]: ids }));
  // Rows below the first screen wait until the page has settled (or the shopper scrolls), so opening Home asks the store for less at once.
  const [later, setLater] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLater(true), 1500); return () => clearTimeout(t); }, []);
  const fade = React.useRef(new Animated.Value(1)).current;
  const slide = React.useRef(new Animated.Value(0)).current;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // The top block (logo + delivery line) folds away on scroll while the search bar stays pinned. Nothing here animates a size: the header slides up (a transform), the
  // page slides with it, and the page is made taller by the same amount (see below), so the whole fold runs on the native thread instead of re-laying out on every scroll frame.
  // Opening the search is the same move: the block folds away, the search icon turns into a back arrow, and the border takes the brand colour.
  const searchP = React.useRef(new Animated.Value(0)).current; // native: the slide
  const borderP = React.useRef(new Animated.Value(0)).current; // JS: a colour can't be driven natively
  useEffect(() => {
    const cfg = { toValue: searchMode ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic) };
    Animated.timing(searchP, { ...cfg, useNativeDriver: NATIVE }).start();
    Animated.timing(borderP, { ...cfg, useNativeDriver: false }).start();
  }, [searchMode, searchP, borderP]);
  const { lift, topO, notSearch } = useMemo(() => {
    const scrolled = scrollY.interpolate({ inputRange: [0, 70], outputRange: [0, topFull], extrapolate: 'clamp' });
    const notSearch = searchP.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const toFull = Animated.multiply(Animated.subtract(topFull, scrolled), searchP); // searching folds whatever is left
    return {
      lift: Animated.multiply(Animated.add(scrolled, toFull), -1),
      topO: Animated.multiply(scrollY.interpolate({ inputRange: [0, 45], outputRange: [1, 0], extrapolate: 'clamp' }), notSearch),
      notSearch,
    };
  }, [scrollY, searchP, topFull]);
  const barBorder = borderP.interpolate({ inputRange: [0, 1], outputRange: [c.line, c.accent] });
  const barH = width < 340 ? 44 : width < 400 ? 48 : 52; // the bar scales with the phone
  const barFont = width < 340 ? 14 : 15;

  // Reload on focus: searches made in the Shop tab, products opened, and a location changed elsewhere show up when the shopper comes back.
  useFocusEffect(useCallback(() => { loadLoc().then((l) => setPin(l.pin)).catch(() => {}); getRecent().then(setRecent); getViewed().then(setViewed); }, []));
  // The search hint rotates ("Search "Raspberry Pi"") with a soft fade.
  useEffect(() => {
    if (!isFocused || searchMode) return; // no timers while another tab or the search is showing
    const t = setInterval(() => {
      Animated.parallel([Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: NATIVE }), Animated.timing(slide, { toValue: -12, duration: 180, useNativeDriver: NATIVE })]).start(() => {
        setHint((h) => (h + 1) % HINTS.length);
        slide.setValue(12);
        Animated.parallel([Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: NATIVE }), Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: NATIVE })]).start();
      });
    }, 2600);
    return () => clearInterval(t);
  }, [fade, slide, isFocused, searchMode]);

  const go = (term: string) => { track('search'); setQ(''); addRecent(term).then(setRecent); router.push({ pathname: '/(tabs)/shop', params: { search: term } }); };
  const search = () => { if (q.trim()) go(q.trim()); };
  // The spinner stays until the categories, location and lists have really been read again (the product rows reload alongside through the key).
  const refresh = async () => {
    setRefreshing(true); setKey((k) => k + 1);
    await Promise.allSettled([cats.reload(), loadLoc().then((l) => setPin(l.pin)), getRecent().then(setRecent), getViewed().then(setViewed), new Promise((res) => setTimeout(res, 500))]);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Animated.View style={{ zIndex: 2, transform: [{ translateY: lift }] }}>
      <LinearGradient colors={festive ? ['#ffd9a0', '#fff0d6', '#ffffff'] : [c.heroTop, c.accentTint, '#ffffff']} style={s.head}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={{ opacity: topO }} pointerEvents={searchMode ? 'none' : 'auto'}>
          <View onLayout={(e) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h > 0 && h !== topFull) setTopFull(h); }}>
          <View style={s.topRow}>
          <Pressable style={s.loc} onPress={() => setPinOpen(true)} accessibilityRole="button" accessibilityLabel="Change delivery pincode">
            <View style={{ flex: 1 }}>
              {/* The promise follows the saved place: same-day only around Hyderabad, otherwise the city we ship to. */}
              <Text style={[s.eta, { fontSize: etaSize }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {!loc && !pin ? 'Where should we deliver?' : mode === 'quick' ? 'Quick delivery by rider' : loc ? `We deliver to ${loc.city}` : 'Delivery to your pincode'}
              </Text>
              <Text style={s.where} numberOfLines={1}>
                {loc ? `${loc.area}, ${loc.city} · ${loc.pin}` : pin ? `Delivering to ${pin}` : 'Set delivery location'} <Ionicons name="chevron-down" size={14} />
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/account')} style={s.avatar} accessibilityRole="button" accessibilityLabel="Account"><Ionicons name="person" size={20} color={c.text} /></Pressable>
          </View>
          {quickOk && <ModeToggle />}
          </View>
          </Animated.View>
          <Animated.View style={[s.search, { minHeight: barH, borderColor: barBorder }]}>
            <View style={{ width: 22, height: 22 }}>
              <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: notSearch }}><Ionicons name="search" size={22} color={c.muted} /></Animated.View>
              <Animated.View pointerEvents={searchMode ? 'auto' : 'none'} style={{ position: 'absolute', opacity: searchP }}>
                <Pressable onPress={() => { setQ(''); Keyboard.dismiss(); setFocused(false); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>
              </Animated.View>
            </View>
            <TextInput style={[s.input, { height: barH - 2, fontSize: barFont }]} value={q} onChangeText={setQ} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={search} returnKeyType="search" accessibilityLabel="Search products" />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={20} color={c.muted} /></Pressable> : null}
            {!q && <AnimatedText pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" numberOfLines={1} style={[s.hint, { fontSize: barFont, opacity: fade, transform: [{ translateY: slide }] }]}>Search "{HINTS[hint]}"</AnimatedText>}
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
      </Animated.View>

      {/* Slides up with the header and is topFull taller, so no gap opens when the header folds. */}
      <Animated.View style={{ flex: 1, marginBottom: -topFull, transform: [{ translateY: lift }] }}>
      <Animated.ScrollView ref={top} onScrollBeginDrag={() => setLater(true)} scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE })} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.loader} />} contentContainerStyle={{ paddingBottom: tabPad + topFull }} showsVerticalScrollIndicator={false}>
        {festive && <DiwaliStrip />}
        <CategoryTabs cats={cats.data} />
        <BannerCarousel cats={cats.data} active={isFocused && !searchMode} />
        <PromoGrid cats={cats.data} />

        {Boolean(cats.error) && !cats.data && <View style={{ padding: 16 }}><Text style={{ color: c.muted, marginBottom: 10 }}>{cats.error}</Text><Button title="Try again" variant="outline" onPress={cats.reload} /></View>}

        {viewed.length > 0 && <Row title="Recently viewed" all={false} path={`/api/catalog/products?include=${viewed.join(',')}&per_page=12`} refreshKey={key} onIds={report('viewed')} />}
        <Row title={festive ? 'Diwali top deals' : 'Top deals'} path={`/api/catalog/products?on_sale=true&in_stock=true&per_page=30${quick}`} rank={byDiscount} refreshKey={key} exclude={before('deals')} onIds={report('deals')} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1', onsale: '1' } })} />
        <PriceBands />
        <ShopByBrand />
        {later && (<>
          {viewed.length > 0 && <MoreLike id={viewed[0]} refreshKey={key} exclude={before('like')} onIds={report('like')} />}
          <Row title="Bambu Lab" path="/api/catalog/products?brand=bambu-lab&in_stock=true&orderby=popularity&per_page=16" refreshKey={key} exclude={before('bambu')} onIds={report('bambu')} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { brand: 'bambu-lab', brandName: 'Bambu Lab' } })} />
          <Row title="Best sellers" path={`/api/catalog/products?orderby=popularity&in_stock=true&per_page=16${quick}`} refreshKey={key} exclude={before('best')} onIds={report('best')} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1', sort: 'popularity' } })} />
          <Row title="New arrivals" path={`/api/catalog/products?orderby=date&in_stock=true&per_page=16${quick}`} refreshKey={key} exclude={before('new')} onIds={report('new')} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1', sort: 'date' } })} />
        </>)}
      </Animated.ScrollView>
      {/* Search opened but nothing typed yet: recent searches and popular ones, as on Blinkit. */}
      {searchMode && q.trim().length < 2 && (
        <FadeIn style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]}><ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: tabPad }}>
          {recent.length > 0 && (<>
            <View style={s.recentHead}><Text style={s.recentT}>Recent searches</Text><Pressable onPress={() => { clearRecent(); setRecent([]); }} hitSlop={8} accessibilityLabel="Clear recent searches"><Text style={s.more}>clear</Text></Pressable></View>
            {recent.map((t) => (
              <Pressable key={t} onPress={() => go(t)} style={s.recentRow} accessibilityRole="button" accessibilityLabel={`Search ${t}`}>
                <Ionicons name="time-outline" size={18} color={c.muted} /><Text style={{ flex: 1, fontSize: 15 }}>{t}</Text><Ionicons name="arrow-up-outline" size={16} color={c.muted} style={{ transform: [{ rotate: '-45deg' }] }} />
              </Pressable>
            ))}
          </>)}
          <Text style={[s.recentT, { marginTop: recent.length ? 22 : 0, marginBottom: 10 }]}>Popular searches</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HINTS.map((t) => (
              <Pressable key={t} onPress={() => go(t)} style={s.chip} accessibilityRole="button" accessibilityLabel={`Search ${t}`}><Ionicons name="trending-up" size={14} color={c.muted} /><Text style={s.chipT}>{t}</Text></Pressable>
            ))}
          </View>
        </ScrollView></FadeIn>
      )}
      {/* While typing, the suggestions (with photos) cover the page below the search bar. */}
      {q.trim().length >= 2 && (
        <FadeIn style={StyleSheet.absoluteFill}>
          <SuggestList text={q}
            onProduct={(slug) => { setQ(''); router.push(`/product/${slug}`); }}
            onCategory={(slug) => { setQ(''); router.push({ pathname: '/(tabs)/shop', params: { category: slug } }); }}
            onSearch={(t) => go(t)} />
        </FadeIn>
      )}
      </Animated.View>

      <LocationSheet visible={pinOpen} onClose={() => setPinOpen(false)} onChange={(l) => setPin(l.pin)} />
      {festive && !searchMode && <DiwaliFx area={150} />}
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6 },
  loc: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  tab: { width: 88, alignItems: 'center', paddingHorizontal: 2 },
  tabImg: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  tabName: { fontSize: 11, textAlign: 'center', marginTop: 5, color: c.text, fontWeight: '600', lineHeight: 13 },
  eta: { fontSize: 20, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
  where: { fontSize: 13, color: c.text2, marginTop: 2, fontWeight: '600' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: r.lg, paddingHorizontal: 14, minHeight: 50, marginTop: 10, borderWidth: 1, borderColor: c.line },
  input: { flex: 1, fontSize: 15, color: c.text, height: 50 },
  hint: { position: 'absolute', left: 48, right: 44, color: c.muted, fontSize: 15 },
  h: { fontSize: 17, fontWeight: '800', color: c.text },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, marginBottom: 8 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  recentT: { fontSize: 13, fontWeight: '800', color: c.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surface, borderRadius: r.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipT: { fontSize: 13, color: c.text, fontWeight: '600' },
  more: { color: c.accent, fontWeight: '800', fontSize: 13 },
  brand: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  brandT: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 14 },
  band: { flexDirection: 'row', alignItems: 'center', borderRadius: r.pill, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', overflow: 'hidden' },
  bandLead: { fontSize: 13, fontWeight: '600', color: c.text2, paddingLeft: 14, paddingRight: 6, paddingVertical: 9 },
  bandHot: { fontSize: 13, fontWeight: '800', color: '#fff', backgroundColor: c.accent, paddingHorizontal: 12, paddingVertical: 9 },
});
