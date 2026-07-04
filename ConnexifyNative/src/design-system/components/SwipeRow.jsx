import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { trigger } from 'react-native-haptic-feedback';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';

/**
 * Swipe-to-act row. actions (revealed from the right on left-swipe):
 * [{ key, label, icon, color, onPress }]. Row closes after an action.
 */
export default function SwipeRow({ children, actions = [], style }) {
  const theme = useTheme();
  const ref = useRef(null);

  if (!actions.length) return <View style={style}>{children}</View>;

  const renderRightActions = () => (
    <View style={styles.actions}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              trigger('impactLight', { enableVibrateFallback: false });
              ref.current?.close();
              action.onPress?.();
            }}
            style={[styles.action, { backgroundColor: action.color || theme.brand, borderRadius: theme.radius.md }]}
          >
            {Icon ? <Icon size={19} color="#FFFFFF" strokeWidth={2.2} /> : null}
            <AppText variant="micro" color="#FFFFFF">
              {action.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={36}
      containerStyle={style}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 6, paddingLeft: 8 },
  action: { width: 64, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
