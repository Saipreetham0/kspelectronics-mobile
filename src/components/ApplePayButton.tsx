import React from 'react';
import { Platform, View } from 'react-native';
import { requireNativeView } from 'expo';

// Apple's PKPaymentButton (modules/apple-pay-button). Only on iOS builds that include the module; elsewhere it renders nothing.
type NativeProps = { style?: object; onPress?: () => void };
let Native: React.ComponentType<NativeProps> | null = null;
if (Platform.OS === 'ios') {
  try { Native = requireNativeView<NativeProps>('ApplePayButton'); } catch { Native = null; }
}
export const hasApplePayButton = () => Boolean(Native);

export default function ApplePayButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  if (!Native) return null;
  // Apple's minimum height is 30 pt; 48 matches the app's other buttons. Disabled while a payment is in flight.
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.5 : 1 }} accessibilityState={{ disabled }}>
      <Native style={{ height: 48, borderRadius: 10, overflow: 'hidden' }} onPress={onPress} />
    </View>
  );
}
