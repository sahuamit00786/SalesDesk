import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, borderRadius } from '../../theme';

const TAB_CONFIG = [
  { name: 'Home',       icon: 'home-outline',           iconActive: 'home',           label: 'Home'       },
  { name: 'Leads',      icon: 'account-group-outline',  iconActive: 'account-group',  label: 'Leads'      },
  { name: 'Deals',      icon: 'briefcase-outline',      iconActive: 'briefcase',      label: 'Deals'      },
  { name: 'Activity',   icon: 'lightning-bolt-outline', iconActive: 'lightning-bolt', label: 'Activity'   },
  { name: 'Attendance', icon: 'clock-outline',          iconActive: 'clock-check',    label: 'Attendance' },
];

const TabItem = ({ route, isFocused, onPress }) => {
  const { theme } = useTheme();
  const config = TAB_CONFIG.find((t) => t.name === route.name) || TAB_CONFIG[0];
  const scale = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: isFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 250, useNativeDriver: true }),
    ]).start();
    ReactNativeHapticFeedback.trigger('impactLight');
    onPress();
  };

  const bgColor = bgOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(79,70,229,0)', theme.colors.primaryLight],
  });

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="tab"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[styles.iconWrap, { backgroundColor: bgColor, transform: [{ scale }] }]}>
        <Icon
          name={isFocused ? config.iconActive : config.icon}
          size={21}
          color={isFocused ? theme.colors.primary : theme.colors.textMuted}
        />
      </Animated.View>
      <Text
        style={[
          styles.label,
          { color: isFocused ? theme.colors.primary : theme.colors.textMuted },
          isFocused && styles.labelActive,
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </TouchableOpacity>
  );
};

const BottomTabBar = ({ state, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: theme.colors.borderLight,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
      ]}
    >
      {state.routes.map((route, index) => (
        <TabItem
          key={route.key}
          route={route}
          isFocused={state.index === index}
          onPress={() => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) navigation.navigate(route.name);
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 50,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: fontWeight.semibold,
  },
});

export default BottomTabBar;
