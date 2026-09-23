import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, shadows } from '../../constants/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconName,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    // Size
    if (size === 'sm') list.push(styles.sizeSm);
    else if (size === 'lg') list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    // Variant
    switch (variant) {
      case 'primary':
        list.push({ backgroundColor: colors.primary });
        if (Platform.OS === 'ios') list.push(shadows.primaryGlow);
        break;
      case 'secondary':
        list.push({ backgroundColor: colors.primarySoft });
        break;
      case 'outline':
        list.push({ backgroundColor: 'transparent', borderColor: colors.border });
        break;
      case 'ghost':
        list.push({ backgroundColor: 'transparent' });
        break;
      case 'danger':
        list.push({ backgroundColor: colors.danger });
        break;
    }

    if (disabled || loading) {
      list.push(styles.disabled);
    }

    if (style) list.push(style);

    return list;
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.primary;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.textPrimary;
      default:
        return '#FFFFFF';
    }
  };

  const textColor = getTextColor();
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={getContainerStyle()}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
        />
      ) : (
        <>
          {iconName && iconPosition === 'left' && (
            <Ionicons
              name={iconName}
              size={iconSize}
              color={textColor}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.text,
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              { color: textColor },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons
              name={iconName}
              size={iconSize}
              color={textColor}
              style={styles.rightIcon}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeSm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 13,
  },
  textLg: {
    fontSize: 17,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});
