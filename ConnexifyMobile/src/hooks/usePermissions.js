import { useEffect, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';

// NOTE: add `react-native-permissions` to package.json and pod install
// npm install react-native-permissions

const GPS_PERMISSION = Platform.select({
  android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  ios:     PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
});

const NOTIFICATION_PERMISSION = Platform.select({
  android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
  ios:     PERMISSIONS.IOS.NOTIFICATIONS,
});

const openSettings = () => {
  Alert.alert(
    'Permission Required',
    'Please enable this permission in your device settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
};

export const usePermissions = () => {
  const requestGPS = useCallback(async () => {
    try {
      const current = await check(GPS_PERMISSION);
      if (current === RESULTS.GRANTED) return true;
      if (current === RESULTS.BLOCKED) { openSettings(); return false; }
      const result = await request(GPS_PERMISSION);
      return result === RESULTS.GRANTED;
    } catch (e) {
      console.warn('GPS permission error:', e);
      return false;
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version < 33) return true;
      const current = await check(NOTIFICATION_PERMISSION);
      if (current === RESULTS.GRANTED) return true;
      if (current === RESULTS.BLOCKED) { openSettings(); return false; }
      const result = await request(NOTIFICATION_PERMISSION);
      return result === RESULTS.GRANTED;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }, []);

  const checkGPS = useCallback(async () => {
    try {
      const result = await check(GPS_PERMISSION);
      return result === RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  return { requestGPS, requestNotifications, checkGPS };
};
