import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, monoFont } from '../../constants/theme';

interface HardwareScanInputCardProps {
  inputRef: React.RefObject<TextInput | null>;
  itemCode: string;
  inputFocused: boolean;
  scanning: boolean;
  title?: string;
  subtitle: string;
  placeholderFocused?: string;
  placeholderBlurred?: string;
  accentColor?: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export const HardwareScanInputCard: React.FC<HardwareScanInputCardProps> = ({
  inputRef,
  itemCode,
  inputFocused,
  scanning,
  title = 'Hardware Laser Scanner Receiver',
  subtitle,
  placeholderFocused = '● Scanner Active — Ready to scan barcode...',
  placeholderBlurred = 'Tap to focus scanner...',
  accentColor,
  onChangeText,
  onSubmitEditing,
  onFocus,
  onBlur,
}) => {
  const { colors, isDark } = useTheme();
  const themeAccent = accentColor || colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      focusable={false}
      accessible={false}
      onPress={() => inputRef.current?.focus()}
      style={[
        styles.scanCard,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.scanCardHeader}>
        <View style={[styles.scanIconBox, { backgroundColor: inputFocused ? themeAccent : colors.primaryMuted }]}>
          <Ionicons name="barcode-outline" size={20} color={inputFocused ? '#0B0F14' : themeAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <Text style={[styles.scanCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            <View
              style={[
                styles.activeLaserPill,
                {
                  backgroundColor: inputFocused ? `${colors.emerald}25` : colors.surface3,
                  borderColor: inputFocused ? colors.emerald : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.pulsingDot,
                  { backgroundColor: inputFocused ? colors.emerald : colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.activeLaserText,
                  { color: inputFocused ? colors.emerald : colors.textMuted },
                ]}
              >
                {inputFocused ? 'SCANNER FOCUSED' : 'TAP TO FOCUS'}
              </Text>
            </View>
          </View>
          <Text style={[styles.scanCardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.scanInputRow}>
        <View
          style={[
            styles.scanInputWrapper,
            {
              backgroundColor: inputFocused
                ? isDark
                  ? `${themeAccent}18`
                  : '#E6F9F3'
                : colors.surface3,
              borderColor: inputFocused ? themeAccent : colors.border,
              borderWidth: inputFocused ? 2 : 1.5,
              flex: 1,
            },
          ]}
        >
          {scanning ? (
            <ActivityIndicator size="small" color={themeAccent} style={{ marginRight: 6 }} />
          ) : (
            <Ionicons
              name="barcode"
              size={18}
              color={inputFocused ? themeAccent : colors.textMuted}
            />
          )}
          <TextInput
            ref={inputRef}
            style={[
              styles.scanTextInput,
              {
                color: colors.textPrimary,
                fontWeight: '700',
              },
            ]}
            placeholder={
              scanning
                ? 'Processing barcode scan...'
                : inputFocused
                ? placeholderFocused
                : placeholderBlurred
            }
            placeholderTextColor={inputFocused ? themeAccent : colors.textMuted}
            value={itemCode}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditing}
            onFocus={onFocus}
            onBlur={onBlur}
            showSoftInputOnFocus={false}
            caretHidden={false}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scanCard: {
    padding: 12,
    borderBottomWidth: 1,
  },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  scanIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCardTitle: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scanCardSubtitle: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 1,
  },
  activeLaserPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeLaserText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scanInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  scanTextInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
    padding: 0,
    marginLeft: 6,
  },
});
