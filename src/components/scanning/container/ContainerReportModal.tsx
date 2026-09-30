import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ScanItem, ScanSummary } from '../../../types';
import { getStatusBadge, SkuStat } from '../../../utils/scanHelpers';
import { monoFont } from '../../../constants/theme';

interface ContainerReportModalProps {
  visible: boolean;
  onClose: () => void;
  cleanDoc: string;
  summary: ScanSummary;
  reportFilter: 'total' | 'scanned' | 'revised' | 'cancelled' | 'pending';
  setReportFilter: (filter: 'total' | 'scanned' | 'revised' | 'cancelled' | 'pending') => void;
  reportItems: ScanItem[];
  skuStatsMap: Map<string, SkuStat>;
  revisedItemIds: Set<number>;
  formatItemBoxNo: (boxVal: any) => string;
}

export function ContainerReportModal({
  visible,
  onClose,
  cleanDoc,
  summary,
  reportFilter,
  setReportFilter,
  reportItems,
  skuStatsMap,
  revisedItemIds,
  formatItemBoxNo,
}: ContainerReportModalProps) {
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
            <View style={[styles.modalIconBox, { backgroundColor: colors.amberMuted }]}>
              <Ionicons name="stats-chart" size={20} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Container Loading Report')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                {t('Doc:')} {cleanDoc} · {summary.packed_qty}/{summary.requested_qty || summary.total_items} {t('loaded')}
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
                onPress={() => setReportFilter('total')}
                style={[
                  styles.reportFilterTab,
                  {
                    backgroundColor: reportFilter === 'total' ? colors.surface3 : colors.surface,
                    borderColor: reportFilter === 'total' ? colors.amber : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reportFilterTabText,
                    { color: reportFilter === 'total' ? colors.amber : colors.textMuted },
                  ]}
                >
                  {t('TOTAL')} ({summary.total_items})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setReportFilter('scanned')}
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
                  {t('LOADED')} ({summary.scanned_items})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setReportFilter('revised')}
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
                onPress={() => setReportFilter('cancelled')}
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
                onPress={() => setReportFilter('pending')}
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

          {/* Items Table inside Modal */}
          <View style={[styles.reportTableContainer, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.tableHeaderRow, { backgroundColor: colors.surface3, borderBottomColor: colors.border }]}>
              <Text style={[styles.thCell, { color: colors.textMuted, width: 24, textAlign: 'center' }]}>#</Text>
              <Text style={[styles.thCell, { color: colors.textMuted, width: 68 }]}>{t('TIER')}</Text>
              <Text style={[styles.thCell, { color: colors.textMuted, flex: 1 }]}>{t('ITEM SKU')}</Text>
              <Text style={[styles.thCell, { color: colors.textMuted, width: 32, textAlign: 'center' }]}>{t('DO')}</Text>
              <Text style={[styles.thCell, { color: colors.textMuted, width: 44, textAlign: 'center' }]}>{t('PCK')}</Text>
              <Text style={[styles.thCell, { color: colors.textMuted, width: 28, textAlign: 'center' }]}>{t('DIF')}</Text>
              <Text style={[styles.thCell, { color: colors.textMuted, width: 50, textAlign: 'center' }]}>{t('STAT')}</Text>
            </View>

            <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              {reportItems.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Ionicons name="document-text-outline" size={28} color={colors.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>
                    {t('No items scanned to container')}
                  </Text>
                </View>
              ) : (
                reportItems.map((item, idx) => {
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
                    : getStatusBadge(currentStatus, colors, t);

                  return (
                    <View
                      key={item.id || idx}
                      style={[
                        styles.tableRow,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: idx % 2 === 1 ? colors.surface2 : colors.surface,
                        },
                        isCancelled && styles.tableRowCancelled,
                      ]}
                    >
                      <Text style={[styles.rowNum, { width: 24, textAlign: 'center', color: colors.textMuted }]}>
                        {idx + 1}
                      </Text>

                      <View style={{ width: 68 }}>
                        <View style={[styles.boxTag, { backgroundColor: isPending ? colors.surface3 : colors.amberMuted }]}>
                          <Text style={[styles.boxTagText, { color: isPending ? colors.textMuted : colors.amber }]} numberOfLines={1}>
                            {isPending ? '—' : formatItemBoxNo(item.box_no)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flex: 1, paddingRight: 4, justifyContent: 'center' }}>
                        <Text
                          style={[
                            styles.rowItemCode,
                            { color: colors.textPrimary },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                          numberOfLines={1}
                        >
                          {item.itemcode}
                        </Text>
                      </View>

                      {/* DO */}
                      <View style={{ width: 32, alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.rowNum,
                            { color: colors.textSecondary },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                        >
                          {Math.floor(requestedQty)}
                        </Text>
                      </View>

                      {/* PCK */}
                      <View style={{ width: 44, alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.rowNum,
                            { color: isPending ? colors.amber : isCancelled ? colors.textMuted : colors.amber, fontWeight: '800' },
                          ]}
                        >
                          {Math.floor(packedQty)}
                        </Text>
                      </View>

                      {/* DIF */}
                      <View style={{ width: 28, alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.rowDiffText,
                            {
                              color: isCancelled
                                ? colors.textMuted
                                : diff === 0
                                ? colors.emerald
                                : diff < 0
                                ? colors.red
                                : colors.amber,
                              fontWeight: diff === 0 ? '700' : '800',
                            },
                            isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                          ]}
                        >
                          {isCancelled ? '—' : diff}
                        </Text>
                      </View>

                      {/* STAT */}
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: badge.bg,
                              borderColor: `${badge.border}40`,
                            },
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  reportModalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  reportFilterRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 10,
  },
  reportFilterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  reportFilterTabText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  reportTableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyTableSub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableRowCancelled: {
    opacity: 0.5,
  },
  rowNum: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  boxTag: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  boxTagText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  rowItemCode: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  rowTextCancelled: {
    textDecorationLine: 'line-through',
  },
  rowDiffText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
