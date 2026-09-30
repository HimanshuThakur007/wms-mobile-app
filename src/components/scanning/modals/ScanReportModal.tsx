import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ScanItem, ScanSummary } from '../../../types';
import { borderRadius, spacing, monoFont } from '../../../constants/theme';

interface ScanReportModalProps {
  visible: boolean;
  reportFilter: 'total' | 'scanned' | 'revised' | 'cancelled' | 'pending';
  cleanDoc: string;
  summary: ScanSummary;
  reportItems: ScanItem[];
  revisedItemIds: Set<number>;
  skuStatsMap: Map<string, { totalPacked: number; requestedQty: number; rowCount: number }>;
  formatItemBoxNo: (boxVal: any) => string;
  getStatusBadge: (status: string) => { label: string; color: string; bg: string; border: string };
  onFilterChange: (filter: 'total' | 'scanned' | 'revised' | 'cancelled' | 'pending') => void;
  onClose: () => void;
}

export const ScanReportModal: React.FC<ScanReportModalProps> = ({
  visible,
  reportFilter,
  cleanDoc,
  summary,
  reportItems,
  revisedItemIds,
  skuStatsMap,
  formatItemBoxNo,
  getStatusBadge,
  onFilterChange,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.reportModalCard,
            { backgroundColor: colors.surface2, borderColor: colors.border },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconBox, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="stats-chart" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Scan Statistics Report')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                {t('Doc:')} {cleanDoc} · {summary.packed_qty}/{summary.requested_qty || summary.total_items} {t('packed')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Filter Selector Tabs */}
          <View style={[styles.reportFilterRow, { borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
              <TouchableOpacity
                onPress={() => onFilterChange('total')}
                style={[
                  styles.reportFilterTab,
                  {
                    backgroundColor: reportFilter === 'total' ? colors.surface3 : colors.surface,
                    borderColor: reportFilter === 'total' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reportFilterTabText,
                    { color: reportFilter === 'total' ? colors.primary : colors.textMuted },
                  ]}
                >
                  {t('TOTAL')} ({summary.total_items})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onFilterChange('scanned')}
                style={[
                  styles.reportFilterTab,
                  {
                    backgroundColor: reportFilter === 'scanned' ? `${colors.emerald}20` : colors.surface,
                    borderColor: reportFilter === 'scanned' ? colors.emerald : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reportFilterTabText,
                    { color: reportFilter === 'scanned' ? colors.emerald : colors.textMuted },
                  ]}
                >
                  {t('SCANNED')} ({summary.scanned_items})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onFilterChange('revised')}
                style={[
                  styles.reportFilterTab,
                  {
                    backgroundColor: reportFilter === 'revised' ? colors.violetMuted : colors.surface,
                    borderColor: reportFilter === 'revised' ? colors.violet : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reportFilterTabText,
                    { color: reportFilter === 'revised' ? colors.violet : colors.textMuted },
                  ]}
                >
                  {t('REVISED')} ({summary.revised_items})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onFilterChange('cancelled')}
                style={[
                  styles.reportFilterTab,
                  {
                    backgroundColor: reportFilter === 'cancelled' ? colors.redMuted : colors.surface,
                    borderColor: reportFilter === 'cancelled' ? colors.red : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reportFilterTabText,
                    { color: reportFilter === 'cancelled' ? colors.red : colors.textMuted },
                  ]}
                >
                  {t('CANCELLED')} ({summary.cancelled_items})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onFilterChange('pending')}
                style={[
                  styles.reportFilterTab,
                  {
                    backgroundColor: reportFilter === 'pending' ? colors.amberMuted : colors.surface,
                    borderColor: reportFilter === 'pending' ? colors.amber : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reportFilterTabText,
                    { color: reportFilter === 'pending' ? colors.amber : colors.textMuted },
                  ]}
                >
                  {t('PENDING')} ({summary.pending_items})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Items List inside Modal */}
          <View style={{ flex: 1, minHeight: 200 }}>
            {reportItems.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTableSub, { color: colors.textMuted, fontSize: 13 }]}>
                  {t('No items scanned yet')}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                {reportItems.map((item, idx) => {
                  const isCancelled = item.itemstatus === 'cancelled';
                  const isPending = item.itemstatus === 'pending';
                  const skuKey = String(item.itemcode || '').trim().toLowerCase();
                  const skuStats = skuStatsMap.get(skuKey);

                  const requestedQty = Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
                  const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? 0);
                  const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;
                  const diff = isCancelled ? 0 : isPending ? requestedQty : requestedQty - totalSkuPacked;

                  const isRevised =
                    !isCancelled &&
                    !isPending &&
                    (item.itemstatus === 'revised' ||
                      revisedItemIds.has(item.id) ||
                      totalSkuPacked !== requestedQty ||
                      (skuStats && skuStats.rowCount > 1));

                  const currentStatus = isPending
                    ? 'pending'
                    : isCancelled
                    ? 'cancelled'
                    : isRevised
                    ? 'revised'
                    : item.itemstatus || 'scanned';

                  const badge = isPending
                    ? { label: t('PENDING'), color: colors.amber, bg: colors.amberMuted, border: colors.amber }
                    : getStatusBadge(currentStatus);

                  return (
                    <View
                      key={item.id || idx}
                      style={[
                        {
                          padding: 12,
                          marginBottom: 10,
                          borderRadius: borderRadius.lg || 10,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: isCancelled ? `${colors.surface}80` : colors.surface,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 4,
                          elevation: 2,
                        },
                        isCancelled && styles.tableRowCancelled,
                      ]}
                    >
                      {/* Card Top Row: Index #, Box Tag, Status Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: colors.surface3,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Text style={{ fontSize: 11, fontFamily: monoFont, fontWeight: '800', color: colors.textMuted }}>
                              #{idx + 1}
                            </Text>
                          </View>

                          <View style={[styles.boxTag, { backgroundColor: isPending ? colors.surface3 : colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 4 }]}>
                            <Text style={[styles.boxTagText, { color: isPending ? colors.textMuted : colors.primary, fontSize: 11 }]} numberOfLines={1}>
                              {isPending ? `${t('Box')}: —` : `${t('Box')}: ${formatItemBoxNo(item.box_no)}`}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: badge.bg,
                              borderColor: `${badge.border}40`,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                            },
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: badge.color, fontSize: 10, fontWeight: '800' }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      {/* Main Row: ITEM SKU */}
                      <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: monoFont, color: colors.textMuted, marginBottom: 2, letterSpacing: 0.5 }}>
                          {t('ITEM SKU')}
                        </Text>
                        <Text
                          style={[
                            {
                              fontSize: 14,
                              fontFamily: monoFont,
                              fontWeight: '800',
                              color: colors.textPrimary,
                              letterSpacing: 0.3,
                            },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                        >
                          {item.itemcode}
                        </Text>
                      </View>

                      {/* Bottom Stat Chips: DO, PCK, DIF */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        backgroundColor: colors.surface2,
                        borderRadius: borderRadius.md || 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontFamily: monoFont, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>
                            {t('ORD')}
                          </Text>
                          <Text style={{ fontSize: 13, fontFamily: monoFont, fontWeight: '800', color: colors.textSecondary }}>
                            {Math.floor(requestedQty)}
                          </Text>
                        </View>

                        <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontFamily: monoFont, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>
                            {t('PUT')}
                          </Text>
                          <Text style={{ fontSize: 13, fontFamily: monoFont, fontWeight: '800', color: isPending ? colors.amber : isCancelled ? colors.textMuted : colors.primary }}>
                            {Math.floor(packedQty)}
                          </Text>
                        </View>

                        <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontFamily: monoFont, color: colors.textMuted, fontWeight: '700', marginBottom: 2 }}>
                            {t('DIF')}
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: monoFont,
                              fontWeight: '800',
                              color: isCancelled
                                ? colors.textMuted
                                : diff === 0
                                ? colors.emerald
                                : diff < 0
                                ? colors.red
                                : colors.amber,
                            }}
                          >
                            {isCancelled ? '—' : diff}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 1,
  },
  reportFilterRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 10,
  },
  reportFilterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  reportFilterTabText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyTableSub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  tableRowCancelled: {
    opacity: 0.5,
  },
  boxTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  boxTagText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowTextCancelled: {
    textDecorationLine: 'line-through',
  },
});
