import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, shadows } from '../../theme';

const TAB_CONFIG = [
  { name: 'Home',       icon: 'home',              iconActive: 'home',              label: 'Home' },
  { name: 'Leads',      icon: 'account-group-outline', iconActive: 'account-group', label: 'Leads' },
  { name: 'Activity',   icon: 'lightning-bolt-outline', iconActive: 'lightning-bolt',label: 'Activity' },
  { name: 'Campaigns',  icon: 'bullhorn-outline',   iconActive: 'bullhorn',          label: 'Campaigns' },
  { name: 'Attendance', icon: 'clock-outline',      iconActive: 'clock',             label: 'Attend.' },
  { name: 'Profile',    icon: 'account-outline',    iconActive: 'account',           label: 'Profile' },
];

const TabItem = ({ route, isFocused, onPress }) => {
  const { theme } = useTheme();
  const config = TAB_CONFIG.find((t) => t.name === route.name) || TAB_CONFIG[0];
  const scale  = useRef(new Animated.Value(isFocused ? 1 : 0.9)).current;
  const labelAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue:        isFocused ? 1 : 0.9,
        useNativeDriver: true,
        damping:        15,
        stiffness:      250,
      }),
      Animated.timing(labelAnim, {
        toValue:        isFocused ? 1 : 0,
        duration:       200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onPress();
  };

  return (
    <TouchableOpacity style={styles.tab} onPress={handlePress} activeOpacity={0.8} accessibilityRole="tab" accessibilityLabel={config.label} accessibilityState={{ selected: isFocused }}>
      {isFocused && (
        <View style={[styles.pill, { backgroundColor: theme.colors.primaryLight }]} />
      )}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name={isFocused ? config.iconActive : config.icon}
          size={22}
          color={isFocused ? theme.colors.primary : theme.colors.textMuted}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          {
            color:   theme.colors.primary,
            opacity: labelAnim,
            height:  labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }),
          },
        ]}
      >
        {config.label}
      </Animated.Text>
    </TouchableOpacity>
  );
};

const BottomTabBar = ({ state, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom || 8 }, shadows.card]}>
      {state.routes.map((route, index) => (
        <TabItem
          key={route.key}
          route={route}
          isFocused={state.index === index}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
    minHeight: 44,
  },
  pill: {
    position: 'absolute',
    top: -4,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  label: { fontSize: 9, fontWeight: fontWeight.semibold, marginTop: 1, overflow: 'hidden' },
});

export default BottomTabBar;
