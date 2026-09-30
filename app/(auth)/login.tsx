import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, CREDENTIALS_STORAGE_KEY } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { ThemeToggle } from '../../src/components/common/ThemeToggle';
import { LanguageToggle } from '../../src/components/common/LanguageToggle';
import { BrandLogo } from '../../src/components/common/BrandLogo';
import { SafeStorage } from '../../src/utils/storage';
import { borderRadius, spacing } from '../../src/constants/theme';

const REMEMBER_EMAIL_KEY = 'wms_remembered_email';
const REMEMBER_PASS_KEY = 'wms_remembered_pass';
const REMEMBER_TOGGLE_KEY = 'wms_remember_me_toggle';
const monoFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const isCompact = height < 750;
  const { login, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedToggle = await SafeStorage.getItem(REMEMBER_TOGGLE_KEY);
      if (savedToggle === 'false') {
        setRememberMe(false);
        return;
      }
      setRememberMe(true);

      // Try loading from CREDENTIALS_STORAGE_KEY first
      const credsStr = await SafeStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (credsStr) {
        try {
          const parsed = JSON.parse(credsStr);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.password) setPassword(parsed.password);
          return;
        } catch (e) {}
      }

      // Fallback to REMEMBER_EMAIL_KEY / REMEMBER_PASS_KEY
      const savedEmail = await SafeStorage.getItem(REMEMBER_EMAIL_KEY);
      const savedPass = await SafeStorage.getItem(REMEMBER_PASS_KEY);
      if (savedEmail) setEmail(savedEmail);
      if (savedPass) setPassword(savedPass);
    } catch (e) {
      console.log('LOAD SAVED LOGIN ERROR:', e);
    }
  };

  const toggleRememberMe = async () => {
    const nextVal = !rememberMe;
    setRememberMe(nextVal);
    try {
      if (!nextVal) {
        await SafeStorage.setItem(REMEMBER_TOGGLE_KEY, 'false');
        await SafeStorage.removeItem(REMEMBER_EMAIL_KEY);
        await SafeStorage.removeItem(REMEMBER_PASS_KEY);
        await SafeStorage.removeItem(CREDENTIALS_STORAGE_KEY);
      } else {
        await SafeStorage.setItem(REMEMBER_TOGGLE_KEY, 'true');
      }
    } catch (e) {
      console.log('TOGGLE REMEMBER ERROR:', e);
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail) {
      setErrorMsg(t('Please enter your Operator / Employee ID or Email'));
      return;
    }
    if (!trimmedPass) {
      setErrorMsg(t('Please enter your password'));
      return;
    }

    try {
      const success = await login(trimmedEmail, trimmedPass, rememberMe);
      if (success) {
        if (rememberMe) {
          await SafeStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
          await SafeStorage.setItem(REMEMBER_PASS_KEY, trimmedPass);
          await SafeStorage.setItem(REMEMBER_TOGGLE_KEY, 'true');
          await SafeStorage.setItem(
            CREDENTIALS_STORAGE_KEY,
            JSON.stringify({ email: trimmedEmail, password: trimmedPass })
          );
        } else {
          await SafeStorage.removeItem(REMEMBER_EMAIL_KEY);
          await SafeStorage.removeItem(REMEMBER_PASS_KEY);
          await SafeStorage.setItem(REMEMBER_TOGGLE_KEY, 'false');
          await SafeStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        }
        router.replace('/(tabs)');
      } else {
        setErrorMsg(t('Invalid User ID or Password. Please try again.'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message ? t(err.message, err.message) : t('Authentication error. Please check your connection.'));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, isCompact ? 6 : 16) }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompact && { paddingHorizontal: 14, paddingBottom: 14, justifyContent: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with LanguageToggle & ThemeToggle */}
          <View style={[styles.topBar, isCompact && { marginBottom: 6, marginTop: 0 }]}>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.liveText, { color: colors.primary }]}>{t('TERMINAL ONLINE')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LanguageToggle />
              <ThemeToggle />
            </View>
          </View>

          {/* Logo / Brand Header */}
          <View style={[styles.brandSection, isCompact && { marginBottom: 8 }]}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                },
                isCompact && { width: 48, height: 48, marginBottom: 4, borderRadius: 12 },
              ]}
            >
              <BrandLogo size={isCompact ? 36 : 48} rounded />
            </View>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }, isCompact && { fontSize: 17 }]}>
              MARKET99 WMS
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }, isCompact && { fontSize: 10, marginTop: 1 }]}>
              Warehouse Management System · v2.4.1
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              isCompact && { padding: 12, marginBottom: 8, borderRadius: 12 },
            ]}
          >
            <View style={[styles.cardHeader, isCompact && { marginBottom: 8 }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }, isCompact && { fontSize: 15 }]}>
                {t('Sign In')}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }, isCompact && { fontSize: 11, marginTop: 1 }]}>
                {t('Enter operator credentials for this terminal')}
              </Text>
            </View>

            {/* Error Banner */}
            {errorMsg ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.redMuted,
                    borderColor: `${colors.red}40`,
                  },
                  isCompact && { padding: 8, marginBottom: 6 },
                ]}
              >
                <Ionicons name="alert-circle" size={14} color={colors.red} />
                <Text style={[styles.errorText, { color: colors.red }, isCompact && { fontSize: 11 }]}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* User ID / Email Input */}
            <View style={[styles.inputGroup, isCompact && { marginBottom: 6 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }, isCompact && { fontSize: 12, marginBottom: 4 }]}>
                {t('USER ID / EMAIL')} <Text style={{ color: colors.red }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: emailFocused ? colors.primary : colors.border,
                  },
                  isCompact && { height: 40, paddingHorizontal: 10, borderRadius: 8 },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={isCompact ? 14 : 16}
                  color={emailFocused ? colors.primary : colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }, isCompact && { fontSize: 12 }]}
                  placeholder="e.g. USER201 or user@market99.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(tVal) => {
                    setEmail(tVal);
                    if (errorMsg) setErrorMsg('');
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={[styles.inputGroup, isCompact && { marginBottom: 6 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }, isCompact && { fontSize: 12, marginBottom: 4 }]}>
                {t('PASSWORD')} <Text style={{ color: colors.red }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: passFocused ? colors.primary : colors.border,
                  },
                  isCompact && { height: 40, paddingHorizontal: 10, borderRadius: 8 },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={isCompact ? 14 : 16}
                  color={passFocused ? colors.primary : colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }, isCompact && { fontSize: 12 }]}
                  placeholder={t('Enter terminal password')}
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(tVal) => {
                    setPassword(tVal);
                    if (errorMsg) setErrorMsg('');
                  }}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={isCompact ? 16 : 18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me Toggle */}
            <TouchableOpacity
              style={[styles.rememberRow, isCompact && { marginVertical: 2 }]}
              activeOpacity={0.7}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: rememberMe ? colors.primary : 'transparent',
                    borderColor: rememberMe ? colors.primary : colors.border,
                  },
                  isCompact && { width: 16, height: 16 },
                ]}
              >
                {rememberMe && <Ionicons name="checkmark" size={isCompact ? 11 : 13} color="#0B0F14" />}
              </View>
              <Text style={[styles.rememberText, { color: colors.textSecondary }, isCompact && { fontSize: 11 }]}>
                {t('Remember credentials on this terminal')}
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary },
                isCompact && { paddingVertical: 10, marginTop: 6, borderRadius: 8 },
                isLoading && { opacity: 0.6 },
              ]}
              disabled={isLoading}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0B0F14" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={isCompact ? 16 : 18} color="#0B0F14" />
                  <Text style={[styles.submitBtnText, isCompact && { fontSize: 13 }]}>{t('Sign In to Terminal')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* System Status Strip */}
          <View
            style={[
              styles.statusStrip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              isCompact && { paddingVertical: 6, borderRadius: 8 },
            ]}
          >
            <View style={styles.statusItem}>
              <Text style={[styles.statusVal, { color: colors.primary }, isCompact && { fontSize: 8 }]}>{t('FACILITY')}</Text>
              <Text style={[styles.statusLabel, { color: colors.textPrimary }, isCompact && { fontSize: 10 }]}>{t('WH-01 MAIN')}</Text>
            </View>
            <View style={[styles.statusDivider, { backgroundColor: colors.border }, isCompact && { height: 18 }]} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusVal, { color: colors.amber }, isCompact && { fontSize: 8 }]}>{t('GATEWAY')}</Text>
              <Text style={[styles.statusLabel, { color: colors.textPrimary }, isCompact && { fontSize: 10 }]}>10.12.0.1</Text>
            </View>
            <View style={[styles.statusDivider, { backgroundColor: colors.border }, isCompact && { height: 18 }]} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusVal, { color: colors.violet }, isCompact && { fontSize: 8 }]}>{t('MODE')}</Text>
              <Text style={[styles.statusLabel, { color: colors.textPrimary }, isCompact && { fontSize: 10 }]}>{t('LASER / SYNC')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontFamily: monoFont,
    marginTop: 4,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '500',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: 8,
    marginTop: spacing.md,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#0B0F14',
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    borderWidth: 1,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusVal: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: 24,
  },
});
