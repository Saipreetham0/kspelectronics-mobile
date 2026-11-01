const expo = require('eslint-config-expo/flat');
// Hook-order bugs (rules-of-hooks) fail CI. The React-compiler and style rules in the Expo preset are off: they flag the app's Animated.Value pattern and cosmetic things, not bugs.
const off = ['react-hooks/refs', 'react-hooks/set-state-in-effect', 'react-hooks/immutability', 'react-hooks/preserve-manual-memoization', 'react/display-name', 'react/no-unescaped-entities', 'import/namespace'];
module.exports = [
  ...expo,
  { ignores: ['node_modules/', 'dist/', '.expo/', 'android/', 'ios/'] },
  { rules: Object.fromEntries(off.map((r) => [r, 'off'])) },
];
