import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Text } from '@/components/Text';
import { Button, Center } from '@/components/ui';
import { c } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: true }} />
      <Center>
        <Text style={s.code}>404</Text>
        <Text style={s.title}>Page Not Found</Text>
        <Text style={s.desc}>
          The page or product link you followed doesn't exist or has been moved.
        </Text>
        <Button
          title="Back to Home"
          onPress={() => router.replace('/(tabs)')}
          style={{ minWidth: 180 }}
        />
      </Center>
    </>
  );
}

const s = StyleSheet.create({
  code: {
    fontSize: 56,
    fontWeight: '900',
    color: c.accent,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: c.text,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
    lineHeight: 20,
  },
});

