import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Button from '../../../design-system/components/Button';
import { Fingerprint, KeyRound, ShieldCheck } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useUiStore } from '../../../stores/uiStore';
import { useAuthStore } from '../../../stores/authStore';
import {
  biometryAvailable,
  enableBiometricUnlock,
  disableBiometricUnlock,
} from '../../../api/tokenStore';
import { authApi } from '../../auth/api';

export default function SecurityScreen() {
  const theme = useTheme();
  const biometricEnabled = useUiStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useUiStore((s) => s.setBiometricEnabled);
  const user = useAuthStore((s) => s.user);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    biometryAvailable().then(setAvailable);
  }, []);

  const toggleBiometric = async (next) => {
    try {
      setBusy(true);
      if (next) {
        await enableBiometricUnlock();
        Toast.show({ type: 'success', text1: 'Biometric unlock enabled' });
      } else {
        await disableBiometricUnlock();
        Toast.show({ type: 'info', text1: 'Biometric unlock disabled' });
      }
      await setBiometricEnabled(next);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not update biometrics', text2: err?.message });
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    try {
      setBusy(true);
      await authApi.forgotPassword(user?.email || '');
      setResetSent(true);
      Toast.show({ type: 'success', text1: 'Reset code sent', text2: `Check ${user?.email}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not send reset code', text2: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold>
      <AppHeader title="Security" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
              <Fingerprint size={20} color={theme.brand} strokeWidth={2.1} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Biometric unlock</AppText>
              <AppText variant="caption" color="inkMuted">
                {available
                  ? 'Require your fingerprint when the app opens'
                  : 'No biometrics enrolled on this device'}
              </AppText>
            </View>
            <Switch
              value={biometricEnabled}
              disabled={!available || busy}
              onValueChange={toggleBiometric}
              trackColor={{ true: theme.brand, false: theme.colors.skeleton }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md }]}>
              <KeyRound size={20} color={theme.colors.warning} strokeWidth={2.1} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Change password</AppText>
              <AppText variant="caption" color="inkMuted">
                We'll email a reset code to {user?.email}
              </AppText>
            </View>
          </View>
          <Button
            title={resetSent ? 'Code sent — check your inbox' : 'Send reset code'}
            variant="secondary"
            fullWidth
            loading={busy && !resetSent}
            disabled={resetSent}
            onPress={sendReset}
            style={styles.resetBtn}
          />
          {resetSent ? (
            <AppText variant="caption" color="inkMuted" style={styles.resetNote}>
              Sign out, then use "Forgot password?" on the sign-in screen with the code we sent.
            </AppText>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.successSoft, borderRadius: theme.radius.md }]}>
              <ShieldCheck size={20} color={theme.colors.success} strokeWidth={2.1} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Session security</AppText>
              <AppText variant="caption" color="inkMuted">
                Tokens are stored in the Android keystore and rotate automatically. Signing out invalidates them everywhere.
              </AppText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  resetBtn: { marginTop: 14 },
  resetNote: { marginTop: 10 },
});
