import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export const darkColors = {
  // Theme Backgrounds
  background: '#0B0F14',
  outerBg: '#070B10',
  surface: '#131A22',
  surface2: '#1A2332',
  surface3: '#1F2D3D',
  card: '#131A22',

  // Borders
  border: '#243040',
  borderLight: '#1A2332',
  borderActive: '#2E4060',
  borderFocus: '#00D68F',
  divider: '#243040',
  inputBg: '#1F2D3D',

  // Primary Emerald Brand
  primary: '#00D68F',
  emerald: '#00D68F',
  accent: '#00D68F',
  primaryDim: '#00A86B',
  primaryMuted: 'rgba(0, 214, 143, 0.15)',
  primaryLight: 'rgba(0, 214, 143, 0.20)',
  primaryDark: '#00A86B',
  primaryDarker: '#006644',
  primarySoft: 'rgba(0, 214, 143, 0.15)',
  primarySurface: '#1A2E26',

  // Amber / Container Module
  amber: '#F5A623',
  amberDim: '#D48A10',
  amberLight: 'rgba(245, 166, 35, 0.20)',
  amberMuted: 'rgba(245, 166, 35, 0.15)',
  amberBorder: '#A06010',

  // Violet / Put Away Module
  violet: '#A78BFA',
  purple: '#A78BFA',
  violetDim: '#7C5FE6',
  violetMuted: 'rgba(167, 139, 250, 0.15)',
  purpleLight: 'rgba(167, 139, 250, 0.20)',
  purpleBorder: '#5B3DB5',
  purpleMuted: 'rgba(167, 139, 250, 0.15)',

  // Status
  success: '#00D68F',
  successLight: 'rgba(0, 214, 143, 0.15)',
  successBorder: '#00A86B',
  successMuted: 'rgba(0, 214, 143, 0.15)',

  warning: '#F5A623',
  warningLight: 'rgba(245, 166, 35, 0.15)',
  warningBorder: '#D48A10',
  warningMuted: 'rgba(245, 166, 35, 0.15)',

  red: '#F87171',
  redMuted: 'rgba(248, 113, 113, 0.15)',
  danger: '#F87171',
  dangerLight: 'rgba(248, 113, 113, 0.15)',
  dangerBorder: '#EF4444',
  dangerMuted: 'rgba(248, 113, 113, 0.12)',

  blue: '#60A5FA',
  blueMuted: 'rgba(96, 165, 250, 0.15)',
  info: '#60A5FA',
  infoLight: 'rgba(96, 165, 250, 0.15)',
  infoBorder: '#3B82F6',

  // Typography - High Contrast Dark Mode
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#CBD5E1',

  white: '#FFFFFF',
  navy: '#0D1B2A',
};

export const lightColors = {
  // Theme Backgrounds
  background: '#F1F5F9',
  outerBg: '#E2E8F0',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  surface3: '#EDF2F7',
  card: '#FFFFFF',

  // Borders
  border: '#CBD5E1',
  borderLight: '#E2E8F0',
  borderActive: '#94A3B8',
  borderFocus: '#00B877',
  divider: '#E2E8F0',
  inputBg: '#F8FAFC',

  // Primary Emerald Brand
  primary: '#009660',
  emerald: '#009660',
  accent: '#009660',
  primaryDim: '#007A50',
  primaryMuted: 'rgba(0, 150, 96, 0.12)',
  primaryLight: 'rgba(0, 150, 96, 0.18)',
  primaryDark: '#007A50',
  primaryDarker: '#005C3C',
  primarySoft: 'rgba(0, 150, 96, 0.12)',
  primarySurface: '#E6F9F2',

  // Amber / Container Module
  amber: '#D97706',
  amberDim: '#B45309',
  amberLight: 'rgba(217, 119, 6, 0.15)',
  amberMuted: 'rgba(217, 119, 6, 0.12)',
  amberBorder: '#B45309',

  // Violet / Put Away Module
  violet: '#7C3AED',
  purple: '#7C3AED',
  violetDim: '#6D28D9',
  violetMuted: 'rgba(124, 58, 237, 0.12)',
  purpleLight: 'rgba(124, 58, 237, 0.18)',
  purpleBorder: '#5B21B6',
  purpleMuted: 'rgba(124, 58, 237, 0.12)',

  // Status
  success: '#059669',
  successLight: 'rgba(5, 150, 105, 0.12)',
  successBorder: '#047857',
  successMuted: 'rgba(5, 150, 105, 0.12)',

  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.12)',
  warningBorder: '#B45309',
  warningMuted: 'rgba(217, 119, 6, 0.12)',

  red: '#DC2626',
  redMuted: 'rgba(220, 38, 38, 0.10)',
  danger: '#DC2626',
  dangerLight: 'rgba(220, 38, 38, 0.10)',
  dangerBorder: '#991B1B',
  dangerMuted: 'rgba(220, 38, 38, 0.10)',

  blue: '#2563EB',
  blueMuted: 'rgba(37, 99, 235, 0.12)',
  info: '#2563EB',
  infoLight: 'rgba(37, 99, 235, 0.12)',
  infoBorder: '#1D4ED8',

  // Typography - High Contrast Light Mode
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textLight: '#475569',

  white: '#FFFFFF',
  navy: '#0F172A',
};

// Default fallback colors (dark)
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 8,
  },
  primaryGlow: {
    shadowColor: '#00D68F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
};
