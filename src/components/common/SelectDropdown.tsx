import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './Badge';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

export interface DropdownOption {
  label: string;
  value: string;
  subtitle?: string;
  badge?: string;
}

interface SelectDropdownProps {
  label: string;
  placeholder?: string;
  options: DropdownOption[];
  selectedValue?: string;
  onSelect?: (value: string) => void;
  selectedValues?: string[];
  onSelectMulti?: (values: string[]) => void;
  isMulti?: boolean;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  label,
  placeholder = 'Select an option...',
  options,
  selectedValue = '',
  onSelect,
  selectedValues = [],
  onSelectMulti,
  isMulti = false,
  error,
  leftIcon = 'chevron-down-outline',
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  const handleOpen = () => {
    if (disabled) return;
    if (isMulti) {
      setTempSelected([...selectedValues]);
    }
    setModalVisible(true);
  };

  const handleSingleSelect = (val: string) => {
    if (onSelect) onSelect(val);
    setModalVisible(false);
  };

  const toggleMultiSelectOption = (val: string) => {
    if (tempSelected.includes(val)) {
      setTempSelected(tempSelected.filter((v) => v !== val));
    } else {
      setTempSelected([...tempSelected, val]);
    }
  };

  const handleMultiDone = () => {
    if (onSelectMulti) onSelectMulti(tempSelected);
    setModalVisible(false);
  };

  const handleSelectAll = () => {
    if (tempSelected.length === options.length) {
      setTempSelected([]);
    } else {
      setTempSelected(options.map((o) => o.value));
    }
  };

  // Render trigger text / badge summary
  const renderTriggerContent = () => {
    if (isMulti) {
      if (selectedValues.length === 0) {
        return <Text style={[styles.triggerText, { color: colors.textMuted }]}>{placeholder}</Text>;
      }
      if (selectedValues.length === 1) {
        const item = options.find((o) => o.value === selectedValues[0]);
        return <Text style={[styles.triggerText, { color: colors.textPrimary }]} numberOfLines={1}>{item ? item.label : selectedValues[0]}</Text>;
      }
      return (
        <View style={styles.multiSummaryRow}>
          <Text style={[styles.triggerText, { color: colors.textPrimary }]} numberOfLines={1}>
            {selectedValues.length} Departments Selected
          </Text>
          <Badge label={`${selectedValues.length}`} variant="primary" size="sm" />
        </View>
      );
    }

    const selectedOption = options.find((opt) => opt.value === selectedValue);
    return (
      <Text
        style={[
          styles.triggerText,
          { color: selectedOption ? colors.textPrimary : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {selectedOption ? selectedOption.label : placeholder}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
          {isMulti && (
            <Text style={[styles.multiTag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>Multi-Select</Text>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.border },
          modalVisible && { borderColor: colors.primary },
          error ? { borderColor: colors.danger } : null,
          disabled ? { backgroundColor: colors.surface3, opacity: 0.6 } : null,
        ]}
        activeOpacity={0.75}
        onPress={handleOpen}
      >
        <View style={styles.triggerLeft}>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={20}
              color={(isMulti ? selectedValues.length > 0 : selectedValue) ? colors.primary : colors.textMuted}
              style={styles.icon}
            />
          )}
          {renderTriggerContent()}
        </View>

        <Ionicons
          name={modalVisible ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Selected tags preview for Multi-Select */}
      {isMulti && selectedValues.length > 0 && (
        <View style={styles.selectedTagsContainer}>
          {selectedValues.map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <View key={val} style={[styles.selectedTagPill, { backgroundColor: colors.primarySoft, borderColor: `${colors.primary}40` }]}>
                <Text style={[styles.selectedTagText, { color: colors.primary }]} numberOfLines={1}>
                  {opt ? opt.label : val}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newVals = selectedValues.filter((v) => v !== val);
                    if (onSelectMulti) onSelectMulti(newVals);
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

      {/* Options Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{label || 'Select Option'}</Text>
                    {isMulti && (
                      <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                        Select one or multiple items
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: colors.surface3 }]}
                    onPress={() => setModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Multi Select Bulk Controls */}
                {isMulti && (
                  <View style={[styles.multiActionRow, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.toggleAllBtn, { backgroundColor: colors.surface3 }]}
                      onPress={handleSelectAll}
                    >
                      <Text style={[styles.toggleAllText, { color: colors.primary }]}>
                        {tempSelected.length === options.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.selectedCountBadge, { color: colors.textSecondary }]}>
                      {tempSelected.length} of {options.length} chosen
                    </Text>
                  </View>
                )}

                {/* Options List */}
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContainer}
                  renderItem={({ item }) => {
                    const isSelected = isMulti
                      ? tempSelected.includes(item.value)
                      : item.value === selectedValue;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          isSelected && { backgroundColor: colors.primarySoft },
                        ]}
                        activeOpacity={0.7}
                        onPress={() =>
                          isMulti
                            ? toggleMultiSelectOption(item.value)
                            : handleSingleSelect(item.value)
                        }
                      >
                        <View style={styles.optionItemLeft}>
                          {isMulti ? (
                            <View
                              style={[
                                styles.checkbox,
                                { borderColor: colors.border, backgroundColor: colors.surface },
                                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                              ]}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              )}
                            </View>
                          ) : null}

                          <View style={styles.optionTextContainer}>
                            <Text
                              style={[
                                styles.optionLabel,
                                { color: isSelected ? colors.primary : colors.textPrimary },
                              ]}
                            >
                              {item.label}
                            </Text>
                            {item.subtitle ? (
                              <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                            ) : null}
                          </View>
                        </View>

                        {!isMulti && isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />

                {/* Multi-Select Done Button */}
                {isMulti && (
                  <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                      onPress={handleMultiDone}
                    >
                      <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                      <Text style={styles.applyBtnText}>
                        Apply Selection ({tempSelected.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  multiTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    ...shadows.sm,
  },
  triggerActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAFAFF',
  },
  triggerError: {
    borderColor: colors.danger,
  },
  triggerDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  multiSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  selectedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    maxWidth: '100%',
  },
  selectedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl + 8,
    borderTopRightRadius: borderRadius.xl + 8,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: spacing.xs,
  },
  toggleAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F1F5F9',
  },
  toggleAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  selectedCountBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginVertical: 2,
  },
  optionItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  optionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: 8,
    ...shadows.primaryGlow,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
