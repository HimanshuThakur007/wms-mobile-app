import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/context/ThemeContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { BrandLogo } from '../../../src/components/common/BrandLogo';
import { HeaderActions } from '../../../src/components/common/HeaderActions';
import { borderRadius, spacing } from '../../../src/constants/theme';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function PackingModulesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>{t('Back')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={28} rounded />
            <HeaderActions />
          </View>
        </View>

        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{t('PACKING HUB')}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Packing Modules')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('Select workflow module to begin registration or SKU scanning')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Module 1: WMS Packing */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/packing/wms-registration')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="cube" size={24} color={colors.primary} />
            </View>
            <View style={[styles.cardTag, { backgroundColor: colors.primaryMuted, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.cardTagText, { color: colors.primary }]}>{t('ACTIVE')}</Text>
            </View>
          </View>

          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('WMS Packing')}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {t('Standard carton packing, document registration, department filter, and item verification')}
          </Text>

          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <View style={styles.metaCol}>
              <Text style={[styles.metaVal, { color: colors.primary }]}>2</Text>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('WORKFLOWS')}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={[styles.metaVal, { color: colors.primary }]}>{t('LIVE')}</Text>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('API SYNC')}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Module 2: Container Packing */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/packing/container-registration')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.amberMuted }]}>
              <Ionicons name="boat" size={24} color={colors.amber} />
            </View>
            <View style={[styles.cardTag, { backgroundColor: colors.amberMuted, borderColor: `${colors.amber}40` }]}>
              <Text style={[styles.cardTagText, { color: colors.amber }]}>{t('PALLET / TIER')}</Text>
            </View>
          </View>

          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('Container Packing')}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {t('Container seal registration, pallet tier stacking, master carton assignment, and load manifest')}
          </Text>

          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <View style={styles.metaCol}>
              <Text style={[styles.metaVal, { color: colors.amber }]}>2</Text>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('WORKFLOWS')}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={[styles.metaVal, { color: colors.amber }]}>{t('FREIGHT')}</Text>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('LOGISTICS')}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={colors.amber} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  titleSection: {
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  moduleCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  cardTagText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  metaCol: {
    alignItems: 'flex-start',
  },
  metaVal: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  metaLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    marginTop: 1,
  },
});
