import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SuggestList from '@/components/SuggestList';
import { alternatives } from '@/searchFallback';
import ProductCard from '@/components/ProductCard';
import FilterSheet, { SORTS } from '@/components/FilterSheet';
import LocationSheet from '@/components/LocationSheet';
import { ProductSkeleton, Skeleton } from '@/components/Skeleton';
import { Button, Dots } from '@/components/ui';
import { Reveal, Tap } from '@/components/motion';
import { api } from '@/api';
import { SITE_URL } from '@/config';
import { addRecent } from '@/recentSearches';
import { isHyderabad, loadLoc } from '@/location';
import type { Loc } from '@/location';
import { decodeHtml } from '@/format';
import { useFetch } from '@/useFetch';
import { QUICK_TAG, useMode } from '@/mode';
import { useScreen } from '@/useScreen';
import type { CategoryTree, Product } from '@/types';
import { c, r } from '@/theme';

const PAGE = 20;

// A category and its ancestors, top-level first ([] when the slug isn't in the tree).
function findChain(nodes: CategoryTree[], slug: string, trail: CategoryTree[] = []): CategoryTree[] {
  for (const n of nodes) {
    const here = [...trail, n];
    if (n.slug === slug) return here;
    const deeper = findChain(n.children, slug, here);
    if (deeper.length) return deeper;
  }
  return [];
}

type Entry = { key: string; slug: string; name: string; image: { src: string } | null };

// Under its parent's heading a child doesn't repeat the parent's words: "Bambu Lab PLA Filaments" under "Bambu Lab Filaments" reads "PLA", so the
// whole row fits on screen. Plurals match ("Printer" / "Printers"). If nothing meaningful is left (just a number, as in "Raspberry Pi 5"), the full name stays.
function shortName(child: string, parent: string): string {
  const stem = (w: string) => w.toLowerCase().replace(/s$/, '');
  const shared = new Set(decodeHtml(parent).split(/\s+/).map(stem));
  const left = decodeHtml(child).split(/\s+/).filter((w) => !shared.has(stem(w))).join(' ').replace(/^[&,\s]+|[&,\s]+$/g, '');
  return left.length > 2 && !/^\d+$/.test(left) ? left : decodeHtml(child);
}

