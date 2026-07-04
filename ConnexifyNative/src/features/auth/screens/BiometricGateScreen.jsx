import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppText from '../../../design-system/components/AppText';
import Button from '../../../design-system/components/Button';
import { Fingerprint } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { readBiometricTokens } from '../../../api/tokenStore';
import { useUiStore } from '../../../stores/uiStore';
import { useAuthStore } from '../../../stores/authStore';

export default function BiometricGateScreen() {
  const theme = useTheme();
  const setUnlocked = useUiStore((s) => s.setUnlocked);
  const logout = useAuthStore((s) => s.logout);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const prompt = async () => {
    setError(null);
    setBusy(true);
    try {
      await readBiometricTokens('Unlock LeadNest');
      setUnlocked(true);
    } catch {
      setError('Biometric check failed or was cancelled');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(prompt, 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.page }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: theme.brandSoft, borderRadius: theme.radius.full }]}>
          <Fingerprint size={40} color={theme.brand} strokeWidth={1.8} />
        </View>
        <AppText variant="title" style={styles.title}>
          LeadNest is locked
        </AppText>
        <AppText variant="body" color="inkMuted" style={styles.subtitle}>
          Use your fingerprint to unlock
        </AppText>
        {error ? (
          <AppText variant="label" color="danger" style={styles.error}>
            {error}
          </AppText>
        ) : null}
        <Button title="Unlock" icon={Fingerprint} size="lg" loading={busy} onPress={prompt} style={styles.unlock} />
        <Button title="Sign out and use password" variant="ghost" onPress={logout} style={styles.fallback} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  center: { alignItems: 'center' },
  iconWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { textAlign: 'center' },
  subtitle: { marginTop: 6, textAlign: 'center' },
  error: { marginTop: 14, textAlign: 'center' },
  unlock: { marginTop: 24, alignSelf: 'stretch' },
  fallback: { marginTop: 10, alignSelf: 'stretch' },
});
