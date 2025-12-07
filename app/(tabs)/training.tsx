import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function TrainingScreen() {
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? 'light';
  const colors = Colors[resolvedScheme];

  console.log('=== TRAINING SCREEN COLOR DEBUG ===');
  console.log('colorScheme:', colorScheme);
  console.log('resolvedScheme:', resolvedScheme);
  console.log('colors.background:', colors.background);
  console.log('colors.text:', colors.text);
  console.log('backgroundColor style:', colors.background);
  console.log('===================================');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Training</Text>
        <Text style={[styles.message, { color: colors.icon }]}>
          Training functionality coming soon.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});

