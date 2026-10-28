import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { c } from '@/theme';

// Blinkit's "confirm location" map: the pin stays in the middle and you drag the map under it. onMove fires once the map comes to rest.
// The map mounts a moment after the sheet's slide-in (Android can draw a blank map inside a Modal that is still animating), and if it never
// reports ready the box says so, instead of staying silently grey.
export default function MapPicker({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const map = useRef<MapView>(null);
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 350); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!show || ready) return; const t = setTimeout(() => setFailed(true), 6000); return () => clearTimeout(t); }, [show, ready]);
  // The pin stays in the middle, so zooming keeps it on the same spot; the map camera does the work.
  const zoomBy = async (d: number) => {
    const cam = await map.current?.getCamera();
    if (cam) map.current?.animateCamera({ zoom: Math.max(3, Math.min(20, (cam.zoom ?? 17) + d)) }, { duration: 250 });
  };
  return (
    <View style={s.box}>
      {show && (
        <MapView ref={map} style={StyleSheet.absoluteFill} mapType="standard" userInterfaceStyle="light" zoomControlEnabled={false} initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
          onMapReady={() => { setReady(true); setFailed(false); }} onPress={(e) => map.current?.animateCamera({ center: e.nativeEvent.coordinate }, { duration: 300 })} onRegionChangeComplete={(r) => { if (ready) onMove(r.latitude, r.longitude); }}
          showsUserLocation toolbarEnabled={false} accessibilityLabel="Map: drag to move the pin" />
      )}
      {!ready && !failed && <View style={s.center}><ActivityIndicator color={c.loader} /></View>}
      {failed && !ready && <View style={s.center}><Text style={s.msg}>The map could not load on this device. You can still tap “Just deliver here”.</Text></View>}
      {ready && (
        <View style={s.zoom}>
          <Pressable onPress={() => zoomBy(1)} style={s.zbtn} accessibilityRole="button" accessibilityLabel="Zoom in"><Ionicons name="add" size={24} color={c.text} /></Pressable>
          <View style={s.zline} />
          <Pressable onPress={() => zoomBy(-1)} style={s.zbtn} accessibilityRole="button" accessibilityLabel="Zoom out"><Ionicons name="remove" size={24} color={c.text} /></Pressable>
        </View>
      )}
      {ready && <View pointerEvents="none" style={s.hint}><Text style={s.hintT}>Drag the map or tap to drop the pin</Text></View>}
      {ready && <View pointerEvents="none" style={s.pin}><Ionicons name="location-sharp" size={44} color={c.danger} /></View>}
    </View>
  );
}
const s = StyleSheet.create({
  // No overflow:hidden or rounded corners here: Android draws a MapView black when a clipping parent sits above it.
  box: { height: 280, backgroundColor: '#e5e7eb' },
  center: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { color: '#444', textAlign: 'center', lineHeight: 20 },
  zoom: { position: 'absolute', right: 10, bottom: 14, backgroundColor: '#fff', borderRadius: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  zbtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zline: { height: StyleSheet.hairlineWidth, backgroundColor: '#ccc', marginHorizontal: 8 },
  hint: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  hintT: { color: '#fff', fontSize: 12, fontWeight: '600' },
  pin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -22, marginTop: -44 },
});
