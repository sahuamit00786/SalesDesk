import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navRef } from './navRef';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useTheme } from '../design-system/ThemeProvider';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import BiometricGateScreen from '../features/auth/screens/BiometricGateScreen';

const Root = createNativeStackNavigator();

function BootSplash() {
  const theme = useTheme();
  return (
    <View style={[styles.boot, { backgroundColor: theme.colors.page }]}>
      <ActivityIndicator size="large" color={theme.brand} />
    </View>
  );
}

export default function Navigation() {
  const status = useAuthStore((s) => s.status);
  const biometricEnabled = useUiStore((s) => s.biometricEnabled);
  const unlocked = useUiStore((s) => s.unlocked);
  const theme = useTheme();
  const locked = status === 'authed' && biometricEnabled && !unlocked;

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.brand,
      background: theme.colors.page,
      card: theme.colors.card,
      text: theme.colors.ink,
      border: theme.colors.border,
    },
  };

  if (status === 'boot') return <BootSplash />;

  return (
    <NavigationContainer ref={navRef} theme={navTheme}>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {status !== 'authed' ? (
          <Root.Screen name="Auth" component={AuthStack} />
        ) : locked ? (
          <Root.Screen name="BiometricGate" component={BiometricGateScreen} />
        ) : (
          <Root.Screen name="App" component={AppStack} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
