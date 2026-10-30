import React, { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cpu, Lightning, Printer, Truck } from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { Tap } from '@/components/motion';
import { useStore } from '@/store';
import { useScreen } from '@/useScreen';
import { track } from '@/analytics';
import { c, r } from '@/theme';

type Slide = {
  id: string;
  badge: string;
  Glyph: Icon;
  title: string;
  description: string;
  highlights: string[];
  gradient: [string, string];
};

const SLIDES: Slide[] = [
  {
    id: '3d-printing',
    badge: '3D PRINTING & FILAMENT',
    Glyph: Printer,
    title: 'Everything for\nMakers & Engineers',
    description: 'Precision 3D printers, official Bambu Lab & Creality filaments, nozzles, resins, and upgrades.',
    highlights: ['Bambu Lab & Creality', 'PLA, PETG & ABS Filaments', 'Spare Parts & Toolheads'],
    gradient: ['#d6e5ff', '#eef3fc'],
  },
  {
    id: 'electronics',
    badge: 'DEV BOARDS & EMBEDDED',
    Glyph: Cpu,
    title: 'Raspberry Pi, Arduino\n& Microcontrollers',
    description: 'Genuine Raspberry Pi 5, ESP32 boards, sensors, motor drivers, displays, and DIY robotics modules.',
    highlights: ['Official Raspberry Pi', 'Sensors & Actuators', 'Fast Prototyping Kits'],
    gradient: ['#e6f8ee', '#f0fbf5'],
  },
  {
    id: 'delivery',
    badge: 'LIGHTNING DISPATCH',
    Glyph: Truck,
    title: 'Delivered Fast\nAcross All of India',
    description: 'Tracked express courier pan-India, plus same-day Quick hyperlocal rider delivery in Hyderabad.',
    highlights: ['Same-Day Hyperlocal Rider', 'Live Order Tracking', 'Safe & Verified Packaging'],
    gradient: ['#fef3c7', '#fffbeb'],
  },
];

export default function Onboarding() {
  const { completeOnboarding, skipLogin } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useScreen();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / width);
    if (next !== index && next >= 0 && next < SLIDES.length) {
      setIndex(next);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    track('onboarding_complete', { from_slide: index });
    completeOnboarding();
  };

  const handleGuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    track('onboarding_skip', { as_guest: true });
    completeOnboarding();
    skipLogin();
  };

  const current = SLIDES[index];

  return (
    <View style={s.container}>
      {/* Background soft ambient gradient */}
      <LinearGradient
        colors={[current.gradient[0], current.gradient[1], '#ffffff']}
        style={[s.ambientBg, { height: '55%' }]}
      />

      {/* Header bar: Logo + Skip */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Image
          source={require('../assets/ksp-logo.png')}
          style={s.logo}
          contentFit="contain"
          contentPosition="left center"
          accessibilityLabel="KSP Electronics"
        />
        {index < SLIDES.length - 1 ? (
          <Pressable
            onPress={handleComplete}
            hitSlop={12}
            style={s.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={s.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Swipeable Carousel */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => {
          const { Glyph } = item;
          return (
            <View style={[s.slide, { width }]}>
              {/* Illustration / Icon Box */}
              <View style={s.illustrationWrapper}>
                <View style={s.iconCircleOuter}>
                  <View style={s.iconCircleInner}>
                    <Glyph size={68} color={c.accent} weight="duotone" />
                  </View>
                </View>
              </View>

              {/* Slide Content */}
              <View style={s.contentWrapper}>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.badge}</Text>
                </View>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.description}>{item.description}</Text>

                {/* Highlights pill row */}
                <View style={s.highlightsRow}>
                  {item.highlights.map((h) => (
                    <View key={h} style={s.pill}>
                      <Lightning size={12} color={c.accent} weight="fill" />
                      <Text style={s.pillText}>{h}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Controls */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        {/* Paging Dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true })}
              hitSlop={8}
              style={[s.dot, i === index && s.dotActive]}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${i + 1}`}
            />
          ))}
        </View>

        {/* Action Buttons */}
        {index === SLIDES.length - 1 ? (
          <View style={s.finalActions}>
            <Button
              title="Get Started  →"
              onPress={handleComplete}
              style={s.primaryBtn}
            />
            <Button
              title="Continue as Guest"
              variant="outline"
              onPress={handleGuest}
              style={s.guestBtn}
            />
          </View>
        ) : (
          <View style={s.stepActions}>
            <Tap onPress={handleNext} style={s.nextBtn} accessibilityRole="button" accessibilityLabel="Next slide">
              <Text style={s.nextBtnText}>Next</Text>
            </Tap>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  ambientBg: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    zIndex: 10,
  },
  logo: { width: 140, height: 32 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: r.pill, backgroundColor: 'rgba(255,255,255,0.7)' },
  skipText: { fontSize: 13, fontWeight: '700', color: c.muted },
  slide: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconCircleOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1c61e7',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  iconCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: { alignItems: 'center' },
  badge: {
    backgroundColor: c.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: r.pill,
    marginBottom: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: c.accent, letterSpacing: 0.5 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: c.text,
    textAlign: 'center',
    lineHeight: 33,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 360,
    marginBottom: 18,
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: r.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: c.text },
  footer: { paddingHorizontal: 22 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: c.accent },
  finalActions: { gap: 10 },
  primaryBtn: { minHeight: 50 },
  guestBtn: { minHeight: 46 },
  stepActions: { alignItems: 'center' },
  nextBtn: {
    backgroundColor: c.accent,
    borderRadius: r.pill,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: c.accent,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
