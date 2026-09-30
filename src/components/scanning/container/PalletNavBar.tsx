import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { monoFont } from '../../../constants/theme';

interface PalletNavBarProps {
  currentPallet: number;
  formattedBoxNo: string;
  packedQty?: number;
  requestedQty?: number;
  progressPct?: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PalletNavBar({
  currentPallet,
  formattedBoxNo,
  packedQty = 0,
  requestedQty = 0,
  progressPct = 0,
  onPrev,
  onNext,
}: PalletNavBarProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const isPrevDisabled = currentPallet <= 1;

  return (
    <View style={[styles.controlBar, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
      {/* Progress Track */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTextRow}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {packedQty}/{requestedQty} {t('qty')}
          </Text>
          <Text style={[styles.progressPctText, { color: colors.amber }]}>{progressPct}%</Text>
        </View>
        <View style={[styles.progressBarTrack, { backgroundColor: colors.surface3 }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPct}%`, backgroundColor: colors.amber },
            ]}
          />
        </View>
      </View>

      {/* Pallet Navigation */}
      <View style={styles.boxNavGroup}>
        <TouchableOpacity
          onPress={onPrev}
          disabled={isPrevDisabled}
          focusable={false}
          accessible={false}
          style={[
            styles.boxNavIconBtn,
            { backgroundColor: colors.surface, borderColor: colors.amber },
            isPrevDisabled && [styles.boxNavIconBtnDisabled, { backgroundColor: colors.surface3, borderColor: colors.border }],
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={14}
            color={isPrevDisabled ? colors.textMuted : colors.amber}
          />
        </TouchableOpacity>

        <View style={[styles.boxPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="boat" size={12} color={colors.amber} />
          <Text style={[styles.boxPillText, { color: colors.textPrimary }]}>
            {formattedBoxNo}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onNext}
          focusable={false}
          accessible={false}
          style={[styles.boxNavIconBtnNext, { backgroundColor: colors.amber }]}
        >
          <Ionicons name="chevron-forward" size={14} color="#0B0F14" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 12,
  },
  progressWrap: {
    flex: 1,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  progressText: {
    fontSize: 10,
    fontFamily: monoFont,
  },
  progressPctText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  boxNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  boxNavIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxNavIconBtnDisabled: {
    opacity: 0.5,
  },
  boxNavIconBtnNext: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  boxPillText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
