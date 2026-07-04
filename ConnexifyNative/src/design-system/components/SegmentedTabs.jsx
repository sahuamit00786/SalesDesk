import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { trigger } from 'react-native-haptic-feedback';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';

/**
 * Segmented control with sliding indicator (equal-width segments).
 * tabs: [{key, label, count?}]
 */
export function SegmentedTabs({ tabs, value, onChange, style }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((t) => t.key === value));
  const translate = useSharedValue(0);
  const segW = width / Math.max(1, tabs.length);

  React.useEffect(() => {
    translate.value = withSpring(index * segW, theme.motion.springs.press);
  }, [index, segW]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translate.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}
      style={[
        styles.track,
        { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : theme.colors.skeleton, borderRadius: theme.radius.md },
        style,
      ]}
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segW,
              backgroundColor: theme.colors.card,
              borderRadius: theme.radius.sm + 2,
              ...theme.elevation.card,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              trigger('selection', { enableVibrateFallback: false });
              onChange(tab.key);
            }}
            style={styles.segment}
          >
            <AppText variant={active ? 'captionStrong' : 'caption'} color={active ? 'ink' : 'inkFaint'} numberOfLines={1}>
              {tab.label}
              {tab.count != null ? ` (${tab.count})` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Underline tabs (scrollable) for detail pages — web PageTabButton feel.
 */
export function UnderlineTabs({ tabs, value, onChange, style }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.underlineWrap, { borderBottomColor: theme.colors.divider }, style]}
      contentContainerStyle={styles.underlineContent}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              trigger('selection', { enableVibrateFallback: false });
              onChange(tab.key);
            }}
            style={[styles.underlineTab, active && { borderBottomColor: theme.brand }]}
          >
            <AppText variant={active ? 'bodyStrong' : 'body'} color={active ? 'brand' : 'inkFaint'}>
              {tab.label}
              {tab.count != null ? ` ${tab.count}` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, position: 'relative' },
  indicator: { position: 'absolute', top: 4, bottom: 4, left: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  underlineWrap: { borderBottomWidth: 1, flexGrow: 0 },
  underlineContent: { paddingHorizontal: 4 },
  underlineTab: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
