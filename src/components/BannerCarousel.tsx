import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Tag } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Tap } from './motion';
import type { Category } from '@/types';
import { useScreen } from '@/useScreen';
import { useAppConfig } from '@/appConfig';
import type { RemoteBanner } from '@/appConfig';
import { isHttps, openHttps } from '@/links';
import { track } from '@/analytics';
import { c, r } from '@/theme';

type Banner = {
  id: string; Glyph: Icon; // the icon, shown when there is no photo
  tag: string; title: string; sub: string; cta: string;
  colors: [string, string]; fg: string; ctaBg: string; ctaFg: string;
  image?: string; // a designed banner (from the store): shown full-bleed, with no text drawn over it
  slug?: string; // the category it opens (its photo is used on the card)
  search?: string; // opened when there is no category
  link?: string; // an in-app path ("/offers") or an https page, for banners set from the store
};

// A banner set from the store (APP_BANNERS on the server). Only https images; outside its from/until dates it is skipped.
export const live = (b: RemoteBanner, now = Date.now()) => (!b.from || Date.parse(b.from) <= now) && (!b.until || now < Date.parse(b.until));
export const fromStore = (b: RemoteBanner): Banner => ({
  id: b.id, Glyph: Tag, tag: b.tag ?? '', title: b.title, sub: b.sub ?? '', cta: b.cta ?? 'Shop now', colors: b.colors ?? [c.accent, c.accentDark], fg: b.fg ?? '#fff',
  ctaBg: '#fff', ctaFg: c.accentDark, image: isHttps(b.image) ? b.image : undefined, slug: b.category, search: b.search, link: b.link,
});

const GAP = 12; // the same as the left margin, so a scrolled-past card is fully out of view
const EVERY_MS = 4500;

