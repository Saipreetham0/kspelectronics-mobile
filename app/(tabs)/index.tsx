import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NATIVE } from '@/native';
import { Animated, Easing, FlatList, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, AnimatedText } from '@/components/Text';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isHyderabad, loadLoc, useLoc } from '@/location';
import LocationSheet from '@/components/LocationSheet';
import ModeToggle from '@/components/ModeToggle';
import { QUICK_TAG, useMode } from '@/mode';
import ProductCard from '@/components/ProductCard';
import BannerCarousel from '@/components/BannerCarousel';
import SuggestList from '@/components/SuggestList';
import { DiwaliFx, DiwaliStrip, diwaliOn } from '@/components/Diwali';
import { FadeIn, Reveal, Tap } from '@/components/motion';
import { ProductSkeleton, Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { decodeHtml } from '@/format';
import { addRecent, clearRecent, getRecent } from '@/recentSearches';
import { useFetch } from '@/useFetch';
import { useScreen } from '@/useScreen';
import { getViewed } from '@/recentlyViewed';
import type { Category, Product } from '@/types';
import { track } from '@/analytics';
import { c, r } from '@/theme';

const HINTS = ['Raspberry Pi', 'Bambu Lab printer', 'Arduino', 'ESP32', 'PLA filament', 'sensors'];

function Row({ title, path, refreshKey, all = true, onAll }: { title: string; path: string; refreshKey: number; all?: boolean; onAll?: () => void }) {
  const { data, loading, error, reload } = useFetch<Product[]>(`${path}${path.includes('?') ? '&' : '?'}k=${refreshKey}`);
  const { width } = useScreen();
  const cardW = Math.round(Math.max(128, Math.min(180, (width - 22) / 2.4))); // about two and a half cards across, so the next one peeks in
  if (!loading && !data?.length && !error) return null;
  return (
    <View style={{ marginTop: 22 }}>
      <View style={s.rowHead}>
        <Text style={s.h}>{title}</Text>
        {all && <Pressable onPress={onAll ?? (() => router.push('/(tabs)/shop'))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={`See all ${title}`}><Text style={s.more}>see all</Text></Pressable>}
      </View>
      {error && !data ? (
        <View style={{ paddingHorizontal: 16 }}><Text style={{ color: c.muted, marginBottom: 8 }}>Couldn't load this right now.</Text><Button title="Try again" variant="outline" onPress={reload} /></View>
      ) : loading && !data ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 11 }}>{[0, 1, 2].map((n) => <ProductSkeleton key={n} width={cardW} />)}</View>
      ) : (
        <FlatList horizontal data={data ?? []} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 11 }}
          renderItem={({ item, index }) => <ProductCard product={item} width={cardW} index={index} />} />
      )}
    </View>
  );
}

// A row of popular products from the category of the last product the shopper opened.
function MoreLike({ id, refreshKey }: { id: number; refreshKey: number }) {
  const one = useFetch<Product[]>(`/api/catalog/products?include=${id}&per_page=1&lean=0`); // lean=0: the full product, which names its categories
  const cat = one.data?.[0]?.categories?.[0];
  if (!cat) return null;
  return <Row title="More like what you viewed" path={`/api/catalog/products?category=${cat.slug}&orderby=popularity&per_page=10`} refreshKey={refreshKey} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } })} />;
}

