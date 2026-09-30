import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ScanItem } from '../../../types';
import { getStatusBadge, SkuStat } from '../../../utils/scanHelpers';
import { monoFont } from '../../../constants/theme';

interface ContainerManifestTableProps {
  allScannedItems: ScanItem[];
  loading: boolean;
  showAllCartItems: boolean;
  setShowAllCartItems: (show: boolean) => void;
  onReload: () => void;
  onOpenCancelModal: (id: number) => void;
  onOpenEditQtyModal: (item: ScanItem) => void;
  formatItemBoxNo: (boxVal: any) => string;
  revisedItemIds: Set<number>;
  skuStatsMap: Map<string, SkuStat>;
}

export function ContainerManifestTable({
  allScannedItems,
  loading,
  showAllCartItems,
  setShowAllCartItems,
  onReload,
  onOpenCancelModal,
  onOpenEditQtyModal,
  formatItemBoxNo,
  revisedItemIds,
  skuStatsMap,
}: ContainerManifestTableProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.tableCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={[styles.tableCardHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.tableCardTitle, { color: colors.textPrimary }]}>{t('Container Manifest')}</Text>
          <Text style={[styles.tableCardSub, { color: colors.textMuted }]}>
            {allScannedItems.length > 5 && !showAllCartItems
              ? `${t('ALL PALLETS')} · ${t('Latest 5 of')} ${allScannedItems.length} ${t('lines')}`
              : `${t('ALL PALLETS')} · ${t('Showing all')} ${allScannedItems.length} ${t('lines')}`}
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
                onPress={() => setShowAllCartItems(!showAllCartItems)}
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
              style={[styles.refreshBtn, { backgroundColor: colors.amberMuted }]}
              onPress={onReload}
            >
              <Ionicons name="refresh" size={14} color={colors.amber} />
              <Text style={[styles.refreshBtnText, { color: colors.amber }]}>{t('Reload')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && allScannedItems.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.amber} />
          <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>{t('Loading manifest data...')}</Text>
        </View>
      ) : allScannedItems.length === 0 ? (
        <View style={styles.emptyTable}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.surface2 }]}>
            <Ionicons name="boat-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTableTitle, { color: colors.textSecondary }]}>
            {t('No items scanned to container')}
          </Text>
          <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>
            {t('Scan carton / SKU barcode to load onto pallet')}
          </Text>
        </View>
      ) : (
        <View style={styles.tableBodyWrap}>
          <View style={[styles.tableHeaderRow, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 24, textAlign: 'center' }]}>#</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 68 }]}>{t('TIER')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, flex: 1 }]}>{t('ITEM SKU')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 32, textAlign: 'center' }]}>{t('DO')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 44, textAlign: 'center' }]}>{t('PCK')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 28, textAlign: 'center' }]}>{t('DIF')}</Text>
            <Text style={[styles.thCell, { color: colors.textMuted, width: 50, textAlign: 'center' }]}>{t('STAT')}</Text>
          </View>

          {(showAllCartItems ? allScannedItems : allScannedItems.slice(0, 5)).map((item, idx) => {
            const isCancelled = item.itemstatus === 'cancelled';
            const skuKey = String(item.itemcode || '').trim().toLowerCase();
            const skuStats = skuStatsMap.get(skuKey);

            const requestedQty = Number(item.requested_quantity ?? (item as any).qty ?? 1) || 1;
            const packedQty = Number(item.packedqty ?? (item as any).packed_qty ?? 0);
            const totalSkuPacked = skuStats ? skuStats.totalPacked : packedQty;

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
            const badge = getStatusBadge(currentStatus, colors, t);

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
                  <View style={[styles.boxTag, { backgroundColor: colors.amberMuted }]}>
                    <Text style={[styles.boxTagText, { color: colors.amber }]} numberOfLines={1}>
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

                {/* DO Qty */}
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

                {/* PCK Qty */}
                <View style={{ width: 44, alignItems: 'center' }}>
                  <TouchableOpacity
                    disabled={isCancelled}
                    onPress={() => !isCancelled && onOpenEditQtyModal(item)}
                    style={[
                      styles.packedQtyPill,
                      { backgroundColor: colors.amberMuted },
                      isCancelled && styles.packedQtyPillDisabled,
                    ]}
                  >
                    <Text style={[styles.packedQtyText, { color: colors.amber }]}>
                      {Math.floor(packedQty)}
                    </Text>
                    {!isCancelled && (
                      <Ionicons name="pencil" size={8} color={colors.amber} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* DIF Qty */}
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
              <Ionicons name="layers-outline" size={13} color={colors.amber} />
              <Text style={[styles.limitedCartFooterText, { color: colors.textMuted }]}>
                {t('Latest 5 of')} {allScannedItems.length} {t('lines')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tableCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableCardTitle: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  tableCardSub: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  emptyTable: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTableTitle: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  emptyTableSub: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 2,
  },
  tableBodyWrap: {
    width: '100%',
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
  rowTrashBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTrashBtnDisabled: {
    opacity: 0.3,
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
  rowNum: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  packedQtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  packedQtyPillDisabled: {
    opacity: 0.5,
  },
  packedQtyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
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
  limitedCartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  limitedCartFooterText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
});
