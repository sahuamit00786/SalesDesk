import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import Toast from 'react-native-toast-message';
import Sheet from '../../design-system/components/Sheet';
import AppText from '../../design-system/components/AppText';
import { Check, Building2 } from '../../design-system/icons';
import { useTheme } from '../../design-system/ThemeProvider';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore, workspacesFromUser, resolveWorkspaceId } from '../../stores/workspaceStore';
import { queryClient } from '../../app/QueryProvider';
import { BRAND_DEFAULT } from '../../design-system/tokens/colors';

/** Bottom sheet to switch the active workspace. ref.open() */
const WorkspaceSwitcherSheet = forwardRef(function WorkspaceSwitcherSheet(_, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const preferredId = useWorkspaceStore((s) => s.preferredId);
  const setActive = useWorkspaceStore((s) => s.setActive);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  const workspaces = workspacesFromUser(user);
  const activeId = resolveWorkspaceId(user, preferredId);

  const pick = async (ws) => {
    if (ws.id !== activeId) {
      trigger('impactLight', { enableVibrateFallback: false });
      await setActive(ws.id);
      queryClient.clear(); // never serve cross-workspace cache
      Toast.show({ type: 'info', text1: `Switched to ${ws.name}` });
    }
    sheetRef.current?.dismiss();
  };

  return (
    <Sheet ref={sheetRef} title="Workspaces" subtitle="Data and theme follow the selected workspace">
      {workspaces.length === 0 ? (
        <AppText variant="body" color="inkFaint" style={styles.empty}>
          No workspaces available
        </AppText>
      ) : (
        workspaces.map((ws) => {
          const active = ws.id === activeId;
          return (
            <Pressable
              key={ws.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => pick(ws)}
              style={[
                styles.row,
                {
                  backgroundColor: active ? theme.brandFaint : 'transparent',
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: ws.themeColor || BRAND_DEFAULT, borderRadius: theme.radius.sm },
                ]}
              >
                <Building2 size={15} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <View style={styles.texts}>
                <AppText variant={active ? 'bodyStrong' : 'body'}>{ws.name}</AppText>
                {ws.defaultCurrency ? (
                  <AppText variant="caption" color="inkFaint">
                    {String(ws.defaultCurrency).toUpperCase()}
                  </AppText>
                ) : null}
              </View>
              {active ? <Check size={18} color={theme.brand} strokeWidth={2.6} /> : null}
            </Pressable>
          );
        })
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  empty: { textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  swatch: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
});

export default WorkspaceSwitcherSheet;
