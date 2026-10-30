import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

// The delivery partner (blue) and the drop point (red) on one map, re-fitted each time the rider moves.
export default function RiderMap({ rider, drop }: { rider: { lat: number; lng: number }; drop?: { lat: number; lng: number } }) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    const pts = [{ latitude: rider.lat, longitude: rider.lng }, ...(drop ? [{ latitude: drop.lat, longitude: drop.lng }] : [])];
    map.current?.fitToCoordinates(pts, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
  }, [rider.lat, rider.lng, drop?.lat, drop?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={s.box}>
      <MapView ref={map} style={StyleSheet.absoluteFill} toolbarEnabled={false} initialRegion={{ latitude: rider.lat, longitude: rider.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }} accessibilityLabel="Map showing your delivery partner">
        <Marker coordinate={{ latitude: rider.lat, longitude: rider.lng }} title="Delivery partner" pinColor="#1c61e7" />
        {drop ? <Marker coordinate={{ latitude: drop.lat, longitude: drop.lng }} title="Your drop location" pinColor="#d92d3a" /> : null}
      </MapView>
    </View>
  );
}
const s = StyleSheet.create({ box: { height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb', marginTop: 12 } });
