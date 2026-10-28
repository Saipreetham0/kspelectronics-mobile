import { Platform } from 'react-native';

// Animated's native driver only exists on iOS and Android; on the web it falls back to JS and warns, so ask for it only where it exists.
export const NATIVE = Platform.OS !== 'web';
