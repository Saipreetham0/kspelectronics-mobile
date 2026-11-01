import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The floating tab bar (app/(tabs)/_layout.tsx): its height, and how far it sits above the bottom edge (clear of the gesture bar / home indicator).
export const TAB_BAR_H = 62;
export const useTabBarGap = () => Math.max(useSafeAreaInsets().bottom, 10);
// How much of a tab screen's bottom the bar covers. Tab screens scroll underneath it, so their content and sticky footers leave this much room.
export const useTabBarSpace = () => TAB_BAR_H + useTabBarGap();
