import { useWindowDimensions } from 'react-native';

// The app lives in a phone-width column (app/_layout.tsx keeps it at most COLUMN wide and centred on tablets and the web preview), so layout maths
// has to use the column's width, not the whole window's. `full` is the window, for things that cover all of it (modals, the splash screen).
export const COLUMN = 560;
export function useScreen() {
  const { width, height } = useWindowDimensions();
  return { width: Math.min(width, COLUMN), full: width, height };
}