// Blinkit's model, on your real category tree (up to four levels):
//   Categories tab  : each top-level category is a section heading over tiles for its sub-categories.
//   Category page   : a header (back, name and delivery line, search, share), a left rail of the next level down,
//                     and, when the chosen rail item has children of its own, a row of chips for them. Then the products.
export default function Shop() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string; category?: string; brand?: string; brandName?: string; sort?: string; onsale?: string; list?: string }>(); // sort / onsale / list: Home's "see all" links
  const { width } = useScreen();
  const [q, setQ] = useState(params.search ?? '');
  const [search, setSearch] = useState(params.search ?? '');
  const [brand, setBrand] = useState(params.brand ?? ''); // a brand's products (from the product page's brand row)
  const [searching, setSearching] = useState(false); // the search bar replaces the category header until the search is cleared
  const [category, setCategory] = useState(params.category ?? ''); // what the products are filtered by
  const [pageSlug, setPageSlug] = useState(''); // the category the page is about (the header); the rail and chips move within it
  const [sort, setSort] = useState(params.sort ?? '');
  const [listAll, setListAll] = useState(params.list === '1'); // the whole product list instead of the category grid
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(params.onsale === '1');
  const [price, setPrice] = useState('');
  const [sheet, setSheet] = useState<'sort' | 'filters' | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [looser, setLooser] = useState(''); // what was searched instead, when the exact search found nothing
  const [pin, setPin] = useState('');
  const [loc, setLoc] = useState<Loc | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const req = useRef(0);
  const tree = useFetch<CategoryTree[]>('/api/catalog/categories?tree=full');
  const forest = tree.data ?? [];

  useFocusEffect(useCallback(() => { loadLoc().then((l) => { setPin(l.pin); setLoc(l.loc); }); }, [])); // re-read on focus: the location is changed from Home
  useEffect(() => { setSearch(params.search ?? ''); setQ(params.search ?? ''); setCategory(params.category ?? ''); setBrand(params.brand ?? ''); setPageSlug(''); setSearching(false); setListAll(params.list === '1'); setSort(params.sort ?? ''); setOnSale(params.onsale === '1'); }, [params.search, params.category, params.brand, params.list, params.sort, params.onsale]);

  // Opening a category from the grid (or a Home tile or banner): the page is about that category.
  const open = (slug: string) => { setCategory(slug); setPageSlug(slug); };
  // A deep link to any level lands on its second level (the tile level), or on the category itself when it is top-level. Frozen once chosen.
  const chain = findChain(forest, category);
  useEffect(() => { if (category && !pageSlug && chain.length) setPageSlug((chain[1] ?? chain[0]).slug); }, [category, pageSlug, chain]);

  const quickMode = useMode().mode === 'quick';
  const fetchPage = useCallback(async (p: number) => {
    const id = ++req.current;
    const [orderby, order] = sort.split(':');
    const qs = new URLSearchParams({ page: String(p), per_page: String(PAGE) });
    if (search) qs.set('search', search);
    if (category) qs.set('category', category);
    if (brand) qs.set('brand', brand);
    if (orderby) qs.set('orderby', orderby);
    if (order) qs.set('order', order);
    if (quickMode) qs.set('tag', QUICK_TAG); // Quick: only what a rider can bring
    if (inStock) qs.set('in_stock', 'true');
    if (onSale) qs.set('on_sale', 'true');
    const [lo, hi] = price.split(':');
    if (lo) qs.set('min_price', lo);
    if (hi) qs.set('max_price', hi);
    if (p === 1) { setItems([]); setLooser(''); } // never show the previous category's products while the new ones load
    setLoading(true); setError('');
    try {
      let rows = await api<Product[]>(`/api/catalog/products?${qs}`);
      if (id !== req.current) return; // a newer request replaced this one
      if (p === 1 && !rows.length && search) { // nothing found: try looser versions of the search before giving up
        for (const alt of alternatives(search)) {
          qs.set('search', alt);
          const found = await api<Product[]>(`/api/catalog/products?${qs}`).catch(() => []);
          if (id !== req.current) return;
          if (found.length) { rows = found; setLooser(alt); break; }
        }
      }
      setItems((cur) => (p === 1 ? rows : [...cur, ...rows]));
      setMore(rows.length === PAGE); setPage(p);
    } catch (e) { if (id === req.current) setError((e as Error).message); }
    if (id === req.current) setLoading(false);
  }, [search, category, brand, sort, inStock, onSale, price, quickMode]);
  const suggesting = q.trim().length >= 2 && q.trim() !== search; // typing, not yet submitted
  const gridMode = category === '' && !search && !brand && !listAll; // the sectioned category grid: nothing to list yet
  useEffect(() => { if (!gridMode) fetchPage(1); }, [fetchPage, gridMode]);

  // Where we are inside the page: pageNode is the header category, sel[0] the chosen rail item, sel[1] the chosen chip.
  const pageNode = pageSlug ? findChain(forest, pageSlug).at(-1) : undefined;
  const at = pageNode ? chain.findIndex((n) => n.slug === pageNode.slug) : -1;
  const sel = at >= 0 ? chain.slice(at + 1) : [];
  const showHeader = Boolean(pageNode) && !search && !searching;
  // The rail is the next level down. "All" comes first because a category can hold products that sit in none of its children.
  const rail: Entry[] = pageNode && pageNode.children.length > 0
    ? [{ key: pageNode.slug, slug: pageNode.slug, name: 'All', image: pageNode.image }, ...pageNode.children.map((n) => ({ key: n.slug, slug: n.slug, name: shortName(n.name, pageNode.name), image: n.image }))]
    : [];
  // A fourth level, when the chosen rail item has children: chips under the toolbar.
  const chipOf = sel[0] && sel[0].children.length > 0 ? sel[0] : undefined;
  const chips: Entry[] = chipOf ? [{ key: chipOf.slug, slug: chipOf.slug, name: 'All', image: null }, ...chipOf.children.map((n) => ({ key: n.slug, slug: n.slug, name: shortName(n.name, chipOf.name), image: null }))] : [];

  const place = loc ? `${loc.area}, ${loc.city}` : pin || 'Hyderabad';
  const activeFilters = (inStock ? 1 : 0) + (onSale ? 1 : 0) + (price ? 1 : 0);
  const sortLabel = SORTS.find(([v]) => v === sort)?.[1] ?? 'Latest';
  const tileW = Math.floor((Math.min(width, 560) - 24) / 4);
  const tileImg = Math.max(60, tileW - 14);
  // Top-level categories without sub-categories have no section of their own: they sit together under "More".
  const sections = forest.filter((n) => n.children.length > 0);
  const loose = forest.filter((n) => n.children.length === 0);

  const tile = (n: CategoryTree, i: number) => (
    <Reveal key={n.slug} index={i} style={[s.tile, { width: tileW }]}>
      <Tap onPress={() => open(n.slug)} scaleTo={0.94} style={{ alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={decodeHtml(n.name)}>
        <View style={[s.tileImg, { width: tileImg, height: tileImg }]}>{n.image ? <Image source={n.image.src} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} /> : <Ionicons name="apps" size={26} color={c.accent} />}</View>
        <Text numberOfLines={3} style={s.tileName}>{decodeHtml(n.name)}</Text>
      </Tap>
    </Reveal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      {brand && !searching && !search ? (
        <View style={s.head}>
          <Pressable onPress={() => { setBrand(''); router.setParams({ brand: '', brandName: '' }); if (router.canGoBack()) router.back(); }} style={s.circle} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>
          <View style={s.headMid}>
            <Text style={s.headT} numberOfLines={1}>{decodeHtml(params.brandName || brand.replace(/-/g, ' '))}</Text>
            <Text style={s.headS} numberOfLines={1}>All products from this brand</Text>
          </View>
          <Pressable onPress={() => setSearching(true)} style={s.circle} accessibilityRole="button" accessibilityLabel="Search"><Ionicons name="search" size={21} color={c.text} /></Pressable>
        </View>
      ) : showHeader && pageNode ? (
        <View style={s.head}>
          <Pressable onPress={() => { setCategory(''); setPageSlug(''); }} style={s.circle} accessibilityRole="button" accessibilityLabel="Back to all categories"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>
          <View style={s.headMid}>
            <Text style={s.headT} numberOfLines={1}>{decodeHtml(pageNode.name)}</Text>
            <Text style={s.headS} numberOfLines={1}>
              {isHyderabad(loc) ? 'Same-day delivery to ' : 'Delivering to '}<Text style={s.headPlace}>{place}</Text>
            </Text>
          </View>
          <Pressable onPress={() => setSearching(true)} style={s.circle} accessibilityRole="button" accessibilityLabel="Search"><Ionicons name="search" size={21} color={c.text} /></Pressable>
          <Pressable onPress={() => Share.share({ message: `${decodeHtml(pageNode.name)}: ${SITE_URL}/shop?category=${pageNode.slug}` }).catch(() => {})} style={s.circle} accessibilityRole="button" accessibilityLabel="Share"><Ionicons name="share-outline" size={21} color={c.text} /></Pressable>
        </View>
      ) : (
        <>
          <View style={s.bar}>
            <Ionicons name="search" size={19} color="#777" />
            <TextInput style={s.input} placeholder='Search "Arduino", "filament" and more' value={q} onChangeText={setQ} autoFocus={searching} onSubmitEditing={() => { setSearch(q.trim()); addRecent(q); }} returnKeyType="search" />
            {(q || search || searching) ? <Pressable onPress={() => { setQ(''); setSearch(''); setSearching(false); }} accessibilityLabel="Clear search" hitSlop={8}><Ionicons name="close-circle" size={19} color="#aaa" /></Pressable> : null}
          </View>
          <Pressable onPress={() => setPinOpen(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Change delivery location">
            <Text style={s.deliver} numberOfLines={1}>
              {loc ? `${isHyderabad(loc) ? 'Same-day delivery' : 'Delivering'} to ${loc.area}, ${loc.city} · ${loc.pin}` : pin ? `Delivering to ${pin}` : 'Set your delivery location'} <Text style={{ color: c.accent }}>Change</Text>
            </Text>
          </Pressable>
        </>
      )}

      <View style={{ flex: 1, display: suggesting ? 'none' : 'flex' }}>
      {gridMode ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {tree.loading && !tree.data ? (
            <View style={s.grid}>{Array.from({ length: 8 }).map((_, n) => <View key={n} style={[s.tile, { width: tileW }]}><Skeleton style={{ width: tileImg, height: tileImg, borderRadius: 16 }} /><Skeleton style={{ width: tileImg * 0.8, height: 10, marginTop: 8 }} /></View>)}</View>
          ) : tree.error && !tree.data ? (
            <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: c.muted, textAlign: 'center', marginBottom: 12 }}>{tree.error}</Text><Button title="Try again" variant="outline" onPress={tree.reload} /></View>
          ) : (
            <>
              {sections.map((sec) => (
                <View key={sec.slug}>
                  <View style={s.sectionRow}>
                    <Text style={s.section} numberOfLines={1}>{decodeHtml(sec.name)}</Text>
                    <Pressable onPress={() => open(sec.slug)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`See all ${decodeHtml(sec.name)}`}><Text style={s.seeAll}>See all</Text></Pressable>
                  </View>
                  <View style={s.grid}>{sec.children.map(tile)}</View>
                </View>
              ))}
              {loose.length > 0 && (
                <View>
                  <View style={s.sectionRow}><Text style={s.section}>More</Text></View>
                  <View style={s.grid}>{loose.map(tile)}</View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {rail.length > 0 && (
            <FlatList style={s.rail} data={rail} keyExtractor={(x) => x.key} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item }) => {
                const on = item.slug === pageNode?.slug ? sel.length === 0 : sel[0]?.slug === item.slug;
                return (
                  <Pressable onPress={() => setCategory(item.slug)} style={s.railItem} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    {on && <View style={s.railBar} />}
                    <View style={[s.railImg, on && s.railImgOn]}>
                      {item.image ? <Image source={item.image.src} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Ionicons name="apps" size={22} color={c.accent} />}
                    </View>
                    <Text numberOfLines={2} style={[s.railText, on && s.railTextOn]}>{decodeHtml(item.name)}</Text>
                  </Pressable>
                );
              }} />
          )}

          <View style={{ flex: 1 }}>
            {!showHeader && <View style={s.sortRow}><Text style={s.title} numberOfLines={1}>{search ? `Results for "${search}"` : 'Products'}</Text></View>}

            {/* One row, like Blinkit: Filters and Sort open a bottom sheet. */}
            <View style={s.toolbar}>
              <Pressable onPress={() => setSheet('filters')} style={[s.tool, activeFilters > 0 && s.toolOn]} accessibilityRole="button" accessibilityLabel={`Filters, ${activeFilters} active`}>
                <Ionicons name="options-outline" size={15} color={activeFilters ? c.accent : c.text} />
                <Text style={[s.toolT, activeFilters > 0 && { color: c.accent }]}>{activeFilters ? `Filters · ${activeFilters}` : 'Filters'}</Text>
                <Ionicons name="chevron-down" size={14} color={activeFilters ? c.accent : c.muted} />
              </Pressable>
              <Pressable onPress={() => setSheet('sort')} style={[s.tool, sort !== '' && s.toolOn]} accessibilityRole="button" accessibilityLabel={`Sort, currently ${sortLabel}`}>
                <Ionicons name="swap-vertical" size={15} color={sort !== '' ? c.accent : c.text} />
                <Text style={[s.toolT, sort !== '' && { color: c.accent }]} numberOfLines={1}>{sort !== '' ? sortLabel : 'Sort'}</Text>
                <Ionicons name="chevron-down" size={14} color={sort !== '' ? c.accent : c.muted} />
              </Pressable>
            </View>

            {/* The fourth level, when the chosen rail item has children (for example Bambu Lab Filaments > PLA, PETG, TPU). */}
            {chips.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.noShrink} contentContainerStyle={{ paddingHorizontal: 10, gap: 8, paddingBottom: 8 }}>
                {chips.map((ch) => {
                  const on = ch.slug === chipOf?.slug ? sel.length === 1 : sel[1]?.slug === ch.slug;
                  return (
                    <Pressable key={ch.key} onPress={() => setCategory(ch.slug)} style={[s.chip, on && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                      <Text style={[s.chipText, on && { color: '#fff' }]} numberOfLines={1}>{decodeHtml(ch.name)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {looser ? <Text style={s.looser} accessibilityLiveRegion="polite">No exact match for “{search}”. Showing results for “{looser}”.</Text> : null}
            {loading && !items.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 5 }}>{[0, 1, 2, 3].map((n) => <View key={n} style={{ width: '50%' }}><ProductSkeleton /></View>)}</View>
            ) : error && !items.length ? (
              <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: c.muted, textAlign: 'center', marginBottom: 12 }}>{error}</Text><Button title="Try again" variant="outline" onPress={() => fetchPage(1)} /></View>
            ) : (
              <FlatList data={items.length % 2 ? [...items, { id: -1 } as Product] : items} numColumns={2} keyExtractor={(p) => String(p.id)} contentContainerStyle={{ padding: 4, paddingBottom: 150 }} showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (item.id < 0 ? <View style={{ flex: 1 }} /> : <ProductCard product={item} index={index % PAGE} />)}
                onEndReachedThreshold={0.5} onEndReached={() => more && !loading && fetchPage(page + 1)}
                ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 40, gap: 10 }}>
                  <Text style={{ textAlign: 'center', color: c.muted }}>{activeFilters ? 'No products match these filters.' : 'No products found.'}</Text>
                  {activeFilters ? <Pressable onPress={() => { setInStock(false); setOnSale(false); setPrice(''); }}><Text style={{ color: c.accent, fontWeight: '800' }}>Clear filters</Text></Pressable> : null}
                  {search && !activeFilters ? (<>
                    <Text style={{ color: c.muted, marginTop: 6 }}>Try one of these instead</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16 }}>
                      {['Raspberry Pi', 'Arduino', 'ESP32', 'Bambu Lab', 'Sensors'].map((t) => <Pressable key={t} onPress={() => { setQ(t); setSearch(t); addRecent(t); }} style={s.chip} accessibilityRole="button"><Text style={s.chipText}>{t}</Text></Pressable>)}
                    </View>
                  </>) : null}
                </View>}
                ListFooterComponent={loading ? <View style={{ margin: 16, alignItems: 'center' }}><Dots /></View> : undefined} />
            )}
          </View>
        </View>
      )}
      </View>
      {suggesting && (
        <SuggestList text={q}
          onProduct={(slug) => { setQ(search); router.push(`/product/${slug}`); }}
          onCategory={(slug) => { setQ(''); setSearch(''); setSearching(false); open(slug); }}
          onSearch={(t) => { setQ(t); setSearch(t); addRecent(t); }} />
      )}

      <LocationSheet visible={pinOpen} onClose={() => setPinOpen(false)} onChange={(l) => { setLoc(l); setPin(l.pin); }} />
      <FilterSheet mode={sheet} onClose={() => setSheet(null)} sort={sort} onSort={setSort}
        filters={{ inStock, onSale, price }} onFilters={(f) => { setInStock(f.inStock); setOnSale(f.onSale); setPrice(f.price); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  looser: { color: c.dealText, backgroundColor: c.dealSoft, fontSize: 13, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 8 },
  // Blinkit's category header: round back / search / share buttons around a pill with the name and the delivery line.
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  headMid: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: c.line, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#fff' },
  headT: { fontSize: 14, fontWeight: '800', color: c.text },
  headS: { fontSize: 11, fontWeight: '600', color: c.success, marginTop: 1 },
  headPlace: { color: c.text, fontWeight: '700' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderRadius: r.lg, marginHorizontal: 12, marginVertical: 8, paddingHorizontal: 14, minHeight: 46 },
  input: { flex: 1, fontSize: 15, color: c.text, height: 46 },
  deliver: { fontSize: 12, fontWeight: '700', color: c.success, paddingHorizontal: 14, paddingBottom: 6 },
  // The category grid: a bold section heading (with "See all") over four-across tiles.
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 18, marginBottom: 4 },
  section: { flex: 1, fontSize: 20, fontWeight: '900', color: c.text },
  seeAll: { fontSize: 13, fontWeight: '800', color: c.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingTop: 6 },
  tile: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 3 },
  tileImg: { borderRadius: 18, overflow: 'hidden', backgroundColor: c.accentSoft },
  tileName: { fontSize: 12, textAlign: 'center', marginTop: 6, color: c.text, fontWeight: '600', lineHeight: 15 },
  // The rail: plain white, the chosen item bold and dark with a bar on its right edge, the others muted.
  rail: { width: 82, flexGrow: 0, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: c.line },
  railItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  railBar: { position: 'absolute', right: 0, top: 6, bottom: 6, width: 4, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, backgroundColor: c.accent },
  railImg: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  railImgOn: { backgroundColor: c.accentSoft, opacity: 1 },
  railText: { fontSize: 10.5, textAlign: 'center', marginTop: 5, color: c.muted, fontWeight: '500', lineHeight: 13 },
  railTextOn: { color: c.text, fontWeight: '800' },
  sortRow: { paddingHorizontal: 12, paddingVertical: 8 },
  title: { fontSize: 15, fontWeight: '800', color: c.text },
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', maxWidth: 150 },
  toolOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  toolT: { fontSize: 12.5, fontWeight: '700', color: c.text, flexShrink: 1 },
  noShrink: { flexGrow: 0, flexShrink: 0 }, // a chip row above a tall list must not be squeezed to a sliver
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: r.pill, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', maxWidth: 220 },
  chipOn: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { fontSize: 12, color: c.text, fontWeight: '700' },
});
