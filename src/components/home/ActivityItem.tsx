import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityRecord } from '../../types';
import { Badge } from '../common/Badge';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

interface ActivityItemProps {
  item: ActivityRecord;
  onPress: () => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ item, onPress }) => {
  const { colors } = useTheme();

  const getStatusLabel = () => {
    switch (item.status) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'PROCESSING':
        return 'Processing';
      case 'ALERT':
        return 'Check Needed';
      default:
        return item.status;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.code, { color: colors.primary }]}>{item.code}</Text>
          <Badge status={item.status} label={getStatusLabel()} size="sm" />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.location}</Text>
          </View>
          <Text style={[styles.dotSeparator, { color: colors.textMuted }]}>•</Text>
          <View style={styles.metaItem}>
            <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.itemsCount} units</Text>
          </View>
          <Text style={[styles.dotSeparator, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>{item.timestamp}</Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  code: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dotSeparator: {
    fontSize: 12,
    marginHorizontal: 5,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
