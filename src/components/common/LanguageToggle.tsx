import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, monoFont } from '../../constants/theme';

export const LanguageToggle = () => {
  const { isHindi, toggleLanguage } = useLanguage();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: isHindi ? colors.violetMuted : colors.surface3,
          borderColor: isHindi ? colors.violet : colors.border,
        },
      ]}
      onPress={toggleLanguage}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={isHindi ? 'Switch to English' : 'Switch to Hindi'}
    >
      <Text style={[styles.langText, { color: isHindi ? colors.violet : colors.textPrimary }]}>
        {isHindi ? 'हिंदी' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 8,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
