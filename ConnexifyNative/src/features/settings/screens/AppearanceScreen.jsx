import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { trigger } from 'react-native-haptic-feedback';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import { Check, Sun, Moon, Monitor } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useUiStore } from '../../../stores/uiStore';

const OPTIONS = [
  { key: 'system', label: 'System', description: 'Follow the device setting', icon: Monitor },
  { key: 'light', label: 'Light', description: 'Bright surfaces, dark text', icon: Sun },
  { key: 'dark', label: 'Dark', description: 'Dimmed surfaces, easy on the eyes', icon: Moon },
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const colorScheme = useUiStore((s) => s.colorScheme);
  const setColorScheme = useUiStore((s) => s.setColorScheme);

  return (
    <ScreenScaffold>
      <AppHeader title="Appearance" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {OPTIONS.map((option, i) => {
          const active = colorScheme === option.key;
          const Icon = option.icon;
          return (
            <Animated.View key={option.key} entering={FadeInDown.duration(260).delay(i * 50)}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  trigger('selection', { enableVibrateFallback: false });
                  setColorScheme(option.key);
                }}
              >
                <Card
                  style={[
                    styles.card,
                    active && { borderColor: theme.brand, borderWidth: 1.6, backgroundColor: theme.brandFaint },
                  ]}
                >
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: active ? theme.brandSoft : theme.colors.skeleton, borderRadius: theme.radius.md }]}>
                      <Icon size={20} color={active ? theme.brand : theme.colors.inkMuted} strokeWidth={2.1} />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{option.label}</AppText>
                      <AppText variant="caption" color="inkMuted">
                        {option.description}
                      </AppText>
                    </View>
                    {active ? <Check size={20} color={theme.brand} strokeWidth={2.6} /> : null}
                  </View>
                </Card>
              </Pressable>
            </Animated.View>
          );
        })}
        <AppText variant="caption" color="inkFaint" style={styles.note}>
          Your workspace color always follows the workspace theme set on the web app.
        </AppText>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  note: { textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
});
