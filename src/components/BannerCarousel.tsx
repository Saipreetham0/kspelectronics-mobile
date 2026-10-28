import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Truck } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Tap } from './motion';
import type { Category } from '@/types';
import { useScreen } from '@/useScreen';
import { c, r } from '@/theme';

type Banner = {
  id: string; tag: string; title: string; sub: string; cta: string;
  colors: [string, string]; fg: string; ctaBg: string; ctaFg: string;
  match?: string; // lowercase words in a category name: gives the banner its photo and its destination
  search?: string; // used when no category matches
};

// The home banners. Edit the copy here; the photo and the destination come from the live category list.
// ponytail: static list; move to a CMS-driven endpoint (like Blinkit) when promos need to change without a release.
const BANNERS: Banner[] = [
  { id: 'printers', tag: 'AUTHORISED RESELLER', title: '3D printers', sub: 'Bambu Lab printers, filament and parts', cta: 'Shop now', colors: ['#0b1220', '#1e293b'], fg: '#fff', ctaBg: '#21c15e', ctaFg: '#0b1220', match: 'printer', search: '3D printer' },
  { id: 'boards', tag: 'MAKERS', title: 'Raspberry Pi & boards', sub: 'Arduino · ESP32 · sensors', cta: 'Shop now', colors: ['#1c61e7', '#144fc0'], fg: '#fff', ctaBg: '#fff', ctaFg: '#144fc0', match: 'raspberry', search: 'Raspberry Pi' },
  { id: 'projects', tag: 'STUDENTS', title: 'Engineering projects', sub: 'Kits for college projects', cta: 'Explore kits', colors: ['#15803d', '#166534'], fg: '#fff', ctaBg: '#fff', ctaFg: '#166534', match: 'engineering', search: 'project kit' },
  { id: 'shipping', tag: 'FREE SHIPPING', title: 'Free delivery over ₹3,000', sub: 'On every order of ₹3,000 or more', cta: 'Start shopping', colors: ['#fef3c7', '#fde68a'], fg: c.dealText, ctaBg: c.dealText, ctaFg: '#fff' }, // the cart's FREE_SHIPPING threshold
];

const GAP = 10;
const EVERY_MS = 4500;

export default function BannerCarousel({ cats }: { cats: Category[] | null }) {
  const { width } = useScreen();
  const cardW = Math.round(Math.min(width - 40, 480)); // the next card peeks in, so it reads as a carousel
  const step = cardW + GAP;
  const ref = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide on its own, but never fight a finger: pause while dragging and for a few seconds after.
  useEffect(() => {
    const t = setInterval(() => {
      if (paused.current) return;
      setIndex((i) => { const next = (i + 1) % BANNERS.length; ref.current?.scrollTo({ x: next * step, animated: true }); return next; });
    }, EVERY_MS);
    return () => { clearInterval(t); if (resume.current) clearTimeout(resume.current); };
  }, [step]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.max(0, Math.min(BANNERS.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))));

  const open = (b: Banner) => {
    const cat = b.match ? cats?.find((x) => x.name.toLowerCase().includes(b.match!)) : undefined;
    if (cat) router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } });
    else if (b.search) router.push({ pathname: '/(tabs)/shop', params: { search: b.search } });
    else router.push('/(tabs)/shop');
  };

  return (
    <View style={{ paddingTop: 12 }}>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} snapToAlignment="start" decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 12, gap: GAP }} scrollEventThrottle={32}
        onScrollBeginDrag={() => { paused.current = true; if (resume.current) clearTimeout(resume.current); }}
        onScrollEndDrag={() => { resume.current = setTimeout(() => { paused.current = false; }, 6000); }}
        onMomentumScrollEnd={onEnd}>
        {BANNERS.map((b) => {
          const photo = b.match ? cats?.find((x) => x.name.toLowerCase().includes(b.match!))?.image?.src : undefined;
          return (
            <Tap key={b.id} onPress={() => open(b)} scaleTo={0.98} style={{ width: cardW }} accessibilityRole="button" accessibilityLabel={`${b.title}. ${b.sub}. ${b.cta}`}>
              <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
                <View style={[s.blob, { backgroundColor: b.fg, opacity: 0.07, right: -30, top: -40, width: 150, height: 150 }]} />
                <View style={[s.blob, { backgroundColor: b.fg, opacity: 0.06, right: 40, bottom: -60, width: 120, height: 120 }]} />
                <View style={s.text}>
                  <Text style={[s.tag, { color: b.fg, borderColor: b.fg }]}>{b.tag}</Text>
                  <Text style={[s.title, { color: b.fg }]} numberOfLines={2}>{b.title}</Text>
                  <Text style={[s.sub, { color: b.fg }]} numberOfLines={2}>{b.sub}</Text>
                  <Text style={[s.cta, { color: b.ctaFg, backgroundColor: b.ctaBg }]}>{b.cta}</Text>
                </View>
                <View style={s.photoWrap}>
                  {photo
                    ? <View style={s.photo}><Image source={photo} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} /></View>
                    : <View style={[s.photo, { backgroundColor: 'rgba(255,255,255,0.55)' }]}><Truck size={56} weight="duotone" color={b.fg} /></View>}
                </View>
              </LinearGradient>
            </Tap>
          );
        })}
      </ScrollView>
      <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {BANNERS.map((b, i) => <View key={b.id} style={[s.dot, i === index && s.dotOn]} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { height: 156, borderRadius: r.lg + 4, padding: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  text: { flex: 1, paddingRight: 8 },
  tag: { alignSelf: 'flex-start', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, borderWidth: 1, borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 2, opacity: 0.85, overflow: 'hidden' },
  title: { fontSize: 20, fontWeight: '900', lineHeight: 24, marginTop: 8 },
  sub: { fontSize: 12, opacity: 0.88, marginTop: 3 },
  cta: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 7, borderRadius: r.pill, overflow: 'hidden', marginTop: 12 },
  photoWrap: { width: 112, alignItems: 'center', justifyContent: 'center' },
  photo: { width: 108, height: 108, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ rotate: '-3deg' }] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d3d8e0' },
  dotOn: { width: 18, backgroundColor: c.accent },
});
