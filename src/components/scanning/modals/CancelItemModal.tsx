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
import { useLanguage } from '../../../context/LanguageContext';
import { borderRadius, monoFont } from '../../../constants/theme';

interface CancelItemModalProps {
  visible: boolean;
  remarks: string;
  onRemarksChange: (text: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelItemModal: React.FC<CancelItemModalProps> = ({
  visible,
  remarks,
  onRemarksChange,
  onClose,
  onConfirm,
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: colors.redMuted }]}>
                    <Ionicons name="alert-circle-outline" size={20} color={colors.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Cancel Item', 'Cancel Item')}</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      {t('This action cannot be undone', 'This action cannot be undone')}
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

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('REMARKS *', 'REMARKS *')}</Text>
                <TextInput
                  style={[
                    styles.remarksInput,
                    {
                      backgroundColor: colors.surface3,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder={t('Enter cancellation remarks...', 'Enter reason for cancellation...')}
                  placeholderTextColor={colors.textMuted}
                  value={remarks}
                  onChangeText={onRemarksChange}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.surface3, borderColor: colors.border }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>{t('Back', 'Go Back')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      { backgroundColor: colors.red },
                      !remarks.trim() && { opacity: 0.5 },
                    ]}
                    disabled={!remarks.trim()}
                    onPress={onConfirm}
                  >
                    <Text style={[styles.modalConfirmBtnText, { color: '#FFFFFF' }]}>{t('Cancel Item', 'Cancel Item')}</Text>
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
  remarksInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    fontFamily: monoFont,
    textAlignVertical: 'top',
    minHeight: 70,
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
