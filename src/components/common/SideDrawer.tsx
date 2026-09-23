import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from './BrandLogo';
import { borderRadius, spacing } from '../../constants/theme';

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface DrawerMenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  badge?: string;
  action?: () => void;
}

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const SideDrawer: React.FC<SideDrawerProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const [wmsExpanded, setWmsExpanded] = useState(true);
  const [containerExpanded, setContainerExpanded] = useState(true);

  const handleNavigate = (route?: string, action?: () => void) => {
    onClose();
    if (action) {
      setTimeout(action, 200);
      return;
    }
    if (route) {
      router.push(route as any);
    }
  };

  const handleLogout = () => {
    onClose();
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

  const mainMenuItems: DrawerMenuItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'grid-outline',
      route: '/(tabs)',
    },
    {
      id: 'inventory',
      title: 'Inventory & SKUs',
      icon: 'cube-outline',
      route: '/(tabs)/inventory',
      badge: '582 SKUs',
    },
    {
      id: 'operations',
      title: 'Floor Operations',
      icon: 'layers-outline',
      route: '/(tabs)/operations',
      badge: 'Active',
    },
  ];

  const secondaryMenuItems: DrawerMenuItem[] = [
    {
      id: 'settings',
      title: 'Terminal Settings',
      icon: 'settings-outline',
      route: '/(tabs)/settings',
    },
    {
      id: 'support',
      title: 'System Diagnostics',
      icon: 'shield-checkmark-outline',
      action: () => Alert.alert('Diagnostics', 'All SAP S/4HANA sync links operational (Latency: 28ms).'),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
            {/* Top Brand Banner */}
            <View style={styles.drawerBrandRow}>
              <View style={styles.drawerBrandLeft}>
                <BrandLogo size={28} rounded />
                <View>
                  <Text style={[styles.drawerBrandTitle, { color: colors.textPrimary }]}>MARKET99 WMS</Text>
                  <Text style={[styles.drawerBrandSub, { color: colors.textMuted }]}>TERMINAL NODE</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surface3 }]}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* User Info Section */}
            <View style={styles.userSection}>
              <View
                style={[
                  styles.avatarLarge,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: `${colors.primary}40`,
                  },
                ]}
              >
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
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {user?.name || 'Operator Lead'}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {user?.email || 'user.201@market99.com'}
                </Text>
                <View style={styles.roleRow}>
                  <View style={[styles.rolePill, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.rolePillText, { color: colors.primary }]}>
                      {user?.role || 'Lead'}
                    </Text>
                  </View>
                  <Text style={[styles.facilityPill, { backgroundColor: colors.surface3, color: colors.textMuted }]}>
                    {user?.facility || 'WH-01'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Navigation Items */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>MAIN NAVIGATION</Text>
            {mainMenuItems.map((item) => {
              const isActive =
                item.route &&
                (pathname === item.route || (item.route === '/(tabs)' && pathname === '/'));
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    isActive && { backgroundColor: colors.primaryMuted },
                  ]}
                  activeOpacity={0.72}
                  onPress={() => handleNavigate(item.route, item.action)}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        { color: isActive ? colors.primary : colors.textPrimary },
                        isActive && { fontWeight: '700' },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>

                  {item.badge && (
                    <View style={[styles.badgeWrap, { backgroundColor: colors.surface3 }]}>
                      <Text style={[styles.badgeText, { color: colors.textMuted }]}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* PACKING MODULES */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>PACKING MODULES</Text>

            {/* WMS Packing */}
            <View style={[styles.packingGroup, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.packingGroupHeader}
                activeOpacity={0.7}
                onPress={() => setWmsExpanded(!wmsExpanded)}
              >
                <View style={styles.packingGroupHeaderLeft}>
                  <View style={[styles.nodeIconWrap, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="cube" size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.packingGroupTitle, { color: colors.textPrimary }]}>WMS Packing</Text>
                </View>
                <Ionicons
                  name={wmsExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {wmsExpanded && (
                <View style={styles.subMenuList}>
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      pathname.includes('/packing/wms-registration') && { backgroundColor: colors.surface3 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate('/(tabs)/packing/wms-registration')}
                  >
                    <View style={styles.subMenuItemLeft}>
                      <Ionicons
                        name="create-outline"
                        size={15}
                        color={
                          pathname.includes('/packing/wms-registration')
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.subMenuItemText,
                          {
                            color: pathname.includes('/packing/wms-registration')
                              ? colors.primary
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        Registration
                      </Text>
                    </View>
                    <View style={[styles.subBadge, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={[styles.subBadgeText, { color: colors.primary }]}>Carton</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      pathname.includes('/packing/wms-scanning') && { backgroundColor: colors.surface3 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate('/(tabs)/packing/wms-scanning')}
                  >
                    <View style={styles.subMenuItemLeft}>
                      <Ionicons
                        name="barcode-outline"
                        size={15}
                        color={
                          pathname.includes('/packing/wms-scanning')
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.subMenuItemText,
                          {
                            color: pathname.includes('/packing/wms-scanning')
                              ? colors.primary
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        Scanning
                      </Text>
                    </View>
                    <View style={[styles.subBadge, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={[styles.subBadgeText, { color: colors.primary }]}>Laser</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Container Packing */}
            <View style={[styles.packingGroup, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.packingGroupHeader}
                activeOpacity={0.7}
                onPress={() => setContainerExpanded(!containerExpanded)}
              >
                <View style={styles.packingGroupHeaderLeft}>
                  <View style={[styles.nodeIconWrap, { backgroundColor: colors.amberMuted }]}>
                    <Ionicons name="boat" size={14} color={colors.amber} />
                  </View>
                  <Text style={[styles.packingGroupTitle, { color: colors.textPrimary }]}>
                    Container Packing
                  </Text>
                </View>
                <Ionicons
                  name={containerExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {containerExpanded && (
                <View style={styles.subMenuList}>
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      pathname.includes('/packing/container-registration') && { backgroundColor: colors.surface3 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate('/(tabs)/packing/container-registration')}
                  >
                    <View style={styles.subMenuItemLeft}>
                      <Ionicons
                        name="document-text-outline"
                        size={15}
                        color={
                          pathname.includes('/packing/container-registration')
                            ? colors.amber
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.subMenuItemText,
                          {
                            color: pathname.includes('/packing/container-registration')
                              ? colors.amber
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        Registration
                      </Text>
                    </View>
                    <View style={[styles.subBadge, { backgroundColor: colors.amberMuted }]}>
                      <Text style={[styles.subBadgeText, { color: colors.amber }]}>Seal</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      pathname.includes('/packing/container-scanning') && { backgroundColor: colors.surface3 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate('/(tabs)/packing/container-scanning')}
                  >
                    <View style={styles.subMenuItemLeft}>
                      <Ionicons
                        name="qr-code-outline"
                        size={15}
                        color={
                          pathname.includes('/packing/container-scanning')
                            ? colors.amber
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.subMenuItemText,
                          {
                            color: pathname.includes('/packing/container-scanning')
                              ? colors.amber
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        Scanning
                      </Text>
                    </View>
                    <View style={[styles.subBadge, { backgroundColor: colors.amberMuted }]}>
                      <Text style={[styles.subBadgeText, { color: colors.amber }]}>Pallet</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
              SYSTEM & PREFERENCES
            </Text>
            {secondaryMenuItems.map((item) => {
              const isActive = item.route && pathname === item.route;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    isActive && { backgroundColor: colors.primaryMuted },
                  ]}
                  activeOpacity={0.72}
                  onPress={() => handleNavigate(item.route, item.action)}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        { color: isActive ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
            <View style={styles.drawerBottomRow}>
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
                <Text style={[styles.logoutText, { color: colors.red }]}>Sign Out</Text>
              </TouchableOpacity>
              <ThemeToggle />
            </View>

            <Text style={[styles.versionText, { color: colors.textMuted }]}>
              WMS Pro v2.4.1 • Build 5702
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawer: {
    width: '84%',
    maxWidth: 320,
    height: '100%',
    borderRightWidth: 1,
  },
  drawerHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
  },
  drawerBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerBrandTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  drawerBrandSub: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  rolePillText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  facilityPill: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs + 3,
    marginLeft: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.md,
    marginBottom: 3,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeWrap: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  packingGroup: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.xs + 2,
    borderWidth: 1,
  },
  packingGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  packingGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nodeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packingGroupTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  subMenuList: {
    paddingLeft: spacing.sm,
    paddingTop: 4,
    gap: 3,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
  },
  subMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subMenuItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  subBadgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    marginHorizontal: spacing.sm,
  },
  drawerFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  drawerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
