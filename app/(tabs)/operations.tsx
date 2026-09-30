import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { BrandLogo } from '../../src/components/common/BrandLogo';
import { HeaderActions } from '../../src/components/common/HeaderActions';
import { borderRadius, spacing } from '../../src/constants/theme';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function OperationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandLogo size={32} rounded />
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Floor Operations')}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('Packing, Logistics & Execution')}</Text>
          </View>
        </View>
        <HeaderActions />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Packing Section Title */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{t('PACKING MODULES')}</Text>

        {/* WMS Packing Node Card */}
        <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.categoryHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="cube" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>{t('WMS Packing')}</Text>
              <Text style={[styles.categorySub, { color: colors.textMuted }]}>{t('Carton registration & SKU package scanning')}</Text>
            </View>
            <View style={[styles.screenCountBadge, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.screenCountText, { color: colors.primary }]}>2 {t('Screens', 'Screens')}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.subActionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/packing/wms-registration')}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <View>
                <Text style={[styles.subActionTitle, { color: colors.textPrimary }]}>{t('Registration')}</Text>
                <Text style={[styles.subActionSub, { color: colors.textMuted }]}>{t('Document & Dept')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subActionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/packing/wms-scanning')}
            >
              <Ionicons name="barcode-outline" size={16} color={colors.primary} />
              <View>
                <Text style={[styles.subActionTitle, { color: colors.textPrimary }]}>{t('Scanning')}</Text>
                <Text style={[styles.subActionSub, { color: colors.textMuted }]}>{t('Verify Items')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Container Packing Node Card */}
        <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.categoryHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.amberMuted }]}>
              <Ionicons name="boat" size={18} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>{t('Container Packing')}</Text>
              <Text style={[styles.categorySub, { color: colors.textMuted }]}>{t('Seal assignment & pallet freight verification')}</Text>
            </View>
            <View style={[styles.screenCountBadge, { backgroundColor: colors.amberMuted }]}>
              <Text style={[styles.screenCountText, { color: colors.amber }]}>2 {t('Screens', 'Screens')}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.subActionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/packing/container-registration')}
            >
              <Ionicons name="document-text-outline" size={16} color={colors.amber} />
              <View>
                <Text style={[styles.subActionTitle, { color: colors.textPrimary }]}>{t('Registration')}</Text>
                <Text style={[styles.subActionSub, { color: colors.textMuted }]}>{t('Document & Dept')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subActionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/packing/container-scanning')}
            >
              <Ionicons name="qr-code-outline" size={16} color={colors.amber} />
              <View>
                <Text style={[styles.subActionTitle, { color: colors.textPrimary }]}>{t('Scanning')}</Text>
                <Text style={[styles.subActionSub, { color: colors.textMuted }]}>{t('Pallet Loading')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Putaway Node Card */}
        <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.categoryHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.violetMuted }]}>
              <Ionicons name="layers" size={18} color={colors.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>{t('Put Away Module', 'Putaway Setup')}</Text>
              <Text style={[styles.categorySub, { color: colors.textMuted }]}>{t('Multi-GRN document allocation & Bin scanning')}</Text>
            </View>
            <View style={[styles.screenCountBadge, { backgroundColor: colors.violetMuted }]}>
              <Text style={[styles.screenCountText, { color: colors.violet }]}>2 {t('Screens', 'Screens')}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.subActionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/putaway')}
            >
              <Ionicons name="grid-outline" size={16} color={colors.violet} />
              <View>
                <Text style={[styles.subActionTitle, { color: colors.textPrimary }]}>{t('Setup & Bin')}</Text>
                <Text style={[styles.subActionSub, { color: colors.textMuted }]}>{t('Multi-GRN Select')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subActionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/putaway/scanning')}
            >
              <Ionicons name="barcode-outline" size={16} color={colors.violet} />
              <View>
                <Text style={[styles.subActionTitle, { color: colors.textPrimary }]}>{t('Scanning')}</Text>
                <Text style={[styles.subActionSub, { color: colors.textMuted }]}>{t('Bin Allocation')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logistics & Warehouse Control */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: spacing.md }]}>
          {t('LOGISTICS & WAREHOUSE CONTROL')}
        </Text>

        {[
          { id: '1', title: 'Dock & Gate Inbound', subtitle: 'Receive freight shipments & bills', icon: 'cube-outline', color: colors.primary, count: '4 Pending' },
          { id: '4', title: 'Outbound Dispatch', subtitle: 'Load assignment & bill of lading', icon: 'paper-plane-outline', color: colors.amber, count: '6 Loads' },
          { id: '5', title: 'Cycle Counting', subtitle: 'Daily inventory discrepancy audit', icon: 'clipboard-outline', color: colors.violet, count: 'Zone B' },
          { id: '6', title: 'Forklift & AGV Control', subtitle: 'Assign robotic pallet movers', icon: 'hardware-chip-outline', color: colors.blue, count: 'Online' },
        ].map((mod) => (
          <TouchableOpacity
            key={mod.id}
            style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.75}
            onPress={() =>
              Alert.alert(
                mod.title,
                `Module ${mod.title} selected. Initializing scanner and hardware sync.`
              )
            }
          >
            <View style={[styles.iconBox, { backgroundColor: `${mod.color}20` }]}>
              <Ionicons name={mod.icon as any} size={20} color={mod.color} />
            </View>

            <View style={styles.textBox}>
              <View style={styles.titleRow}>
                <Text style={[styles.modTitle, { color: colors.textPrimary }]}>{mod.title}</Text>
                <View style={[styles.countBadge, { backgroundColor: `${mod.color}20` }]}>
                  <Text style={[styles.countBadgeText, { color: mod.color }]}>{mod.count}</Text>
                </View>
              </View>
              <Text style={[styles.modSubtitle, { color: colors.textMuted }]}>{mod.subtitle}</Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm + 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  categorySub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  screenCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  screenCountText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
  },
  subActionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  subActionSub: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '600',
    marginTop: 1,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  textBox: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  modTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
