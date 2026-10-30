import React from 'react';
import { Linking, View } from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import RiderMap from '@/components/RiderMap';
import type { Rider } from '@/types';
import { c } from '@/theme';

// Who is bringing the order: name, a call button, the ETA and a live map. Rendered only when the store sends a rider position.
export default function RiderCard({ rider, eta, drop }: { rider: Rider; eta?: string | null; drop?: { lat: number; lng: number } }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '900', color: c.accent, fontSize: 18 }}>{rider.name.trim()[0]?.toUpperCase() ?? '?'}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800' }}>{rider.name}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>{eta ? `Arriving ${eta}` : 'On the way to you'}</Text>
        </View>
        {rider.phone ? <Button title="Call" variant="outline" style={{ minHeight: 40, paddingHorizontal: 18 }} onPress={() => Linking.openURL(`tel:${rider.phone}`).catch(() => {})} /> : null}
      </View>
      <RiderMap rider={rider} drop={drop} />
    </View>
  );
}
