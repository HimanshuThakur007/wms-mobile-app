import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { borderRadius, spacing, monoFont } from '../../constants/theme';

interface WmsSubmitFooterProps {
  scannedCount: number;
  packedQty: number;
  submitting: boolean;
  onMarkPendingZero: () => void;
  onSubmit: () => void;
}

export const WmsSubmitFooter: React.FC<WmsSubmitFooterProps> = ({
  scannedCount,
  packedQty,
  submitting,
  onMarkPendingZero,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.submitFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={styles.submitMetaRow}>
        <Text style={[styles.submitMetaText, { color: colors.textMuted }]}>
          {scannedCount} {t('lines')} · {packedQty} {t('packed')}
        </Text>
        <View style={styles.readyBadge}>
          <View style={[styles.readyDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.readyText, { color: colors.primary }]}>{t('Ready')}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Mark Pending 0 Button */}
        <TouchableOpacity
          style={[
            styles.markZeroBtn,
            {
              backgroundColor: colors.amberMuted,
              borderColor: colors.amber,
            },
          ]}
          activeOpacity={0.8}
          onPress={onMarkPendingZero}
        >
          <Ionicons name="alert-circle-outline" size={16} color={colors.amber} />
          <Text style={[styles.markZeroBtnText, { color: colors.amber }]}>
            {t('Mark Pending 0')}
          </Text>
        </TouchableOpacity>

        {/* Submit Packing List Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1, flex: 1 },
          ]}
          activeOpacity={0.85}
          disabled={submitting}
          onPress={onSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#0B0F14" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle" size={18} color="#0B0F14" />
              <Text style={styles.submitBtnText}>{t('Submit Packing List')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  submitFooter: {
    borderTopWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  submitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitMetaText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  readyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  markZeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  markZeroBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#0B0F14',
  },
});
