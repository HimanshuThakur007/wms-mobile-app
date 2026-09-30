import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { borderRadius, spacing, monoFont } from '../../../constants/theme';

export interface PutawayPendingItem {
  itemcode: string;
  itemname: string;
  department: string;
  orderedQty: number;
  binnedQty: number;
  pendingQty: number;
}

interface PutawayPendingItemsModalProps {
  visible: boolean;
  grnNumber: string;
  binLocation: string;
  pendingItems: PutawayPendingItem[];
  onClose: () => void;
}

export const PutawayPendingItemsModal: React.FC<PutawayPendingItemsModalProps> = ({
  visible,
  grnNumber,
  binLocation,
  pendingItems,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = pendingItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.itemcode.toLowerCase().includes(q) ||
      item.itemname.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q)
    );
  });

  const totalPendingUnits = pendingItems.reduce((sum, item) => sum + item.pendingQty, 0);

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
            styles.modalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.modalIconBox, { backgroundColor: colors.amberMuted }]}>
              <Ionicons name="time-outline" size={20} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Pending Putaway Items')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                GRN {grnNumber} · Bin {binLocation}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Pending Count Banner */}
          <View
            style={[
              styles.summaryBanner,
              {
                backgroundColor: colors.amberMuted,
                borderColor: `${colors.amber}40`,
              },
            ]}
          >
            <View style={styles.summaryBadge}>
              <Text style={[styles.summaryBadgeText, { color: colors.amber }]}>
                {pendingItems.length}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: colors.amber }]}>
                {pendingItems.length === 1
                  ? '1 Pending Item Line'
                  : `${pendingItems.length} Pending Item Lines`}
              </Text>
              <Text style={[styles.summarySub, { color: colors.textSecondary }]}>
                {totalPendingUnits} total units remaining to putaway into {binLocation}
              </Text>
            </View>
          </View>

          {/* Search Box */}
          {pendingItems.length > 3 && (
            <View style={[styles.searchWrapper, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={15} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={t('Search SKU or department...')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Table / List View */}
          {pendingItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconBox, { backgroundColor: `${colors.emerald}20` }]}>
                <Ionicons name="checkmark-circle" size={32} color={colors.emerald} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('All Items Putaway Complete')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                No pending items remaining for GRN {grnNumber}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
            >
              {filteredItems.map((item, idx) => (
                <View
                  key={`pending-item-${item.itemcode}-${idx}`}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: idx % 2 === 1 ? colors.surface2 : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.itemMainRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.skuText, { color: colors.textPrimary }]}>
                          {item.itemcode}
                        </Text>
                        {item.department ? (
                          <View
                            style={[
                              styles.deptChip,
                              { backgroundColor: `${colors.violet}14`, borderColor: `${colors.violet}30` },
                            ]}
                          >
                            <Text style={[styles.deptChipText, { color: colors.violet }]} numberOfLines={1}>
                              {item.department}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.descText, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.itemname}
                      </Text>
                    </View>

                    {/* Quantity Badges */}
                    <View style={styles.qtyBadgeWrap}>
                      <View style={styles.qtyCol}>
                        <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>ORD</Text>
                        <Text style={[styles.qtyVal, { color: colors.textSecondary }]}>
                          {item.orderedQty}
                        </Text>
                      </View>
                      <View style={styles.qtyCol}>
                        <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>PUT</Text>
                        <Text style={[styles.qtyVal, { color: colors.emerald }]}>
                          {item.binnedQty}
                        </Text>
                      </View>
                      <View style={[styles.qtyCol, styles.pendingQtyCol, { backgroundColor: colors.amberMuted, borderColor: `${colors.amber}40` }]}>
                        <Text style={[styles.qtyLabel, { color: colors.amber }]}>PENDING</Text>
                        <Text style={[styles.qtyVal, { color: colors.amber, fontWeight: '800' }]}>
                          {item.pendingQty}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.violet }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.doneBtnText}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
    fontSize: 14.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: spacing.md,
    marginBottom: 8,
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  summaryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBadgeText: {
    fontSize: 15,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  summaryTitle: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: monoFont,
    padding: 0,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 11,
  },
  listScroll: {
    maxHeight: 340,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 8,
  },
  itemCard: {
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  skuText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  deptChip: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  deptChipText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  descText: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  qtyBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyCol: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pendingQtyCol: {
    borderRadius: 5,
    borderWidth: 1,
  },
  qtyLabel: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  qtyVal: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
