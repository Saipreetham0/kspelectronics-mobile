import React from 'react';
import { Animated, StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle } from 'react-native';

// Inter has one font file per weight and React Native can't pick a weight from a custom family, so the weight in `style` chooses the file.
// A style with its own fontFamily is left alone. Loaded in app/_layout.tsx.
const FILE: Record<string, string> = {
  '100': 'Inter_400Regular', '200': 'Inter_400Regular', '300': 'Inter_400Regular', '400': 'Inter_400Regular', normal: 'Inter_400Regular', '500': 'Inter_400Regular',
  '600': 'Inter_600SemiBold', '700': 'Inter_700Bold', bold: 'Inter_700Bold', '800': 'Inter_800ExtraBold', '900': 'Inter_800ExtraBold', // ponytail: 900 reuses ExtraBold to ship four files instead of five
};

function withFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const { fontWeight, fontFamily, ...rest } = StyleSheet.flatten(style) ?? {};
  return [rest, { fontFamily: fontFamily ?? FILE[String(fontWeight ?? '400')] ?? FILE['400'] }];
}

export function Text({ style, ...p }: TextProps) { return <RNText {...p} style={withFont(style)} />; }
export function TextInput({ style, ...p }: TextInputProps) { return <RNTextInput {...p} style={withFont(style)} />; }
export const AnimatedText = Animated.createAnimatedComponent(Text);
