import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import QueryProvider from './QueryProvider';
import { ThemeProvider } from '../design-system/ThemeProvider';
import { toastConfig } from '../design-system/toastConfig';
import OfflineBanner from '../design-system/components/OfflineBanner';
import { bootstrapApp } from './bootstrap';
import Navigation from '../navigation';
import RealtimeProvider from '../realtime/RealtimeProvider';
import { initCrashReporting } from './crashReporting';

export default function App() {
  useEffect(() => {
    initCrashReporting();
    bootstrapApp();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <RealtimeProvider>
                <Navigation />
              </RealtimeProvider>
              <OfflineBanner />
              <Toast config={toastConfig} />
            </BottomSheetModalProvider>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
