import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickActionItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, shadows } from '../../constants/theme';

interface QuickActionCardProps {
  item: QuickActionItem;
  onPress: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ item, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: item.bgLight }]}>
        <Ionicons
          name={item.iconName as keyof typeof Ionicons.glyphMap}
          size={22}
          color={item.color}
        />
        {item.badge && (
          <View style={[styles.badgeWrapper, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '47%',
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    ...shadows.sm,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm + 2,
    position: 'relative',
  },
  badgeWrapper: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
