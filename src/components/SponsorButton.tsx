import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import { useAppConfig } from '@/appConfig';
import { logoOf, useBrands } from '@/brands';
import type { RemoteSponsor } from '@/appConfig';
import { isHttps, openHttps } from '@/links';
import { track } from '@/analytics';
import { NATIVE } from '@/native';
import { c } from '@/theme';

export const SPONSOR_SIZE = 56;

// Shown until the store sets its own sponsor (APP_SPONSOR) or switches the slot off: KSP is an authorised Bambu Lab reseller.
const BUILT_IN: RemoteSponsor = { id: 'bambu-lab', label: 'Bambu Lab', bg: '#00ae42', fg: '#ffffff', brand: 'bambu-lab' };

const live = (s: RemoteSponsor, now = Date.now()) => (!s.from || Date.parse(s.from) <= now) && (!s.until || now < Date.parse(s.until));
// The sponsor to show: the store's (while its dates run), otherwise the built-in one; nothing when the store sends null.
export function useSponsor(): RemoteSponsor | null {
  const cfg = useAppConfig().sponsor;
  const logo = logoOf(useBrands(), BUILT_IN.brand ?? '');
  if (cfg === null) return null;
  if (cfg && cfg.id && cfg.label && live(cfg)) return cfg;
  return logo ? { ...BUILT_IN, image: logo, bg: '#ffffff' } : BUILT_IN; // the brand's own logo from WordPress, on white
}

// JioMart's round brand button beside the tab bar: a logo (or the brand name) in a ring that pulses gently a few times, then rests.
export default function SponsorButton({ sponsor }: { sponsor: RemoteSponsor }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
        Animated.delay(900),
      ]), { iterations: 3 });
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [pulse, sponsor.id]);

  const open = () => {
    track('banner_tap', { id: `sponsor-${sponsor.id}` });
    if (sponsor.link?.startsWith('/')) return router.push(sponsor.link as never);
    if (sponsor.link && isHttps(sponsor.link)) return openHttps(sponsor.link);
    if (sponsor.brand) return router.push({ pathname: '/(tabs)/shop', params: { brand: sponsor.brand, brandName: sponsor.label } });
    if (sponsor.category) return router.push({ pathname: '/(tabs)/shop', params: { category: sponsor.category } });
    router.push({ pathname: '/(tabs)/shop', params: { search: sponsor.search ?? sponsor.label } });
  };
  const bg = sponsor.bg ?? '#ffffff', fg = sponsor.fg ?? '#1f1f1f';
  const words = sponsor.label.split(/\s+/);
  return (
    <Pressable onPress={open} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Sponsored: ${sponsor.label}`} style={({ pressed }) => [s.wrap, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Animated.View pointerEvents="none" style={[s.ring, { borderColor: bg.toLowerCase() === '#ffffff' ? c.accent : bg, /* a white badge (logo) would pulse invisibly */ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] }]} />
      <View style={[s.badge, { backgroundColor: bg }]}>
        {isHttps(sponsor.image)
          ? <Image source={sponsor.image} style={s.logo} contentFit="contain" accessibilityIgnoresInvertColors />
          : <Text style={[s.word, { color: fg, fontSize: words.length > 1 ? 11 : 12 }]} numberOfLines={2} adjustsFontSizeToFit>{words.join('\n')}</Text>}
      </View>
      <Text style={s.tag} allowFontScaling={false}>Ad</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { width: SPONSOR_SIZE, height: SPONSOR_SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SPONSOR_SIZE, height: SPONSOR_SIZE, borderRadius: SPONSOR_SIZE / 2, borderWidth: 3 },
  badge: { width: SPONSOR_SIZE, height: SPONSOR_SIZE, borderRadius: SPONSOR_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  logo: { width: '78%', height: '78%' },
  word: { fontWeight: '800', textAlign: 'center', lineHeight: 13, letterSpacing: -0.2 },
  tag: { position: 'absolute', top: -5, right: -4, fontSize: 11, fontWeight: '800', color: '#fff', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 4, overflow: 'hidden' },
});
