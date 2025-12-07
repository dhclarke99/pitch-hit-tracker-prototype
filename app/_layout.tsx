import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? 'light';
  const colors = Colors[resolvedScheme];

  console.log('=== ROOT LAYOUT COLOR DEBUG ===');
  console.log('colorScheme from hook:', colorScheme);
  console.log('resolvedScheme:', resolvedScheme);
  console.log('colors object:', colors);
  console.log('colors.background:', colors.background);
  console.log('colors.text:', colors.text);
  console.log('colors.tint:', colors.tint);
  console.log('==============================');

  const theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: '#E5E5E5',
      notification: colors.secondary,
    },
  };

  console.log('Navigation theme:', theme);
  console.log('Navigation theme.colors.background:', theme.colors.background);

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