export default function Home() {
  const festive = diwaliOn();
  const [q, setQ] = useState('');
  const [hint, setHint] = useState(0);
  const [pin, setPin] = useState('');
  const { mode } = useMode();
  const quick = mode === 'quick' ? `&tag=${QUICK_TAG}` : ''; // Quick shows only what a rider can bring
  const loc = useLoc() ?? null; // shared: changing the location anywhere (cart, checkout, shop) shows here at once
  const isFocused = useIsFocused();
  const [pinOpen, setPinOpen] = useState(false);
  const { width } = useScreen();
  const [topFull, setTopFull] = useState(98); // the folding header block's real height, measured, so wrapped text is never clipped
  const cols = width >= 700 ? 6 : 4;
  const tileImg = Math.round(Math.max(56, Math.min(92, width / cols - 22)));
  const etaSize = Math.round(Math.max(16, Math.min(22, width * 0.053)));
  const [key, setKey] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [viewed, setViewed] = useState<number[]>([]); // products opened lately, newest first
  const searchMode = focused || q.length > 0; // Blinkit-style: while searching, the search bar takes over the top of the screen
  const [refreshing, setRefreshing] = useState(false);
  const cats = useFetch<Category[]>('/api/catalog/categories');
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
      <LinearGradient colors={festive ? ['#ffd9a0', '#fff0d6', '#ffffff'] : ['#d6e5ff', '#ebf2ff', '#ffffff']} style={s.head}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={{ opacity: topO }} pointerEvents={searchMode ? 'none' : 'auto'}>
          <View onLayout={(e) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h > 0 && h !== topFull) setTopFull(h); }}>
          <View style={s.logoRow}>
            <Image source={require('../../assets/ksp-logo.png')} style={s.logo} contentFit="contain" accessibilityLabel="KSP Electronics" />
            <Pressable onPress={() => router.push('/(tabs)/account')} style={s.avatar} accessibilityRole="button" accessibilityLabel="Account"><Ionicons name="person" size={20} color={c.text} /></Pressable>
          </View>
          <Pressable style={s.loc} onPress={() => setPinOpen(true)} accessibilityRole="button" accessibilityLabel="Change delivery pincode">
            <View style={{ flex: 1 }}>
              {/* The promise follows the saved place: same-day only around Hyderabad, otherwise the city we ship to. */}
              <Text style={[s.eta, { fontSize: etaSize }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {!loc && !pin ? 'Where should we deliver?' : mode === 'quick' ? 'Quick delivery by rider' : isHyderabad(loc) ? 'Same-day delivery in Hyderabad' : loc ? `We deliver to ${loc.city}` : 'Delivery to your pincode'}
              </Text>
              <Text style={s.where} numberOfLines={1}>
                {loc ? `${loc.area}, ${loc.city} · ${loc.pin}` : pin ? `Delivering to ${pin}` : 'Set delivery location'} <Ionicons name="chevron-down" size={14} />
              </Text>
            </View>
          </Pressable>
          <ModeToggle />
          </View>
          </Animated.View>
          <Animated.View style={[s.search, { minHeight: barH, borderColor: barBorder }]}>
            <View style={{ width: 22, height: 22 }}>
              <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: notSearch }}><Ionicons name="search" size={22} color="#777" /></Animated.View>
              <Animated.View pointerEvents={searchMode ? 'auto' : 'none'} style={{ position: 'absolute', opacity: searchP }}>
                <Pressable onPress={() => { setQ(''); Keyboard.dismiss(); setFocused(false); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>
              </Animated.View>
            </View>
            <TextInput style={[s.input, { height: barH - 2, fontSize: barFont }]} value={q} onChangeText={setQ} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={search} returnKeyType="search" accessibilityLabel="Search products" />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={20} color="#aaa" /></Pressable> : null}
            {!q && <AnimatedText pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" numberOfLines={1} style={[s.hint, { fontSize: barFont, opacity: fade, transform: [{ translateY: slide }] }]}>Search "{HINTS[hint]}"</AnimatedText>}
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
      </Animated.View>

      {/* Slides up with the header and is topFull taller, so no gap opens when the header folds. */}
      <Animated.View style={{ flex: 1, marginBottom: -topFull, transform: [{ translateY: lift }] }}>
      <Animated.ScrollView scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE })} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.loader} />} contentContainerStyle={{ paddingBottom: 150 + topFull }} showsVerticalScrollIndicator={false}>
        {festive && <DiwaliStrip />}
        <BannerCarousel cats={cats.data} active={isFocused && !searchMode} />

        <Text style={[s.h, { marginHorizontal: 16, marginTop: 24 }]}>Shop by category</Text>
        <View style={s.grid}>
          {cats.loading && !cats.data
            ? Array.from({ length: 8 }).map((_, n) => <View key={n} style={[s.tile, { width: `${100 / cols}%` }]}><Skeleton style={{ width: tileImg, height: tileImg, borderRadius: 16 }} /><Skeleton style={{ width: tileImg * 0.8, height: 10, marginTop: 8 }} /></View>)
            : (cats.data ?? []).map((cat, n) => (
              <Reveal key={cat.id} index={n} style={[s.tile, { width: `${100 / cols}%` }]}>
                <Tap onPress={() => router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } })} scaleTo={0.92} style={{ alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={decodeHtml(cat.name)}>
                  <View style={[s.tileImg, { width: tileImg, height: tileImg }]}>{cat.image?.src ? <Image source={cat.image.src} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} /> : <Ionicons name="apps" size={26} color={c.accent} />}</View>
                  <Text numberOfLines={3} style={s.tileName}>{decodeHtml(cat.name)}</Text>
                </Tap>
              </Reveal>
            ))}
        </View>
        {Boolean(cats.error) && !cats.data && <View style={{ padding: 16 }}><Text style={{ color: c.muted, marginBottom: 10 }}>{cats.error}</Text><Button title="Try again" variant="outline" onPress={cats.reload} /></View>}

        {viewed.length > 0 && <Row title="Recently viewed" all={false} path={`/api/catalog/products?include=${viewed.join(',')}&per_page=12`} refreshKey={key} />}
        {viewed.length > 0 && <MoreLike id={viewed[0]} refreshKey={key} />}
        <Row title="Bambu Lab" path="/api/catalog/products?brand=bambu-lab&in_stock=true&orderby=popularity&per_page=10" refreshKey={key} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { brand: 'bambu-lab', brandName: 'Bambu Lab' } })} />
        <Row title="Best sellers" path={`/api/catalog/products?orderby=popularity&per_page=8${quick}`} refreshKey={key} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1', sort: 'popularity' } })} />
        <Row title="On sale" path={`/api/catalog/products?on_sale=true&per_page=8${quick}`} refreshKey={key} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1', onsale: '1' } })} />
        <Row title="New arrivals" path={`/api/catalog/products?orderby=date&per_page=8${quick}`} refreshKey={key} onAll={() => router.push({ pathname: '/(tabs)/shop', params: { list: '1' } })} />
      </Animated.ScrollView>
      {/* Search opened but nothing typed yet: recent searches and popular ones, as on Blinkit. */}
      {searchMode && q.trim().length < 2 && (
        <FadeIn style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]}><ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
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
  head: { paddingHorizontal: 16, paddingBottom: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  logo: { width: 150, height: 34 },
  loc: { flexDirection: 'row', alignItems: 'center', paddingTop: 10 },
  eta: { fontSize: 20, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
  where: { fontSize: 13, color: '#3b3b3b', marginTop: 2, fontWeight: '600' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: r.lg, paddingHorizontal: 14, minHeight: 50, marginTop: 14, borderWidth: 1, borderColor: c.line },
  input: { flex: 1, fontSize: 15, color: c.text, height: 50 },
  hint: { position: 'absolute', left: 48, right: 44, color: '#6b7280', fontSize: 15 },
  h: { fontSize: 18, fontWeight: '900', color: c.text },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, marginBottom: 8 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  recentT: { fontSize: 13, fontWeight: '800', color: c.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surface, borderRadius: r.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipT: { fontSize: 13, color: c.text, fontWeight: '600' },
  more: { color: c.accent, fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 12 },
  tile: { width: '25%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  tileImg: { width: 70, height: 70, borderRadius: 18, overflow: 'hidden', backgroundColor: c.surface },
  tileName: { fontSize: 11.5, textAlign: 'center', marginTop: 6, color: c.text, fontWeight: '600', lineHeight: 14 },
});
