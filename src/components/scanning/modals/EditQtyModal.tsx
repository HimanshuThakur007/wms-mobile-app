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
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { borderRadius, monoFont } from '../../../constants/theme';

interface EditQtyModalProps {
  visible: boolean;
  itemCode?: string;
  requestedQty?: number;
  value: string;
  onValueChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const EditQtyModal: React.FC<EditQtyModalProps> = ({
  visible,
  itemCode,
  requestedQty,
  value,
  onValueChange,
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
                  <View style={[styles.modalIconBox, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Packed Qty</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      Item: {itemCode}
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

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>PACKED QUANTITY</Text>
                <View style={[styles.stepperWrap, { backgroundColor: colors.surface3, borderColor: colors.primary }]}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      const val = parseInt(value || '1', 10);
                      if (val > 1) onValueChange(String(val - 1));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.stepInput, { color: colors.primary }]}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onValueChange}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      const val = parseInt(value || '0', 10);
                      onValueChange(String(val + 1));
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {requestedQty !== undefined && (
                  <Text style={[styles.stepperSubtext, { color: colors.textMuted }]}>
                    DO Qty: <Text style={{ color: colors.primary }}>{Math.floor(requestedQty)}</Text>
                    {parseInt(value, 10) !== Math.floor(requestedQty) && (
                      <Text style={{ color: colors.violet }}> · Will be marked REVISED</Text>
                    )}
                  </Text>
                )}

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.surface3, borderColor: colors.border }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                    onPress={onConfirm}
                  >
                    <Text style={[styles.modalConfirmBtnText, { color: '#0B0F14' }]}>Update</Text>
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
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: 3,
    marginBottom: 8,
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
  stepperSubtext: {
    fontSize: 10,
    fontFamily: monoFont,
    marginBottom: 16,
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
