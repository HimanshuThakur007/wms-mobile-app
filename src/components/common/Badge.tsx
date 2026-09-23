import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius } from '../../constants/theme';
import { ActivityStatus } from '../../types';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  status?: ActivityStatus;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant,
  status,
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  // Determine color scheme based on status if provided, else variant
  const getStyleTheme = () => {
    if (status) {
      switch (status) {
        case 'COMPLETED':
          return { bg: colors.successLight, text: colors.success, dot: colors.success };
        case 'IN_TRANSIT':
          return { bg: colors.infoLight, text: colors.info, dot: colors.info };
        case 'PROCESSING':
          return { bg: colors.primarySoft, text: colors.primary, dot: colors.primary };
        case 'ALERT':
          return { bg: colors.dangerLight, text: colors.danger, dot: colors.danger };
      }
    }

    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.success, dot: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning, dot: colors.warning };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.danger, dot: colors.danger };
      case 'info':
        return { bg: colors.infoLight, text: colors.info, dot: colors.info };
      case 'primary':
        return { bg: colors.primarySoft, text: colors.primary, dot: colors.primary };
      case 'neutral':
      default:
        return { bg: colors.surface3, text: colors.textSecondary, dot: colors.textMuted };
    }
  };

  const theme = getStyleTheme();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.bg },
        size === 'sm' && styles.badgeSm,
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: theme.dot }]} />
      <Text
        style={[
          styles.text,
          { color: theme.text },
          size === 'sm' && styles.textSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 11,
    fontWeight: '700',
  },
});
