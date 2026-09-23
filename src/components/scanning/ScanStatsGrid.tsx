import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { borderRadius, monoFont } from '../../constants/theme';
import { ScanSummary } from '../../types';

interface ScanStatsGridProps {
  summary: ScanSummary;
  onFilterSelect: (filter: 'total' | 'scanned' | 'revised' | 'cancelled' | 'pending') => void;
  title?: string;
}

export const ScanStatsGrid: React.FC<ScanStatsGridProps> = ({
  summary,
  onFilterSelect,
  title,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const sectionTitle = title || t('PACKING STATISTICS & PROGRESS', 'PACKING STATISTICS & PROGRESS');

  return (
    <View style={[styles.statsSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.statsSectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="stats-chart" size={13} color={colors.primary} />
          <Text style={[styles.statsSectionTitle, { color: colors.textSecondary }]}>{sectionTitle}</Text>
        </View>
        <Text style={[styles.statsSectionSub, { color: colors.textMuted }]}>
          {summary.packed_qty}/{summary.requested_qty || summary.total_items} {t('PACKED', 'PACKED')}
        </Text>
      </View>

      <View style={styles.statsGridRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onFilterSelect('total')}
          style={[
            styles.statBox,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.statBoxVal, { color: colors.primary }]}>{summary.total_items}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{t('TOTAL', 'TOTAL')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onFilterSelect('scanned')}
          style={[
            styles.statBox,
            {
              backgroundColor: `${colors.emerald}20`,
              borderColor: `${colors.emerald}50`,
            },
          ]}
        >
          <Text style={[styles.statBoxVal, { color: colors.emerald }]}>{summary.scanned_items}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.emerald }]}>{t('SCANNED', 'SCANNED')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onFilterSelect('scanned')}
          style={[
            styles.statBox,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.statBoxVal, { color: colors.primary }]}>{summary.packed_qty}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{t('PACKED', 'PACKED')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statsGridRow, { marginTop: 6 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onFilterSelect('pending')}
          style={[
            styles.statBox,
            {
              backgroundColor: colors.amberMuted,
              borderColor: `${colors.amber}50`,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statBoxVal, { color: colors.amber }]}>{summary.pending_items}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.amber }]}>{t('PENDING', 'PENDING')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onFilterSelect('revised')}
          style={[
            styles.statBox,
            {
              backgroundColor: colors.violetMuted,
              borderColor: `${colors.violet}50`,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statBoxVal, { color: colors.violet }]}>{summary.revised_items}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.violet }]}>{t('REVISED', 'REVISED')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onFilterSelect('cancelled')}
          style={[
            styles.statBox,
            {
              backgroundColor: colors.redMuted,
              borderColor: `${colors.red}50`,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statBoxVal, { color: colors.red }]}>{summary.cancelled_items}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.red }]}>{t('CANCELLED', 'CANCELLED')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsSection: {
    padding: 12,
    borderBottomWidth: 1,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsSectionTitle: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsSectionSub: {
    fontSize: 10,
    fontFamily: monoFont,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxVal: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '800',
    lineHeight: 20,
  },
  statBoxLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
