import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { HostInstance } from 'react-native';
import { Text } from '@/components/Text';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard, { priceOf } from '@/components/ProductCard';
import { Button, ErrorBox } from '@/components/ui';
import ReviewForm from '@/components/ReviewForm';
import { Skeleton } from '@/components/Skeleton';
import { Bump, Pop, PopIn, Reveal } from '@/components/motion';
import { api } from '@/api';
import { decodeHtml, minorToInr } from '@/format';
import { useStore } from '@/store';
import { useFetch } from '@/useFetch';
import type { Product, Swatches } from '@/types';
import { CaretDown, Export, Heart, Minus, Plus, Star, X } from 'phosphor-react-native';
import { SITE_URL } from '@/config';
import { useWishlist } from '@/wishlist';
import { useFly } from '@/fly';
import { useScreen } from '@/useScreen';
import NotifyMe from '@/components/NotifyMe';
import CartBar from '@/components/CartBar';
import SearchButton from '@/components/SearchButton';
import { addViewed } from '@/recentlyViewed';
import { c, r, shadow } from '@/theme';

type Brand = { name: string; slug: string; image: string; count: number };
type Detail = { product: Product; stock: Record<number, boolean>; swatches?: Swatches; related: Product[]; brand?: Brand | null };
type Review = { id: number; name: string; rating: number; date: string; text: string };
// The description's HTML as simple blocks: headings, bullets (list items, table rows as "name: value") and paragraphs.
function blocks(html: string) {
  const out: { k: 'h' | 'li' | 'p'; t: string }[] = [];
  const h = html.replace(/<h[1-6][^>]*>/gi, '\n#').replace(/<li[^>]*>/gi, '\n•').replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ': ').replace(/<\/(p|tr|ul|ol|h[1-6]|div|table)>|<br\s*\/?>/gi, '\n');
  for (const raw of decodeHtml(h.replace(/<[^>]+>/g, '')).split('\n')) {
    const t = raw.trim(); if (!t) continue;
    if (t.startsWith('#')) out.push({ k: 'h', t: t.slice(1).trim() }); else if (t.startsWith('•')) out.push({ k: 'li', t: t.slice(1).trim() }); else out.push({ k: 'p', t });
  }
  return out;
}
const cache = new Map<number, Product>();

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, reload } = useFetch<Detail>(`/api/catalog/products/${slug}`);
  const { addItem, updateItem, removeItem, cart, busy } = useStore();
  const { has, toggle } = useWishlist();
  const insets = useSafeAreaInsets(); // absolutely placed children are measured from the edge, inside the SafeAreaView's own bottom padding
  const { width: winW, full: fullW } = useScreen(); // winW: the phone-width column; fullW: the whole window (the photo viewer covers it all)
  const W = Math.min(winW, 520); // on tablets and the web preview the photo stops growing
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [variant, setVariant] = useState<Product | null>(null);
  const [varFailed, setVarFailed] = useState(false);
  const [shot, setShot] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false); // past the photo: the bar turns white so the page text never runs under the buttons
  const [details, setDetails] = useState(false); // the "View details" sheet: description and specifications
  const [barH, setBarH] = useState(76); // the sticky bar's real height, so the View cart pill floats just above it
  const [reviews, setReviews] = useState<Review[]>([]);
  const gallery = React.useRef<FlatList>(null);
  const addBtn = React.useRef<HostInstance>(null);
  const fly = useFly();
  const p = data?.product;
  const attrs = useMemo(() => p?.attributes.filter((a) => a.has_variations) ?? [], [p]);

  useEffect(() => { if (data?.product.id) addViewed(data.product.id); }, [data?.product.id]);
  useEffect(() => {
    if (!p) return;
    let live = true;
    api<Review[]>(`/api/catalog/reviews?product=${p.id}`).then((r) => { if (live) setReviews(r); }).catch(() => {});
    return () => { live = false; };
  }, [p]);

  // The variation whose attributes all equal the shopper's choices.
  const matchId = useMemo(() => {
    if (!p || !attrs.length || attrs.some((a) => !choice[a.name])) return null;
    return p.variations.find((v) => v.attributes.every((x) => choice[x.name] === x.value))?.id ?? null;
  }, [p, attrs, choice]);
  useEffect(() => {
    setVarFailed(false);
    if (!matchId) return;
    const hit = cache.get(matchId);
    if (hit) { setVariant(hit); return; }
    let live = true;
    api<Product>(`/api/product/${matchId}`).then((v) => { cache.set(matchId, v); if (live) setVariant(v); }).catch(() => { if (live) setVarFailed(true); });
    return () => { live = false; };
  }, [matchId]);
  // Only a variation that is the one chosen right now counts: while the next one loads, the previous one's price must not linger.
  const current = variant && variant.id === matchId ? variant : null;
  // Picking a colour brings that variation's photo to the front of the gallery.
  useEffect(() => { if (current) { gallery.current?.scrollToOffset({ offset: 0, animated: true }); setShot(0); } }, [current]);

  if (loading && !data) return <ProductSkeleton />;
  if (error || !p) return <ErrorBox message={error || 'Product not found.'} onRetry={reload} />;

  const shown = current ?? p;
  const { now, was, off } = priceOf(shown);
  const saveAmount = was ? (Number(shown.prices.regular_price) - Number(shown.prices.price)) : 0;
  const brand = data!.brand ?? null; // WooCommerce Brands: name, logo and how many products it has
  const priceLoading = Boolean(matchId) && !current && !varFailed;
  const images = current?.images.length ? [...current.images, ...p.images.filter((i) => !current.images.some((x) => x.id === i.id))] : p.images;
  const pending = attrs.length > 0 && !matchId;
  const inStock = current ? current.is_in_stock : p.is_in_stock;
  const left = inStock && shown.low_stock_remaining && shown.low_stock_remaining > 0 && shown.low_stock_remaining <= 5 ? shown.low_stock_remaining : 0;
  const avail = (attr: string, slugV: string) => {
    const stock = data!.stock;
    if (!Object.keys(stock).length) return true;
    return p.variations.some((v) => v.attributes.every((a) => (a.name === attr ? a.value === slugV : !choice[a.name] || choice[a.name] === a.value)) && stock[v.id] !== false);
  };

  // The cart line for what is on screen: the product itself, or the chosen variation. Its quantity drives the bar's stepper.
  const line = cart?.items.find((i) => i.id === (matchId ?? p.id));
  const qty = line?.quantity ?? 0;
  const atMax = (left > 0 && qty >= left) || qty >= (line?.quantity_limits?.maximum ?? Infinity);
  const [stepBusy, setStepBusy] = useState(false);
  const add = async () => {
    if (pending) return Alert.alert('Choose options', `Select ${attrs.filter((a) => !choice[a.name]).map((a) => a.name).join(', ')} first.`);
    try {
      addBtn.current?.measureInWindow((x, y, width, height) => fly(images[0]?.thumbnail || images[0]?.src, { x, y, width, height }));
      await addItem(p.id, 1, attrs.length ? attrs.map((a) => ({ attribute: a.name, value: choice[a.name] })) : undefined);
    } catch (e) { Alert.alert('Could not add to cart', (e as Error).message); }
  };
  const step = async (n: number) => {
    if (!line || stepBusy) return;
    setStepBusy(true);
    try {
      if (n < 1) {
        await removeItem(line.key);
      } else {
        await updateItem(line.key, n);
      }
    } catch (e) {
      Alert.alert('Could not update cart', (e as Error).message);
    } finally {
      setStepBusy(false);
    }
  };

  // Every non-variation attribute, as a specifications table; the first few also appear as quick-fact cards under the photos.
  const specs = p.attributes.filter((a) => !a.has_variations && a.terms.length).map((a) => ({ name: a.name, value: a.terms.map((t) => decodeHtml(t.name)).join(', ') }));
  const facts = specs.slice(0, 4);
  const doc = blocks(p.description || p.short_description);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom']}>
      <Stack.Screen options={{
        // No title and no bar: the photo runs to the top of the screen with the four round buttons floating over it, as on Blinkit.
        title: '', headerTransparent: true, headerShadowVisible: scrolled, headerStyle: { backgroundColor: scrolled ? '#fff' : 'transparent' },
        headerTitle: () => null,
        // Blinkit closes a product with a down chevron (the page rises from the bottom, so it leaves downwards).
        headerLeft: () => (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={10} style={s.round} accessibilityRole="button" accessibilityLabel="Close product">
            <CaretDown size={22} weight="bold" color={c.text} />
          </Pressable>
        ),
        // Blinkit puts the wishlist heart and share in the top bar.
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => toggle(p.id)} style={s.round} hitSlop={6} accessibilityRole="button" accessibilityLabel={has(p.id) ? 'Remove from wishlist' : 'Add to wishlist'}>
              <Pop on={has(p.id)}><Heart size={20} weight={has(p.id) ? 'fill' : 'bold'} color={has(p.id) ? c.danger : c.text} /></Pop>
            </Pressable>
            <SearchButton compact />
            <Pressable style={s.round} hitSlop={6} onPress={() => Share.share({ message: `${decodeHtml(p.name)} ${SITE_URL}/product/${p.slug}` }).catch(() => {})} accessibilityRole="button" accessibilityLabel="Share">
              <Export size={20} weight="bold" color={c.text} />
            </Pressable>
          </View>
        ),
      }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 + 60 }} scrollEventThrottle={32} onScroll={(e) => { const past = e.nativeEvent.contentOffset.y > W * 0.7; if (past !== scrolled) setScrolled(past); }}>
        <Reveal index={0}><View style={{ alignItems: 'center', paddingTop: insets.top + 56, backgroundColor: c.surface }}>
          {images.length === 0 ? (
            <View style={{ width: W, height: W, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.muted }}>No photo yet</Text></View>
          ) : (
            <View style={{ width: W }}>
              <FlatList ref={gallery} horizontal pagingEnabled showsHorizontalScrollIndicator={false} data={images} keyExtractor={(i) => String(i.id)}
                getItemLayout={(_, n) => ({ length: W, offset: W * n, index: n })}
                onMomentumScrollEnd={(e) => setShot(Math.round(e.nativeEvent.contentOffset.x / W))}
                renderItem={({ item, index }) => (
                  <Pressable onPress={() => setZoom(index)} accessibilityRole="imagebutton" accessibilityLabel={`${item.alt || decodeHtml(p.name)}, photo ${index + 1} of ${images.length}. Tap to enlarge`}>
                    <Image source={item.src} placeholder={item.thumbnail} transition={200} style={{ width: W, height: W, backgroundColor: c.surface }} contentFit="contain" />
                  </Pressable>
                )} />
            </View>
          )}
        </View></Reveal>
        {images.length > 1 && <View style={s.dots}>{images.map((i, n) => <View key={i.id} style={[s.dot, n === shot && { backgroundColor: c.accent }]} />)}</View>}

        {facts.length > 0 && (
          <Reveal index={1}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
            {facts.map((f) => (
              <View key={f.name} style={s.fact}><Text style={s.factK}>{f.name}</Text><Text style={s.factV} numberOfLines={1}>{f.value}</Text></View>
            ))}
            {(doc.length > 0 || specs.length > 0) && <Pressable onPress={() => setDetails(true)} style={s.factMore} accessibilityRole="button" accessibilityLabel="View product details"><Text style={s.factMoreT}>View details</Text></Pressable>}
          </ScrollView></Reveal>
        )}

        <View style={{ padding: 16 }}>
          <Reveal index={2}>
          <Text style={s.name}>{decodeHtml(p.name)}</Text>
          {p.review_count > 0 && (
            <View style={s.rating}><Star size={15} weight="fill" color={c.deal} /><Text style={s.ratingT}>{Number(p.average_rating).toFixed(1)}</Text><Text style={s.ratingN}>({p.review_count} reviews)</Text></View>
          )}
          <Bump trigger={now} style={{ alignSelf: 'flex-start' }}><View style={[s.priceRow, priceLoading && { opacity: 0.4 }]}>
            <Text style={s.price}>{now}</Text>
            {was ? <Text style={s.was}>{was}</Text> : null}
            <Text style={s.gst}>Incl. GST</Text>
          </View></Bump>
          {saveAmount > 0 && <Text style={s.save}>You save {minorToInr(saveAmount, shown.prices.currency_minor_unit)} ({off}% off)</Text>}
          <Text style={{ color: inStock ? c.success : c.danger, fontWeight: '700', marginTop: 4 }}>{inStock ? (left ? `Only ${left} left` : 'In stock') : 'Out of stock'}</Text>
          {brand ? (
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/shop', params: { brand: brand.slug, brandName: brand.name } })} style={s.brand} accessibilityRole="button" accessibilityLabel={`Explore all ${brand.name} products`}>
              <View style={s.brandLogo}>
                {brand.image ? <Image source={brand.image} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel={`${brand.name} logo`} /> : <Text style={{ fontWeight: '900', fontSize: 18, color: c.accent }}>{brand.name.trim()[0]?.toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }} numberOfLines={1}>{decodeHtml(brand.name)}</Text>
                <Text style={{ color: c.muted, fontSize: 12 }}>Explore all products{brand.count > 1 ? ` (${brand.count})` : ''}</Text>
              </View>
              <Text style={{ color: c.muted, fontSize: 22 }}>›</Text>
            </Pressable>
          ) : null}
          </Reveal>

          {attrs.map((a, n) => (
            <Reveal index={4 + n} key={a.name}><View style={{ marginTop: 16 }}>
              <Text style={s.label}>Select {a.name}{choice[a.name] ? `: ${decodeHtml(a.terms.find((t) => t.slug === choice[a.name])?.name ?? '')}` : ''}</Text>
              <View style={s.opts}>
                {a.terms.map((t) => {
                  const on = choice[a.name] === t.slug; const ok = avail(a.name, t.slug);
                  const sw = data!.swatches?.[a.taxonomy]?.[t.slug];
                  const label = `${decodeHtml(t.name)}${ok ? '' : ' (out of stock)'}`;
                  const pick = () => setChoice((x) => ({ ...x, [a.name]: on ? '' : t.slug }));
                  // Colour / image swatch: a round chip, ringed when selected, crossed out when sold out.
                  if (sw) {
                    return (
                      <Pressable key={t.slug} onPress={pick} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: on }} style={[s.swRing, on && { borderColor: c.accent }]}>
                        <View style={[s.sw, { backgroundColor: sw.color ?? '#eee' }, !ok && { opacity: 0.4 }]}>
                          {sw.image ? <Image source={sw.image} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                          {!ok && <View style={s.swX} />}
                        </View>
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable key={t.slug} onPress={pick} style={[s.opt, on && s.optOn, !ok && { opacity: 0.4 }]} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: on }}>
                      <Text style={[s.optText, on && { color: c.accent, fontWeight: '800' }, !ok && { textDecorationLine: 'line-through' }]}>{decodeHtml(t.name)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View></Reveal>
          ))}

          <Text style={s.sku}>SKU: {shown.sku || p.sku || 'N/A'}</Text>

          {(doc.length > 0 || specs.length > 0) && (
            <Pressable onPress={() => setDetails(true)} style={s.detailsRow} accessibilityRole="button" accessibilityLabel="Product details">
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', fontSize: 15 }}>Product details</Text><Text style={{ color: c.muted, fontSize: 12 }}>About this product{specs.length ? ' and specifications' : ''}</Text></View>
              <Text style={{ color: c.muted, fontSize: 20 }}>›</Text>
            </Pressable>
          )}

          <View style={{ marginTop: 18 }}>
              <Text style={s.section}>Customer reviews</Text>
              {reviews.map((r) => (
                <View key={r.id} style={s.review}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} weight={n <= r.rating ? 'fill' : 'regular'} color={c.deal} />)}
                    <Text style={s.reviewBy}>  {r.name}</Text>
                  </View>
                  <Text style={s.desc}>{decodeHtml(r.text)}</Text>
                </View>
              ))}
              <View style={{ marginTop: 14 }}><ReviewForm productId={p.id} /></View>
            </View>
        </View>

        {data!.related.length > 0 && (
          <View>
            <Text style={[s.name, { marginLeft: 16, marginBottom: 6 }]}>Similar products</Text>
            <FlatList horizontal data={data!.related} keyExtractor={(x) => String(x.id)} contentContainerStyle={{ paddingHorizontal: 11 }} showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <ProductCard product={item} width={Math.max(140, Math.min(190, (winW - 44) / 2.3))} />} />
          </View>
        )}
      </ScrollView>

      {/* Blinkit's sticky bar: the chosen price on the left; once the item is in the cart the main action turns into a quantity stepper. */}
      <View style={s.bar} onLayout={(e) => setBarH(Math.ceil(e.nativeEvent.layout.height))}>
        <View style={{ flex: 1, minWidth: 84 }}>
          <Text style={[s.barPrice, priceLoading && { opacity: 0.4 }]} numberOfLines={1}>{now}</Text>
          <Text style={s.barNote}>Incl. GST</Text>
        </View>
        {line ? (
          <>
            <PopIn style={s.action}><View style={s.stepper}>
              <Pressable onPress={() => step(qty - 1)} disabled={stepBusy} style={[s.stepBtn, stepBusy && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Decrease quantity"><Minus size={18} weight="bold" color="#fff" /></Pressable>
              <Bump trigger={qty}><Text style={s.stepN} accessibilityLabel={`${qty} in cart`}>{qty}</Text></Bump>
              <Pressable onPress={() => step(qty + 1)} disabled={atMax || stepBusy} style={[s.stepBtn, (atMax || stepBusy) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="Increase quantity"><Plus size={18} weight="bold" color="#fff" /></Pressable>
            </View></PopIn>
          </>
        ) : !inStock ? (
          <NotifyMe productId={p.id} style={[s.action, { minHeight: 44 }]} />
        ) : (
          <>
            <View ref={addBtn} collapsable={false} style={s.action}><Button title={pending ? 'Select options' : 'Add to cart'} loading={busy} disabled={!inStock} onPress={() => add()} style={{ minHeight: 44 }} /></View>
          </>
        )}
      </View>

      <CartBar bottom={barH + insets.bottom + 12} />

      <Modal visible={details} animationType="slide" onRequestClose={() => setDetails(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.sheetHead}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>Product details</Text>
            <Pressable onPress={() => setDetails(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close"><X size={24} color={c.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {doc.length > 0 && (<>
              <Text style={s.section}>About this product</Text>
              {doc.map((b, n) => b.k === 'h'
                ? <Text key={n} style={s.docH}>{b.t}</Text>
                : <Text key={n} style={[s.desc, b.k === 'li' && { paddingLeft: 14 }]}>{b.k === 'li' ? `•  ${b.t}` : b.t}</Text>)}
            </>)}
            {specs.length > 0 && (<>
              <Text style={[s.section, { marginTop: 22 }]}>Specifications</Text>
              {specs.map((f, n) => (
                <View key={f.name} style={[s.specRow, n % 2 === 0 && { backgroundColor: c.surface }]}>
                  <Text style={s.specK}>{f.name}</Text><Text style={s.specV}>{f.value}</Text>
                </View>
              ))}
            </>)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Full-screen photos: swipe between them, pinch to zoom on iOS. */}
      <Modal visible={zoom !== null} animationType="fade" onRequestClose={() => setZoom(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {zoom !== null && (
            <FlatList horizontal pagingEnabled data={images} keyExtractor={(i) => String(i.id)} initialScrollIndex={zoom} showsHorizontalScrollIndicator={false}
              getItemLayout={(_, n) => ({ length: fullW, offset: fullW * n, index: n })}
              renderItem={({ item }) => (
                <ScrollView style={{ width: fullW }} contentContainerStyle={{ flex: 1, justifyContent: 'center' }} maximumZoomScale={4} minimumZoomScale={1} centerContent showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                  <Image source={item.src} style={{ width: fullW, height: fullW }} contentFit="contain" accessibilityLabel={item.alt || decodeHtml(p.name)} />
                </ScrollView>
              )} />
          )}
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, right: 0 }}>
            <Pressable onPress={() => setZoom(null)} hitSlop={12} style={s.close} accessibilityRole="button" accessibilityLabel="Close photos"><X size={22} color="#fff" /></Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// The page's shape while it loads, instead of a bare spinner.
function ProductSkeleton() {
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center' }}>
      <Skeleton style={{ width: W, height: W, borderRadius: 0 }} />
      <View style={{ width: W, padding: 16, gap: 10 }}>
        <Skeleton style={{ height: 20, width: '85%' }} /><Skeleton style={{ height: 20, width: '50%' }} />
        <Skeleton style={{ height: 28, width: '35%', marginTop: 6 }} /><Skeleton style={{ height: 44, width: '100%', marginTop: 10 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d1d5db' },
  name: { fontSize: 19, fontWeight: '800', color: c.text, lineHeight: 25 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 },
  price: { fontSize: 24, fontWeight: '900', color: c.text },
  was: { fontSize: 15, color: c.muted, textDecorationLine: 'line-through' },
  gst: { fontSize: 12, color: c.muted },
  label: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  sw: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)' },
  swX: { position: 'absolute', left: -4, right: -4, top: 14, height: 2, backgroundColor: '#cf000f', transform: [{ rotate: '-45deg' }] },
  opt: { minWidth: 92, paddingHorizontal: 18, paddingVertical: 14, borderRadius: r.md, borderWidth: 1.5, borderColor: c.line, alignItems: 'center' }, // "Select unit" cards
  optOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  optText: { fontSize: 14, color: c.text },
  sku: { color: c.muted, fontSize: 13, marginTop: 16 },
  section: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 6 },
  docH: { fontSize: 14, fontWeight: '800', color: c.text, marginTop: 10 },
  desc: { color: '#444', fontSize: 14, lineHeight: 22, marginTop: 6 },
  more: { color: c.accent, fontWeight: '800', fontSize: 14, marginTop: 10 },
  specRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: r.sm },
  specK: { flex: 2, fontSize: 13, color: c.muted, fontWeight: '600' },
  specV: { flex: 3, fontSize: 13, color: c.text, fontWeight: '600' },
  review: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  reviewBy: { fontSize: 13, fontWeight: '700', color: c.text },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow }, // the header's round icon buttons, one size for all four: white, so they read over any photo
  brandLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 6 },
  save: { color: c.success, fontWeight: '800', fontSize: 13, marginTop: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.line },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 14, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' },
  factMore: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 14, borderRadius: r.md, borderWidth: 1, borderColor: c.green, backgroundColor: c.greenSoft },
  factMoreT: { color: c.greenDark, fontWeight: '800', fontSize: 13 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  fact: { backgroundColor: c.surface, borderRadius: r.md, paddingHorizontal: 14, paddingVertical: 10, minWidth: 110, maxWidth: 200 },
  factK: { fontSize: 11, color: c.muted, fontWeight: '600' },
  factV: { fontSize: 14, color: c.text, fontWeight: '800', marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingT: { fontSize: 14, fontWeight: '800', color: c.text },
  ratingN: { fontSize: 13, color: c.muted },
  barPrice: { fontSize: 18, fontWeight: '900', color: c.text },
  barNote: { fontSize: 11, color: c.muted, marginTop: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: '#fff' },
  action: { width: 150, flexShrink: 0 }, // a compact button on the right, as on Blinkit: the price takes the rest
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.accent, borderRadius: r.md, height: 44 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepN: { color: '#fff', fontSize: 17, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  close: { margin: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
