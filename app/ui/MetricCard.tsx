import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'primary' | 'secondary';
}

export function MetricCard({ label, value, unit, variant = 'primary' }: MetricCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: variant === 'primary' ? colors.tint + '20' : colors.background,
          borderColor: variant === 'primary' ? colors.tint : colors.icon + '30',
        },
      ]}>
      <Text style={[styles.label, { color: colors.icon }]}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: colors.text }]}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
        {unit && (
          <Text style={[styles.unit, { color: colors.icon }]}>{unit}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
  },
});

