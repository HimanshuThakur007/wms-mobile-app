import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { borderRadius, monoFont } from '../../../constants/theme';

export interface DuplicateItemData {
  itemcode: string;
  doc_no?: string;
  box_no?: string;
  department?: string;
  requested_quantity: number;
  already_packed: number;
  balance_qty: number;
}

interface DuplicateItemModalProps {
  visible: boolean;
  item: DuplicateItemData | null;
  quantity: string;
  saving?: boolean;
  onQuantityChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const DuplicateItemModal: React.FC<DuplicateItemModalProps> = ({
  visible,
  item,
  quantity,
  saving = false,
  onQuantityChange,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: colors.amberMuted }]}>
                    <Ionicons name="copy-outline" size={20} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Duplicate Item</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      This item was already scanned
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

                {item && (
                  <View style={[styles.dupInfoBox, { backgroundColor: colors.amberMuted, borderColor: `${colors.amber}40` }]}>
                    <Text style={[styles.dupItemCode, { color: colors.amber }]}>{item.itemcode}</Text>
                    <View style={styles.dupDetailsRow}>
                      {item.box_no && (
                        <Text style={[styles.dupDetailText, { color: colors.textSecondary }]}>
                          Box: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.box_no}</Text>
                        </Text>
                      )}
                      <Text style={[styles.dupDetailText, { color: colors.textSecondary }]}>
                        DO Qty: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.requested_quantity}</Text>
                      </Text>
                      <Text style={[styles.dupDetailText, { color: colors.textSecondary }]}>
                        Packed: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.already_packed}</Text>
                      </Text>
                    </View>

                    <View
                      style={{
                        marginTop: 8,
                        paddingTop: 6,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: `${colors.amber}30`,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={[styles.dupDetailText, { color: colors.textSecondary }]}>
                        Balance Qty:{' '}
                        <Text
                          style={{
                            color: item.balance_qty > 0 ? colors.emerald : colors.amber,
                            fontWeight: '800',
                            fontSize: 14,
                          }}
                        >
                          {item.balance_qty}
                        </Text>
                      </Text>

                      {item.balance_qty === 0 ? (
                        <View
                          style={{
                            backgroundColor: `${colors.amber}25`,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: colors.amber, fontSize: 10, fontWeight: '700' }}>
                            DO FULLY PACKED (+EXTRA)
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            backgroundColor: `${colors.emerald}20`,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: colors.emerald, fontSize: 10, fontWeight: '700' }}>
                            {item.balance_qty} REMAINING
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                  {item && item.balance_qty > 0
                    ? 'ADD BALANCE QUANTITY'
                    : 'ADD EXTRA PACKED QTY'}
                </Text>
                <View style={[styles.stepperWrap, { backgroundColor: colors.surface3, borderColor: colors.amber }]}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      const val = parseInt(quantity || '1', 10);
                      if (val > 1) onQuantityChange(String(val - 1));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.stepInput, { color: colors.amber }]}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={onQuantityChange}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      const val = parseInt(quantity || '0', 10);
                      onQuantityChange(String(val + 1));
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.surface3, borderColor: colors.border }]}
                    disabled={saving}
                    onPress={onClose}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      { backgroundColor: colors.amber },
                      saving && { opacity: 0.6 },
                    ]}
                    disabled={saving}
                    onPress={onConfirm}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#0B0F14" />
                    ) : (
                      <Text style={[styles.modalConfirmBtnText, { color: '#0B0F14' }]}>Add as New Row</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 1,
  },
  modalLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dupInfoBox: {
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  dupItemCode: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    marginBottom: 6,
  },
  dupDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  dupDetailText: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: 3,
    marginBottom: 16,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '800',
    paddingVertical: 4,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
