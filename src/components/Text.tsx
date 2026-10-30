import React from 'react';
import { Animated, StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { StyleProp, TextInputInstance, TextInputProps, TextProps, TextStyle } from 'react-native';

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

// Text follows the phone's font size setting, up to 1.4x: past that the fixed-height controls (buttons, tabs, chips) would clip.
export function Text({ style, ...p }: TextProps) { return <RNText maxFontSizeMultiplier={1.4} {...p} style={withFont(style)} />; }
export const TextInput = React.forwardRef<TextInputInstance, TextInputProps>(({ style, ...p }, ref) => <RNTextInput ref={ref} underlineColorAndroid="transparent" maxFontSizeMultiplier={1.4} {...p} style={withFont(style)} />);
TextInput.displayName = 'TextInput';
export const AnimatedText = Animated.createAnimatedComponent(Text);
