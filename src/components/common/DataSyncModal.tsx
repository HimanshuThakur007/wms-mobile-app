import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface DataSyncModalProps {
  visible: boolean;
  documentNumber: string;
  progress: number; // 0 to 100
  statusText: string;
  itemCount?: number;
  isComplete?: boolean;
  title?: string;
  completeTitle?: string;
  accentColor?: string;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({
  visible,
  documentNumber,
  progress,
  statusText,
  itemCount,
  isComplete = false,
  title,
  completeTitle,
  accentColor,
}) => {
  const { colors, isDark } = useTheme();
  const themeAccent = accentColor || colors.primary;
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate progress smoothly whenever progress prop changes
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: Math.min(Math.max(progress, 0), 100),
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Pulse animation for sync icon while loading
  useEffect(() => {
    if (visible && !isComplete) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible, isComplete]);

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : themeAccent,
            },
          ]}
        >
          {/* Top Icon Badge */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isComplete
                    ? 'rgba(16, 185, 129, 0.15)'
                    : `${themeAccent}20`,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons
                name={isComplete ? 'checkmark-circle' : 'cloud-download-outline'}
                size={34}
                color={isComplete ? '#10B981' : themeAccent}
              />
            </Animated.View>
          </View>

          {/* Title & Document Badge */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isComplete
              ? (completeTitle || 'Picklist Sync Complete')
              : (title || 'Syncing Picklist Data')}
          </Text>

          {documentNumber ? (
            <View
              style={[
                styles.docBadge,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="document-text-outline" size={14} color={themeAccent} />
              <Text style={[styles.docText, { color: colors.textPrimary }]}>
                {documentNumber}
              </Text>
            </View>
          ) : null}

          {/* Progressive Percentage Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {isComplete ? 'Cached locally' : 'Sync progress'}
              </Text>
              <Text style={[styles.percentText, { color: themeAccent }]}>
                {Math.round(progress)}%
              </Text>
            </View>

            <View
              style={[
                styles.track,
                {
                  backgroundColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.fillBar,
                  {
                    width: progressWidth,
                    backgroundColor: isComplete ? '#10B981' : themeAccent,
                  },
                ]}
              />
            </View>
          </View>

          {/* Status Message & Item Count */}
          <View style={styles.statusRow}>
            {!isComplete && (
              <ActivityIndicator
                size="small"
                color={themeAccent}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isComplete ? '#10B981' : colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {statusText || 'Preparing picklist data...'}
            </Text>
          </View>

          {/* Item count summary pill */}
          {itemCount !== undefined && itemCount > 0 && (
            <View
              style={[
                styles.itemCountBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.25)',
                },
              ]}
            >
              <Ionicons name="cube-outline" size={14} color="#10B981" />
              <Text style={styles.itemCountText}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} indexed for 0ms scan
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 6,
    marginBottom: 18,
  },
  docText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: monoFont,
  },
  progressSection: {
    width: '100%',
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: monoFont,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 24,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
});
