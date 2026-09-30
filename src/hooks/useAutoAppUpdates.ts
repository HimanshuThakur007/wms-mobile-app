import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to automatically check, download, and apply wireless Over-The-Air (OTA) updates
 * on production handheld devices without requiring manual APK reinstalls.
 */
export function useAutoAppUpdates() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web') {
      return;
    }

    async function checkForUpdates() {
      try {
        setIsChecking(true);
        const Updates = require('expo-updates');

        // Check if OTA update is available from Expo server
        const checkResult = await Updates.checkForUpdateAsync();
        if (checkResult.isAvailable) {
          setUpdateAvailable(true);
          console.log('⚡ NEW WIRELESS OTA UPDATE DETECTED. DOWNLOADING IN BACKGROUND...');

          // Download update in background
          const fetchResult = await Updates.fetchUpdateAsync();
          if (fetchResult.isNew) {
            setIsUpdateReady(true);
            console.log('✅ WIRELESS OTA UPDATE DOWNLOADED AND READY TO APPLY.');
          }
        }
      } catch (err: any) {
        console.log('OTA UPDATE CHECK NOTICE:', err?.message || err);
      } finally {
        setIsChecking(false);
      }
    }

    checkForUpdates();
  }, []);

  const applyUpdateNow = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Updates = require('expo-updates');
      await Updates.reloadAsync();
    } catch (err) {
      console.log('RELOAD UPDATE ERROR:', err);
    }
  };

  return {
    isChecking,
    updateAvailable,
    isUpdateReady,
    applyUpdateNow,
  };
}
