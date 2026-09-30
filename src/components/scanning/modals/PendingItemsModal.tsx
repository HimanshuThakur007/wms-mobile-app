import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { borderRadius, spacing, monoFont } from '../../../constants/theme';

interface PendingItemsModalProps {
  visible: boolean;
  markingPending: boolean;
  pendingCountDisplay: number;
  markingProgressText: string;
  onClose: () => void;
  onConfirmMarkZeroAndSubmit: () => void;
}

export const PendingItemsModal: React.FC<PendingItemsModalProps> = ({
  visible,
  markingPending,
  pendingCountDisplay,
  markingProgressText,
  onClose,
  onConfirmMarkZeroAndSubmit,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!markingPending) onClose();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (!markingPending) onClose();
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: colors.surface2, borderColor: colors.border },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconBox,
                      { backgroundColor: colors.amberMuted },
                    ]}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={20}
                      color={colors.amber}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.modalTitle, { color: colors.textPrimary }]}
                    >
                      Pending Items Detected
                    </Text>
                    <Text
                      style={[styles.modalSubtitle, { color: colors.textMuted }]}
                    >
                      Action required before submitting batch
                    </Text>
                  </View>
                  {!markingPending && (
                    <TouchableOpacity
                      onPress={onClose}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Summary Box with Pending Count */}
                <View
                  style={[
                    styles.pendingCountCard,
                    {
                      backgroundColor: colors.amberMuted,
                      borderColor: `${colors.amber}40`,
                    },
                  ]}
                >
                  <View style={styles.pendingCountRow}>
                    <View style={styles.pendingCountBadge}>
                      <Text style={[styles.pendingCountNumber, { color: colors.amber }]}>
                        {pendingCountDisplay}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingCountHeading, { color: colors.amber }]}>
                        {pendingCountDisplay === 1
                          ? '1 Pending Item Found'
                          : `${pendingCountDisplay} Pending Items Found`}
                      </Text>
                      <Text
                        style={[
                          styles.pendingCountSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Unscanned items cannot remain pending during submission.
                      </Text>
                    </View>
                  </View>
                </View>

                <Text
                  style={[
                    styles.pendingInstructionText,
                    { color: colors.textSecondary },
                  ]}
                >
                  To proceed, all pending items will be marked with quantity{' '}
                  <Text style={{ fontWeight: '800', color: colors.textPrimary }}>0</Text>.
                  Once all items are marked 0, the packing list will be submitted automatically.
                </Text>

                {/* Marking progress indicator */}
                {markingPending && (
                  <View style={styles.markingProgressWrap}>
                    <ActivityIndicator size="small" color={colors.amber} />
                    <Text
                      style={[
                        styles.markingProgressText,
                        { color: colors.amber },
                      ]}
                    >
                      {markingProgressText || 'Processing items...'}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalCancelBtn,
                      {
                        backgroundColor: colors.surface3,
                        borderColor: colors.border,
                        opacity: markingPending ? 0.5 : 1,
                      },
                    ]}
                    disabled={markingPending}
                    onPress={onClose}
                  >
                    <Text
                      style={[
                        styles.modalCancelBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Keep Scanning
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      {
                        backgroundColor: colors.amber,
                        opacity: markingPending ? 0.7 : 1,
                      },
                    ]}
                    disabled={markingPending}
                    onPress={onConfirmMarkZeroAndSubmit}
                  >
                    {markingPending ? (
                      <ActivityIndicator size="small" color="#0B0F14" />
                    ) : (
                      <Text
                        style={[
                          styles.modalConfirmBtnText,
                          { color: '#0B0F14' },
                        ]}
                      >
                        Mark 0 & Submit
                      </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 1,
  },
  pendingCountCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: 10,
  },
  pendingCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingCountNumber: {
    fontSize: 28,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  pendingCountHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  pendingCountSub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  pendingInstructionText: {
    fontSize: 11,
    fontFamily: monoFont,
    lineHeight: 16,
    marginBottom: 12,
  },
  markingProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 8,
  },
  markingProgressText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
