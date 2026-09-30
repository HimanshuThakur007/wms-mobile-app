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

interface DepartmentSelectSheetProps {
  visible: boolean;
  onClose: () => void;
  departments: string[];
  selectedDepartments: string[];
  onToggleDepartment: (dept: string) => void;
  onToggleAll: () => void;
  docNumber?: string;
  accentColor?: string;
  accentMutedColor?: string;
}

const monoFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const DepartmentSelectSheet: React.FC<DepartmentSelectSheetProps> = ({
  visible,
  onClose,
  departments,
  selectedDepartments,
  onToggleDepartment,
  onToggleAll,
  docNumber,
  accentColor,
  accentMutedColor,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const accent = accentColor || colors.primary;
  const muted = accentMutedColor || colors.primaryMuted;

  const filteredDepts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter((d) => d.toLowerCase().includes(q));
  }, [search, departments]);

  const allSelected =
    departments.length > 0 && selectedDepartments.length === departments.length;

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
                },
              ]}
            >
              {/* Handle */}
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('Select Departments')}
                  </Text>
                  {docNumber ? (
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                      {t('Doc:')} {docNumber}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.closeBtn, { backgroundColor: colors.surface3 }]}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar if > 5 departments */}
              {departments.length > 5 && (
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
                    placeholder={t('Search departments...')}
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="words"
                    clearButtonMode="while-editing"
                  />
                </View>
              )}

              {/* Select All Toggle */}
              {departments.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.selectAllRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: colors.surface3,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={onToggleAll}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: allSelected ? accent : 'transparent',
                        borderColor: allSelected ? accent : colors.border,
                      },
                    ]}
                  >
                    {allSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>
                    {allSelected ? t('Deselect All Departments') : t('Select All Departments')}
                  </Text>
                  <Text style={[styles.countBadge, { color: colors.textMuted }]}>
                    {selectedDepartments.length}/{departments.length}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Department List */}
              <ScrollView
                style={styles.deptList}
                contentContainerStyle={styles.deptListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {filteredDepts.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {t('No departments available')}
                    </Text>
                  </View>
                ) : (
                  filteredDepts.map((dept, idx) => {
                    const isSelected = selectedDepartments.includes(dept);

                    return (
                      <TouchableOpacity
                        key={`${dept}-${idx}`}
                        style={[
                          styles.deptItem,
                          {
                            borderBottomColor: colors.border,
                            backgroundColor: isSelected ? muted : 'transparent',
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => onToggleDepartment(dept)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: isSelected ? accent : 'transparent',
                              borderColor: isSelected ? accent : colors.border,
                            },
                          ]}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          )}
                        </View>

                        <Text
                          style={[
                            styles.deptName,
                            {
                              color: isSelected ? colors.textPrimary : colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Done Button */}
              <View
                style={[
                  styles.footer,
                  {
                    paddingBottom: Math.max(insets.bottom, 16) + 12,
                    backgroundColor: colors.surface2,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: accent }]}
                  activeOpacity={0.8}
                  onPress={onClose}
                >
                  <Text style={styles.doneBtnText}>
                    {t('Confirm Selection')} ({selectedDepartments.length})
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  selectAllText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  countBadge: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  deptList: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 280,
  },
  deptListContent: {
    paddingBottom: 12,
  },
  deptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptName: {
    fontSize: 13,
    fontFamily: monoFont,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: monoFont,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  doneBtn: {
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#0B0F14',
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
