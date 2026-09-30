import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { ScanItem } from '../../types';
import { borderRadius, spacing, monoFont } from '../../constants/theme';

interface WmsScannedItemsTableProps {
  allScannedItems: ScanItem[];
  showAllCartItems: boolean;
  loading: boolean;
  revisedItemIds: Set<number>;
  skuStatsMap: Map<string, { totalPacked: number; requestedQty: number; rowCount: number }>;
  formatItemBoxNo: (boxVal: any) => string;
  getStatusBadge: (status: string) => { label: string; color: string; bg: string; border: string };
  onToggleShowAllCartItems: () => void;
  onReload: () => void;
  onOpenCancelModal: (id: number) => void;
  onOpenEditQtyModal: (item: ScanItem) => void;
}

export const WmsScannedItemsTable: React.FC<WmsScannedItemsTableProps> = ({
  allScannedItems,
  showAllCartItems,
  loading,
  revisedItemIds,
  skuStatsMap,
  formatItemBoxNo,
  getStatusBadge,
  onToggleShowAllCartItems,
  onReload,
  onOpenCancelModal,
  onOpenEditQtyModal,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.tableCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={[styles.tableCardHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.tableCardTitle, { color: colors.textPrimary }]}>{t('Scanned Items')}</Text>
          <Text style={[styles.tableCardSub, { color: colors.textMuted }]}>
            {allScannedItems.length > 5 && !showAllCartItems
              ? `${t('ALL BOXES')} · ${t('Latest 5 of')} ${allScannedItems.length} ${t('items')}`
              : `${t('ALL BOXES')} · ${t('Showing all')} ${allScannedItems.length} ${t('items')}`}
          </Text>
        </View>
        {allScannedItems.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {allScannedItems.length > 5 && (
              <TouchableOpacity
                style={[
                  styles.refreshBtn,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={onToggleShowAllCartItems}
              >
                <Ionicons
                  name={showAllCartItems ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={14}
                  color={colors.textPrimary}
                />
                <Text style={[styles.refreshBtnText, { color: colors.textPrimary }]}>
                  {showAllCartItems ? t('See Less') : t('See More')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={onReload}
            >
              <Ionicons name="refresh" size={14} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>{t('Reload')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && allScannedItems.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>{t('Loading scanning data...')}</Text>
        </View>
      ) : allScannedItems.length === 0 ? (
        <View style={styles.emptyTable}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.surface2 }]}>
            <Ionicons name="barcode-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTableTitle, { color: colors.textSecondary }]}>
            {t('No items scanned yet')}
          </Text>
          <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>
            {t('Scan a barcode above or trigger hardware laser')}
          </Text>
        </View>
      ) : (
        <View style={styles.tableBodyWrap}>
          <View style={[styles.tableHeaderRow, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 24, textAlign: 'center' }]}>#</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 68 }]}>{t('BOX')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, flex: 1 }]}>{t('ITEM SKU')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 32, textAlign: 'center' }]}>{t('ORD')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 44, textAlign: 'center' }]}>{t('PKD')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 28, textAlign: 'center' }]}>{t('DIF')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 50, textAlign: 'center' }]}>{t('STAT')}</Text>
          </View>

          {(showAllCartItems ? allScannedItems : allScannedItems.slice(0, 5)).map((item, idx) => {
            const isCancelled = item.itemstatus === 'cancelled';
            const skuKey = String(item.itemcode || '').trim().toLowerCase();
            const skuStats = skuStatsMap.get(skuKey);

            const requestedQty =
              Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
            const packedQty =
              Number(item.packedqty ?? (item as any).packed_qty ?? 0);
            const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;

            // Difference = Requested DO Qty - Total Packed Qty for this SKU
            const diff = isCancelled ? 0 : requestedQty - totalSkuPacked;

            const isRevised =
              !isCancelled &&
              (item.itemstatus === 'revised' ||
                revisedItemIds.has(item.id) ||
                totalSkuPacked !== requestedQty ||
                (skuStats && skuStats.rowCount > 1));

            const currentStatus = isCancelled
              ? 'cancelled'
              : isRevised
              ? 'revised'
              : item.itemstatus || 'scanned';
            const badge = getStatusBadge(currentStatus);

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
                <View style={{ width: 24, alignItems: 'center' }}>
                  <TouchableOpacity
                    disabled={isCancelled}
                    onPress={() => !isCancelled && onOpenCancelModal(item.id)}
                    style={[
                      styles.rowTrashBtn,
                      { backgroundColor: colors.redMuted },
                      isCancelled && styles.rowTrashBtnDisabled,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={11}
                      color={isCancelled ? colors.textMuted : colors.red}
                    />
                  </TouchableOpacity>
                </View>

                <View style={{ width: 68 }}>
                  <View style={[styles.boxTag, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.boxTagText, { color: colors.primary }]} numberOfLines={1}>
                      {formatItemBoxNo(item.box_no)}
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

                {/* DO Qty (Requested DO Quantity) */}
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

                {/* PCK Qty (Packed / Scanned Quantity) */}
                <View style={{ width: 44, alignItems: 'center' }}>
                  <TouchableOpacity
                    disabled={isCancelled}
                    onPress={() => !isCancelled && onOpenEditQtyModal(item)}
                    style={[
                      styles.packedQtyPill,
                      { backgroundColor: colors.primaryMuted },
                      isCancelled && styles.packedQtyPillDisabled,
                    ]}
                  >
                    <Text style={[styles.packedQtyText, { color: colors.primary }]}>
                      {Math.floor(packedQty)}
                    </Text>
                    {!isCancelled && (
                      <Ionicons name="pencil" size={8} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* DIF Qty (Difference) */}
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

                {/* STAT (Status Badge) */}
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
          })}

          {allScannedItems.length > 5 && (
            <View style={[styles.limitedCartFooter, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
              <Ionicons name="layers-outline" size={13} color={colors.primary} />
              <Text style={[styles.limitedCartFooterText, { color: colors.textMuted }]}>
                Showing latest 5 of {allScannedItems.length} scanned items · All items are saved & counted
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tableCard: {
    borderBottomWidth: 1,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tableCardSub: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  emptyTable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 4,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTableTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyTableSub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  tableBodyWrap: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableRowCancelled: {
    opacity: 0.5,
  },
  rowTrashBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTrashBtnDisabled: {
    backgroundColor: 'transparent',
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
  rowItemCode: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rowNum: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  packedQtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  packedQtyPillDisabled: {
    backgroundColor: 'transparent',
  },
  packedQtyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowDiffText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
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
  limitedCartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  limitedCartFooterText: {
    fontSize: 11,
    fontFamily: monoFont,
    flex: 1,
  },
});
