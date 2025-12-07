/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  const finalColor = colorFromProps ? colorFromProps : Colors[theme][colorName];
  
  if (colorName === 'background') {
    console.log(`[useThemeColor] colorName: ${colorName}, theme: ${theme}, finalColor: ${finalColor}`);
  }

  return finalColor;
}
