import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderActionsProps {
  showSettings?: boolean;
  showLogout?: boolean;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  showSettings = true,
  showLogout = true,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const { colors } = useTheme();

  const isSettings = pathname === '/(tabs)/settings' || pathname === '/settings';

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
    <View style={styles.container}>
      {showSettings && !isSettings && (
        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: colors.surface2, borderColor: colors.border },
          ]}
          onPress={() => router.push('/(tabs)/settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {showLogout && (
        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: colors.redMuted, borderColor: `${colors.red}30` },
          ]}
          onPress={handleLogout}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
