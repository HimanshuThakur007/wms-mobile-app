import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { BrandLogo } from '../../src/components/common/BrandLogo';
import { HeaderActions } from '../../src/components/common/HeaderActions';
import { borderRadius, spacing } from '../../src/constants/theme';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFormattedDate = () => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).toUpperCase();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* ── Top Bar ──────────────────────────────────────── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <BrandLogo size={34} rounded />
          <View>
            <Text style={[styles.facilityText, { color: colors.primary }]}>MARKET99 · WH-01</Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{getFormattedDate()}</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <HeaderActions />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting Banner ─────────────────────────────── */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            {getGreeting()},
          </Text>
          <Text style={[styles.greetingName, { color: colors.textPrimary }]}>
            {user?.name || 'Operations Lead'}
          </Text>
        </View>

        {/* ── Module Cards ─────────────────────────────────── */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
          WAREHOUSE MODULES
        </Text>

        {/* Module 1: Packing */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/packing')}
        >
          <View style={styles.moduleCardHeader}>
            <View style={[styles.moduleIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="cube" size={24} color={colors.primary} />
            </View>
            <View style={styles.moduleBadgeRow}>
              <View style={[styles.neonBadge, { backgroundColor: colors.primaryMuted, borderColor: `${colors.primary}40` }]}>
                <Text style={[styles.neonBadgeText, { color: colors.primary }]}>2 MODULES</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>Packing</Text>
          <Text style={[styles.moduleDesc, { color: colors.textSecondary }]}>
            Carton registration, barcode SKU verification, container freight & pallet assignment
          </Text>

          <View style={[styles.moduleFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.moduleFooterText, { color: colors.primary }]}>
              Open Packing Modules
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Module 2: Put Away */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/putaway')}
        >
          <View style={styles.moduleCardHeader}>
            <View style={[styles.moduleIconWrap, { backgroundColor: colors.violetMuted }]}>
              <Ionicons name="layers" size={24} color={colors.violet} />
            </View>
            <View style={styles.moduleBadgeRow}>
              <View style={[styles.neonBadge, { backgroundColor: colors.violetMuted, borderColor: `${colors.violet}40` }]}>
                <Text style={[styles.neonBadgeText, { color: colors.violet }]}>2 MODULES</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>Put Away</Text>
          <Text style={[styles.moduleDesc, { color: colors.textSecondary }]}>
            Standard SKU bin putaway, bulk pallet routing, bin capacity tracking & aisle sorting
          </Text>

          <View style={[styles.moduleFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.moduleFooterText, { color: colors.violet }]}>
              Open Put Away Modules
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.violet} />
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  facilityText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '600',
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: spacing.lg,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '600',
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  moduleCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  moduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconWrap: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleBadgeRow: {
    flexDirection: 'row',
  },
  neonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  neonBadgeText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  moduleDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  moduleFooterText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
});
