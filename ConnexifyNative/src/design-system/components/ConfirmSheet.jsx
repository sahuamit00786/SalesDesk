import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Sheet from './Sheet';
import AppText from './AppText';
import Button from './Button';
import { AlertTriangle, CircleHelp } from '../icons';
import { useTheme } from '../ThemeProvider';

/**
 * Imperative confirm dialog (bottom sheet).
 * ref.open({ title, message, confirmLabel, cancelLabel, destructive, onConfirm })
 */
const ConfirmSheet = forwardRef(function ConfirmSheet(_, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      setConfig(cfg);
      setBusy(false);
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const confirm = async () => {
    if (!config?.onConfirm) {
      sheetRef.current?.dismiss();
      return;
    }
    try {
      setBusy(true);
      await config.onConfirm();
      sheetRef.current?.dismiss();
    } catch {
      // caller surfaces its own error toast
      sheetRef.current?.dismiss();
    } finally {
      setBusy(false);
    }
  };

  const destructive = Boolean(config?.destructive);

  return (
    <Sheet ref={sheetRef} onDismiss={() => setConfig(null)}>
      <View style={styles.center}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: destructive ? theme.colors.dangerSoft : theme.brandSoft,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {destructive ? (
            <AlertTriangle size={26} color={theme.colors.danger} strokeWidth={2.2} />
          ) : (
            <CircleHelp size={26} color={theme.brand} strokeWidth={2.2} />
          )}
        </View>
        <AppText variant="heading" style={styles.title}>
          {config?.title || 'Are you sure?'}
        </AppText>
        {config?.message ? (
          <AppText variant="body" color="inkMuted" style={styles.message}>
            {config.message}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          title={config?.cancelLabel || 'Cancel'}
          variant="ghost"
          onPress={() => sheetRef.current?.dismiss()}
          style={styles.action}
        />
        <Button
          title={config?.confirmLabel || (destructive ? 'Delete' : 'Confirm')}
          variant={destructive ? 'danger' : 'primary'}
          loading={busy}
          onPress={confirm}
          style={styles.action}
        />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 6 },
  iconWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 6, paddingHorizontal: 10 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  action: { flex: 1 },
});

export default ConfirmSheet;
