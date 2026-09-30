import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { BrandLogo } from '../../src/components/common/BrandLogo';
import { HeaderActions } from '../../src/components/common/HeaderActions';
import { borderRadius, spacing } from '../../src/constants/theme';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, isDark, isSystemTheme, toggleTheme, useSystemTheme } = useTheme();

  const [offlineSync, setOfflineSync] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your terminal session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandLogo size={32} rounded />
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Terminal Settings</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Theme, Scanner & Profile</Text>
          </View>
        </View>
        <HeaderActions showSettings={false} showLogout={true} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primaryMuted, borderColor: `${colors.primary}40` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'OP'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name || 'Operations Lead'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email || 'user@market99.com'}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{user?.role || 'Lead'}</Text>
              </View>
              <View style={[styles.facilityBadge, { backgroundColor: colors.surface3 }]}>
                <Text style={[styles.facilityBadgeText, { color: colors.textMuted }]}>{user?.facility || 'WH-01'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Appearance & Theme Section */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APPEARANCE & THEME</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={18}
                color={isDark ? colors.violet : colors.amber}
              />
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  {isDark ? 'Dark Theme (Terminal)' : 'Day Theme (Clean)'}
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  {isSystemTheme ? 'Auto-synced with device system appearance' : isDark ? 'High-contrast dark terminal palette' : 'Crisp high-readability daylight mode'}
                </Text>
              </View>
            </View>
            <Switch
              value={!isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.surface3, true: colors.amber }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Match System Appearance
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Automatically switch theme with iOS/Android system mode
                </Text>
              </View>
            </View>
            <Switch
              value={isSystemTheme}
              onValueChange={(val) => {
                if (val) {
                  useSystemTheme();
                } else {
                  toggleTheme();
                }
              }}
              trackColor={{ false: colors.surface3, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Device Settings Section */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>HARDWARE & PREFERENCES</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Offline Mode Caching</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>Sync scans automatically when connected</Text>
              </View>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: colors.surface3, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="radio-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Haptic Feedback</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>Vibrate on successful barcode scan</Text>
              </View>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: colors.surface3, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="volume-high-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Audio Beeps</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>Play tone on scan / warning</Text>
              </View>
            </View>
            <Switch
              value={soundAlerts}
              onValueChange={setSoundAlerts}
              trackColor={{ false: colors.surface3, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* System Info Section */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>TERMINAL DETAILS</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Network', 'Connected to Facility Mesh 5GHz (120 Mbps)')}
          >
            <View style={styles.settingLabelRow}>
              <Ionicons name="wifi-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Network Diagnostics</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Market99 WMS', 'Market99 Warehouse Management System\nVersion: 2.4.1 (Build 5702)\nEnvironment: Production WH-01\nExpo SDK 57')}
          >
            <View style={styles.settingLabelRow}>
              <BrandLogo size={20} rounded />
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>About Market99 WMS</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Brand Identity Card */}
        <View style={[styles.brandCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <BrandLogo size={44} rounded />
          <View style={styles.brandCardText}>
            <Text style={[styles.brandCardTitle, { color: colors.textPrimary }]}>MARKET99 WMS</Text>
            <Text style={[styles.brandCardSub, { color: colors.textMuted }]}>
              Warehouse Management System · Enterprise Edition
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.redMuted,
              borderColor: `${colors.red}40`,
            },
          ]}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={[styles.logoutBtnText, { color: colors.red }]}>Sign Out of Terminal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '500',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  facilityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  facilityBadgeText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs + 3,
    marginLeft: 4,
  },
  settingsGroup: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 14,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  brandCardText: {
    flex: 1,
  },
  brandCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandCardSub: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 2,
    lineHeight: 14,
  },
});
