import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { borderRadius, spacing } from '../../constants/theme';

export interface GrnDocumentItem {
  id: string | number;
  grn_number: string;
  supplier: string;
  items_count?: number;
  date: string;
  status?: string;
  zone?: string;
  department?: string;
  departments?: string[];
  bill_no?: string;
  user_id?: number | string;
}

interface GrnSelectSheetProps {
  visible: boolean;
  onClose: () => void;
  grns: GrnDocumentItem[];
  selectedGrns: string[];
  onToggleGrn: (grnNumber: string) => void;
  onSelectAll?: () => void;
  title?: string;
  accentColor?: string;
  singleSelect?: boolean;
  selectedDepts?: string[];
  onToggleDept?: (grnNumber: string, deptName: string) => void;
}

const monoFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const GrnSelectSheet: React.FC<GrnSelectSheetProps> = ({
  visible,
  onClose,
  grns,
  selectedGrns,
  onToggleGrn,
  onSelectAll,
  title,
  accentColor,
  singleSelect = false,
  selectedDepts,
  onToggleDept,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const displayTitle = title || t('Select GRN Documents');

  const accent = accentColor || colors.violet;

  const filteredGrns = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return grns;
    return grns.filter((g) => {
      const num = (g.grn_number || '').toLowerCase();
      const sup = (g.supplier || '').toLowerCase();
      const zone = (g.zone || '').toLowerCase();
      const dept = (g.department || '').toLowerCase();
      const bill = (g.bill_no || '').toLowerCase();
      return (
        num.includes(q) ||
        sup.includes(q) ||
        zone.includes(q) ||
        dept.includes(q) ||
        bill.includes(q)
      );
    });
  }, [search, grns]);

  const allSelected = grns.length > 0 && selectedGrns.length === grns.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                  maxHeight: SCREEN_HEIGHT * 0.85,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{displayTitle}</Text>
                    <View style={[styles.badgePill, { backgroundColor: `${accent}20`, borderColor: `${accent}40` }]}>
                      <Text style={[styles.badgePillText, { color: accent }]}>
                        {singleSelect ? t('SINGLE-SELECT') : t('MULTI-SELECT')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {singleSelect
                      ? selectedGrns.length > 0
                        ? `${t('Selected')}: ${selectedGrns[0]}`
                        : `${t('Choose 1 of')} ${grns.length} ${t('GRNs')}`
                      : `${selectedGrns.length} / ${grns.length} ${t('GRNs selected')}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.closeBtn, { backgroundColor: colors.surface3 }]}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={[
                  styles.searchWrap,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder=""
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="characters"
                  clearButtonMode="while-editing"
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Select All Row (only in multi-select mode) */}
              {!singleSelect && grns.length > 0 && onSelectAll && (
                <TouchableOpacity
                  style={[
                    styles.selectAllRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: colors.surface3,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={onSelectAll}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: allSelected ? accent : 'transparent',
                        borderColor: allSelected ? accent : colors.textMuted,
                      },
                    ]}
                  >
                    {allSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>
                    {allSelected ? t('Deselect All GRNs') : t('Select All GRNs')}
                  </Text>
                  <Text style={[styles.selectAllCount, { color: accent }]}>
                    ({selectedGrns.length}/{grns.length})
                  </Text>
                </TouchableOpacity>
              )}

              {/* GRN List Scroll */}
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredGrns.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {t('No GRN documents match')} "{search}"
                    </Text>
                  </View>
                ) : (
                  filteredGrns.map((item) => {
                    const isSelected = selectedGrns.includes(item.grn_number);
                    const depts: string[] = item.departments && item.departments.length > 0
                      ? item.departments
                      : item.department
                      ? item.department.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.grnRow,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? `${accent}18`
                                : '#FAF5FF'
                              : colors.surface,
                            borderColor: isSelected ? accent : colors.border,
                          },
                        ]}
                        activeOpacity={0.75}
                        onPress={() => {
                          if (!singleSelect || !isSelected) {
                            onToggleGrn(item.grn_number);
                          }
                        }}
                      >
                        {/* Checkbox / Radio */}
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: isSelected ? accent : 'transparent',
                              borderColor: isSelected ? accent : colors.border,
                              borderRadius: singleSelect ? 10 : 5,
                            },
                          ]}
                        >
                          {isSelected && (
                            <Ionicons
                              name={singleSelect ? 'radio-button-on' : 'checkmark'}
                              size={singleSelect ? 11 : 12}
                              color="#FFFFFF"
                            />
                          )}
                        </View>

                        {/* GRN Main Info */}
                        <View style={styles.grnBody}>
                          {/* Row 1: Document number + items/status badge */}
                          <View style={styles.grnHeaderRow}>
                            <View style={styles.grnNumBox}>
                              <Ionicons
                                name="document-text"
                                size={14}
                                color={isSelected ? accent : colors.violet}
                              />
                              <Text
                                style={[
                                  styles.grnNum,
                                  { color: colors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {item.grn_number}
                              </Text>
                            </View>

                            {item.status ? (
                              <View
                                style={[
                                  styles.statusPill,
                                  {
                                    backgroundColor:
                                      item.status.toLowerCase() === 'active' || item.status.toLowerCase() === 'ready'
                                        ? `${colors.emerald}18`
                                        : colors.surface3,
                                    borderColor:
                                      item.status.toLowerCase() === 'active' || item.status.toLowerCase() === 'ready'
                                        ? `${colors.emerald}40`
                                        : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusPillText,
                                    {
                                      color:
                                        item.status.toLowerCase() === 'active' || item.status.toLowerCase() === 'ready'
                                          ? colors.emerald
                                          : colors.textSecondary,
                                    },
                                  ]}
                                >
                                  {t(item.status.toUpperCase())}
                                </Text>
                              </View>
                            ) : item.items_count !== undefined ? (
                              <View style={[styles.statusPill, { backgroundColor: colors.surface3, borderColor: colors.border }]}>
                                <Text style={[styles.statusPillText, { color: colors.textSecondary }]}>
                                  {item.items_count} {item.items_count === 1 ? t('ITEM') : t('ITEMS')}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Row 2: Department selection chips on GRN card */}
                          {depts.length > 0 && (
                            <View style={styles.deptChipsWrap}>
                              {depts.map((deptName, dIdx) => {
                                const isDeptActive = isSelected
                                  ? !selectedDepts || selectedDepts.length === 0 || selectedDepts.includes(deptName)
                                  : false;

                                return (
                                  <TouchableOpacity
                                    key={`${item.id}-d-${dIdx}`}
                                    style={[
                                      styles.deptChip,
                                      {
                                        backgroundColor: isDeptActive
                                          ? `${accent}25`
                                          : isSelected
                                          ? `${colors.border}40`
                                          : `${accent}14`,
                                        borderColor: isDeptActive
                                          ? accent
                                          : isSelected
                                          ? colors.border
                                          : `${accent}30`,
                                      },
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                      if (onToggleDept) {
                                        onToggleDept(item.grn_number, deptName);
                                      } else {
                                        onToggleGrn(item.grn_number);
                                      }
                                    }}
                                  >
                                    <View
                                      style={[
                                        styles.miniCheckbox,
                                        {
                                          backgroundColor: isDeptActive ? accent : 'transparent',
                                          borderColor: isDeptActive ? accent : colors.textMuted,
                                        },
                                      ]}
                                    >
                                      {isDeptActive && <Ionicons name="checkmark" size={9} color="#FFFFFF" />}
                                    </View>
                                    <Text
                                      style={[
                                        styles.deptChipText,
                                        {
                                          color: isDeptActive ? accent : colors.textSecondary,
                                          fontWeight: isDeptActive ? '800' : '500',
                                        },
                                      ]}
                                    >
                                      {deptName}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}

                          {/* Row 3: Meta details (Bill / Supplier & Date) */}
                          <View style={styles.grnSubRow}>
                            {item.bill_no ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="receipt-outline" size={11} color={colors.textMuted} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                  {t('Bill')}: {item.bill_no}
                                </Text>
                              </View>
                            ) : item.supplier ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="business-outline" size={11} color={colors.textMuted} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                  {item.supplier}
                                </Text>
                              </View>
                            ) : null}

                            {item.date ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                                  {item.date}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Bottom Confirm Action */}
              <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: accent }]}
                  activeOpacity={0.8}
                  onPress={onClose}
                >
                  <Text style={styles.doneBtnText} numberOfLines={1} ellipsizeMode="tail">
                    {selectedGrns.length === 0
                      ? t('Done')
                      : singleSelect
                      ? `${t('Confirm Selection')} (${selectedGrns[0]})`
                      : `${t('Confirm Selection')} (${selectedGrns.length} ${t('GRNs')})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: monoFont,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: monoFont,
    padding: 0,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
    flex: 1,
  },
  selectAllCount: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  listScroll: {
    maxHeight: SCREEN_HEIGHT * 0.52,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  grnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  grnBody: {
    flex: 1,
    gap: 6,
  },
  grnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  grnNumBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  grnNum: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  deptChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 1,
  },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  deptChipText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  miniCheckbox: {
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grnSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: monoFont,
  },
  bottomBar: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  doneBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
});
