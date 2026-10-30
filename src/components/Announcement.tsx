import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { useAppConfig } from '@/appConfig';
import { c } from '@/theme';

// A line from the store (maintenance, delays, an offer) shown above the app, set in /api/app-config as `message`.
export default function Announcement() {
  const { message, minVersion } = useAppConfig();
  if (!message || minVersion) return null; // with minVersion the message is the update notice instead
  return <View style={{ backgroundColor: c.dealSoft, paddingVertical: 8, paddingHorizontal: 16 }} accessibilityRole="alert"><Text style={{ color: c.dealText, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{message}</Text></View>;
}
