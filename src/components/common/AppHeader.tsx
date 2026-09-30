import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { BrandLogo } from './BrandLogo';
import { HeaderActions } from './HeaderActions';
import { borderRadius, spacing, monoFont } from '../../constants/theme';

export interface AppHeaderProps {
  // Navigation & Back
  showBack?: boolean;
  onBack?: () => void;

  // Title / Subtitle / Module Tag
  title?: string;
  subtitle?: string;
  moduleTag?: string;
  moduleTagColor?: string;

  // Document Number & Department chips
  docNumber?: string;
  departments?: string[];

  // Right Badge / Counter Box
  countNumber?: number;
  countLabel?: string;
  countColor?: string;

  // Progress Bar
  packedQty?: number;
  requestedQty?: number;
  totalItems?: number;
  progressPct?: number;

  // Box / Pallet Switcher
  boxLabel?: string;
  currentBoxStr?: string;
  onPrevBox?: () => void;
  onNextBox?: () => void;
  disablePrevBox?: boolean;

  // Top Bar Actions
  showLogo?: boolean;
  showActions?: boolean;
  showLogout?: boolean;
  rightElement?: React.ReactNode;
  accentColor?: string;
}

export function AppHeader({
  showBack = false,
  onBack,
  title,
  subtitle,
  moduleTag,
  moduleTagColor,
  docNumber,
  departments = [],
  countNumber,
  countLabel,
  countColor,
  packedQty,
  requestedQty,
  totalItems,
  progressPct,
  boxLabel,
  currentBoxStr,
  onPrevBox,
  onNextBox,
  disablePrevBox = false,
  showLogo = true,
  showActions = true,
  showLogout = true,
  rightElement,
  accentColor,
}: AppHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const themeAccent = accentColor || colors.primary;
  const tagAccent = moduleTagColor || themeAccent;
  const badgeAccent = countColor || themeAccent;

  const hasProgress = progressPct !== undefined || packedQty !== undefined;
  const hasBoxNav = Boolean(currentBoxStr);

  return (
    <View style={styles.container}>
      {/* ── Main Top Section ────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Top Row: Back button, Logo, Header Actions */}
        <View style={styles.headerTopRow}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>{t('Back')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={styles.topRightRow}>
            {rightElement}
            {showLogo && <BrandLogo size={28} rounded />}
            {showActions && <HeaderActions showLogout={showLogout} />}
          </View>
        </View>

        {/* Title / Module Tag / Doc Info Row */}
        {(title || moduleTag || docNumber || countNumber !== undefined) && (
          <View style={styles.docInfoRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {moduleTag && (
                <View style={styles.statusLiveRow}>
                  <View style={[styles.livePulse, { backgroundColor: tagAccent }]} />
                  <Text style={[styles.moduleTag, { color: tagAccent }]} numberOfLines={1}>
                    {t(moduleTag)}
                  </Text>
                </View>
              )}

              {docNumber ? (
                <Text style={[styles.docNoText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                  {t(docNumber)}
                </Text>
              ) : title ? (
                <Text style={[styles.docNoText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                  {t(title)}
                </Text>
              ) : null}

              {subtitle && (
                <Text style={[styles.subtitleText, { color: colors.textMuted }]} numberOfLines={2}>
                  {t(subtitle)}
                </Text>
              )}

              {departments.length > 0 && (
                <View style={styles.deptsRow}>
                  {departments.map((d) => (
                    <View key={d} style={[styles.deptChip, { backgroundColor: `${tagAccent}15` }]}>
                      <Text style={[styles.deptChipText, { color: tagAccent }]} numberOfLines={1}>{t(d)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {countNumber !== undefined && (
              <View style={[styles.scannedCountBox, { backgroundColor: `${badgeAccent}12`, borderColor: `${badgeAccent}30` }]}>
                <Text style={[styles.scannedCountNum, { color: badgeAccent }]}>
                  {countNumber}
                </Text>
                {countLabel && (
                  <Text style={[styles.scannedCountLabel, { color: colors.textMuted }]}>
                    {t(countLabel)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Progress Section */}
        {hasProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {packedQty !== undefined ? packedQty : 0}/{(requestedQty || totalItems) || 0} {t('qty packed')}
              </Text>
              <Text style={[styles.progressPctText, { color: themeAccent }]}>
                {progressPct || 0}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.surface3 }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPct || 0}%`, backgroundColor: themeAccent },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* ── Box / Pallet Navigation Bar (If provided) ────────────────── */}
      {hasBoxNav && (
        <View style={[styles.boxNavBar, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onPrevBox}
            disabled={disablePrevBox}
            focusable={false}
            accessible={false}
            style={[
              styles.boxNavBtn,
              { backgroundColor: colors.surface, borderColor: themeAccent },
              disablePrevBox && [styles.boxNavBtnDisabled, { backgroundColor: colors.surface3, borderColor: colors.border }],
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={disablePrevBox ? colors.textMuted : themeAccent}
            />
            <Text
              style={[
                styles.boxNavBtnText,
                { color: disablePrevBox ? colors.textMuted : themeAccent },
              ]}
            >
              {t('Prev')}
            </Text>
          </TouchableOpacity>

          <View style={styles.currentBoxCenter}>
            <View style={[styles.boxIconWrap, { backgroundColor: `${themeAccent}20` }]}>
              <Ionicons name="cube" size={16} color={themeAccent} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.currentBoxLabel, { color: colors.textMuted }]}>
                {t(boxLabel || 'CURRENT BOX')}
              </Text>
              <Text style={[styles.currentBoxNum, { color: colors.textPrimary }]}>
                {currentBoxStr}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onNextBox}
            focusable={false}
            accessible={false}
            style={[styles.boxNavBtnNext, { backgroundColor: themeAccent }]}
          >
            <Text style={styles.boxNavBtnNextText}>{t('Next')}</Text>
            <Ionicons name="chevron-forward" size={14} color="#0B0F14" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  docInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    gap: 12,
  },
  statusLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moduleTag: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  docNoText: {
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 2,
  },
  deptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  deptChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  deptChipText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  scannedCountBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 58,
  },
  scannedCountNum: {
    fontSize: 20,
    fontFamily: monoFont,
    fontWeight: '900',
    lineHeight: 22,
  },
  scannedCountLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressSection: {
    marginTop: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  progressPctText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  boxNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  boxNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  boxNavBtnDisabled: {
    opacity: 0.5,
  },
  boxNavBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  currentBoxCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boxIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBoxLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentBoxNum: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  boxNavBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  boxNavBtnNextText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#0B0F14',
  },
});
