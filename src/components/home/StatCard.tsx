import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, shadows } from '../../constants/theme';

interface StatCardProps {
  item: StatItem;
}

export const StatCard: React.FC<StatCardProps> = ({ item }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
          <Ionicons
            name={item.iconName as keyof typeof Ionicons.glyphMap}
            size={20}
            color={item.iconColor}
          />
        </View>
        <View
          style={[
            styles.changeBadge,
            {
              backgroundColor: item.isPositive ? colors.successLight : colors.dangerLight,
            },
          ]}
        >
          <Ionicons
            name={item.isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={item.isPositive ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.changeText,
              { color: item.isPositive ? colors.success : colors.danger },
            ]}
          >
            {item.change}
          </Text>
        </View>
      </View>

      <Text style={[styles.value, { color: colors.textPrimary }]}>{item.value}</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
        {item.title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
});