// Store campaigns (APP_BANNERS): artwork or text cards that slide by. Shown only while the store runs one.
// `active`: the slide-show only runs while the page is in view. It also stops on the last banner (and never starts with reduced motion), so nothing moves forever.
export default function BannerCarousel({ cats, active = true }: { cats: Category[] | null; active?: boolean }) {
  const remote = useAppConfig().banners; // campaigns set from the store (APP_BANNERS); the everyday home promos are the PromoGrid
  const banners = useMemo<Banner[]>(() => (remote ?? []).filter((b) => live(b)).map(fromStore), [remote]);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);
  const at = useRef(0);
  const { width } = useScreen();
  const cardW = Math.round(Math.min(width - 40, 480)); // the next card peeks in, so it reads as a carousel
  const step = cardW + GAP;
  const ref = useRef<ScrollViewInstance>(null);
  const sx = useRef(new Animated.Value(0)).current; // the row's scroll position, which drives the dots
  const paused = useRef(false);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide on its own, but never fight a finger: pause while dragging and for a few seconds after.
  useEffect(() => {
    if (!active || reduce) return;
    const t = setInterval(() => {
      if (paused.current) return;
      const next = at.current + 1;
      if (next >= banners.length) { clearInterval(t); return; }
      at.current = next;
      ref.current?.scrollTo({ x: next * step, animated: true });
    }, EVERY_MS);
    return () => clearInterval(t);
  }, [step, active, reduce, banners.length]);
  useEffect(() => () => { if (resume.current) clearTimeout(resume.current); }, []);

  if (!banners.length) return null; // after every hook: nothing to show until the store runs a campaign
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => { at.current = Math.max(0, Math.min(banners.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))); };

  const open = (b: Banner) => {
    track('banner_tap', { id: b.id });
    if (b.link?.startsWith('/')) return router.push(b.link as never);
    if (b.link && isHttps(b.link)) return openHttps(b.link);
    if (b.slug && (!cats || cats.some((x) => x.slug === b.slug))) return router.push({ pathname: '/(tabs)/shop', params: { category: b.slug } });
    if (b.search) return router.push({ pathname: '/(tabs)/shop', params: { search: b.search } });
    router.push('/(tabs)/shop');
  };

  return (
    <View style={{ paddingTop: 12 }}>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} snapToAlignment="start" decelerationRate="fast"
        contentContainerStyle={{ paddingLeft: 12, paddingRight: Math.max(12, width - cardW - 12), gap: GAP }} scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: sx } } }], { useNativeDriver: false })}
        onScrollBeginDrag={() => { paused.current = true; if (resume.current) clearTimeout(resume.current); }}
        onScrollEndDrag={() => { resume.current = setTimeout(() => { paused.current = false; }, 6000); }}
        onMomentumScrollEnd={onEnd}>
        {banners.map((b) => {
          const a11y = [b.title, b.sub, b.cta].filter(Boolean).join('. ');
          // A designed banner: the artwork carries the message, so nothing is drawn over it (send it 16:7, e.g. 1200 × 525).
          if (b.image) return (
            <Tap key={b.id} onPress={() => open(b)} scaleTo={0.98} style={{ width: cardW }} accessibilityRole="button" accessibilityLabel={a11y}>
              <Image source={b.image} style={[s.art, { backgroundColor: b.colors[0] }]} contentFit="cover" transition={200} />
            </Tap>
          );
          const photo = b.slug ? cats?.find((x) => x.slug === b.slug)?.image?.src : undefined;
          return (
            <Tap key={b.id} onPress={() => open(b)} scaleTo={0.98} style={{ width: cardW }} accessibilityRole="button" accessibilityLabel={a11y}>
              <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
                <View style={[s.blob, { backgroundColor: b.fg, opacity: 0.07, right: -30, top: -40, width: 150, height: 150 }]} />
                <View style={[s.blob, { backgroundColor: b.fg, opacity: 0.06, right: 40, bottom: -60, width: 120, height: 120 }]} />
                <View style={s.text}>
                  {b.tag ? <Text style={[s.tag, { color: b.fg, borderColor: b.fg }]}>{b.tag}</Text> : null}
                  <Text style={[s.title, { color: b.fg }]} numberOfLines={2}>{b.title}</Text>
                  {b.sub ? <Text style={[s.sub, { color: b.fg }]} numberOfLines={2}>{b.sub}</Text> : null}
                  <Text style={[s.cta, { color: b.ctaFg, backgroundColor: b.ctaBg }]}>{b.cta}</Text>
                </View>
                <View style={s.photoWrap}>
                  {photo
                    ? <View style={s.photo}><Image source={photo} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} /></View>
                    : <View style={[s.photo, { backgroundColor: 'rgba(255,255,255,0.55)' }]}><b.Glyph size={56} weight="duotone" color={b.fg} /></View>}
                </View>
              </LinearGradient>
            </Tap>
          );
        })}
      </ScrollView>
      {banners.length > 1 && (
        <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {banners.map((b, i) => {
            const range = [(i - 1) * step, i * step, (i + 1) * step];
            return <Animated.View key={b.id} style={[s.dot, { width: sx.interpolate({ inputRange: range, outputRange: [6, 18, 6], extrapolate: 'clamp' }), backgroundColor: sx.interpolate({ inputRange: range, outputRange: [c.line, c.accent, c.line], extrapolate: 'clamp' }) }]} />;
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // minHeight, not height: with a large system font the text makes the card taller instead of being clipped.
  card: { minHeight: 156, borderRadius: r.lg + 4, padding: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  art: { width: '100%', aspectRatio: 16 / 7, borderRadius: r.lg + 4 },
  blob: { position: 'absolute', borderRadius: 999 },
  text: { flex: 1, paddingRight: 8 },
  tag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, borderWidth: 1, borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 2, opacity: 0.85, overflow: 'hidden' },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 24, marginTop: 8 },
  sub: { fontSize: 12, opacity: 0.88, marginTop: 3 },
  cta: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 7, borderRadius: r.pill, overflow: 'hidden', marginTop: 12 },
  photoWrap: { width: 112, alignItems: 'center', justifyContent: 'center' },
  photo: { width: 108, height: 108, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ rotate: '-3deg' }] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
});
