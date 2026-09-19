// A single source of truth for every colour in the app.
// Uses the same values that were already hardcoded in the screens,
// so the look stays identical — the colours are just centralised now.
import { useColorScheme } from '@/hooks/use-color-scheme';

const darkPalette = {
  background: '#000000',
  card: '#1c1c1e',
  text: '#ffffff',
  textMuted: '#8e8e93',
  inputBackground: '#1c1c1e',
  border: '#3a3a3c',
  accent: '#007AFF',
};

const lightPalette = {
  background: '#ffffff',
  card: '#f2f2f7',
  text: '#000000',
  textMuted: '#666666',
  inputBackground: '#f2f2f7',
  border: '#dddddd',
  accent: '#007AFF',
};

export function useTheme() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  return { dark, colors: dark ? darkPalette : lightPalette };
}