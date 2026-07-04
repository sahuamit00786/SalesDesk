import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { WifiOff } from '../icons';
import { useTheme } from '../ThemeProvider';

export default function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return unsub;
  }, []);

  if (!offline) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(250)}
      style={[styles.banner, { top: insets.top + 6, backgroundColor: theme.colors.ink }]}
      pointerEvents="none"
    >
      <WifiOff size={14} color={theme.colors.page} strokeWidth={2.4} />
      <AppText variant="captionStrong" color={theme.colors.page}>
        You're offline — showing cached data
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 999,
    elevation: 10,
  },
});
