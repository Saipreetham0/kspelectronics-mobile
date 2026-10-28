import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';

// The network module is native: a build made before it was added (or a runtime without it) simply shows no banner instead of crashing the app.
type NetInfoT = typeof import('@react-native-community/netinfo').default;
let NetInfo: NetInfoT | null = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch { NetInfo = null; } // eslint-disable-line @typescript-eslint/no-require-imports

// A thin red strip across the top while the phone has no internet, so a stuck screen is explained instead of looking broken.
export default function OfflineBanner() {
  const [off, setOff] = useState(false);
  useEffect(() => NetInfo?.addEventListener((s) => setOff(s.isConnected === false || s.isInternetReachable === false)), []);
  if (!off) return null;
  return (
    <SafeAreaView edges={['top']} pointerEvents="none" style={s.wrap}>
      <View style={s.bar} accessibilityRole="alert" accessibilityLiveRegion="polite"><Text style={s.t}>No internet connection. Some things may not load.</Text></View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: '#b42318' },
  bar: { paddingVertical: 5, alignItems: 'center' },
  t: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
