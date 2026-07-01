import React, { useRef, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from './theme/ThemeContext';
import { DrawerProvider } from './context/DrawerContext';
import { useUIStore } from './store/uiStore';
import Navigation from './navigation';
import LoaderOverlay from './components/feedback/LoaderOverlay';
import NetworkBanner from './components/feedback/NetworkBanner';

const AppInner = () => {
  const navigationRef = useRef(null);
  const { globalLoader, initDarkMode } = useUIStore();

  useEffect(() => { initDarkMode(); }, []);

  return (
    <>
      <Navigation navigationRef={navigationRef} />
      <NetworkBanner />
      <LoaderOverlay visible={globalLoader} />
      <Toast />
    </>
  );
};

const App = () => (
  <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <ThemeProvider>
        <DrawerProvider>
          <BottomSheetModalProvider>
            <AppInner />
          </BottomSheetModalProvider>
        </DrawerProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({ root: { flex: 1 } });

export default App;
