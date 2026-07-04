import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { trigger } from 'react-native-haptic-feedback';
import AppText from '../design-system/components/AppText';
import { LayoutGrid, Users, Briefcase, CheckSquare, PhoneCall, Menu } from '../design-system/icons';
import { useTheme } from '../design-system/ThemeProvider';
import { useCan } from '../hooks/permissions';
import { ROUTES, ROUTE_PERMISSIONS } from './routes';

import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import LeadsListScreen from '../features/leads/screens/LeadsListScreen';
import OpportunitiesListScreen from '../features/opportunities/screens/OpportunitiesListScreen';
import ActivitiesFeedScreen from '../features/activities/screens/ActivitiesFeedScreen';
import CallLogSyncScreen from '../features/callSync/screens/CallLogSyncScreen';
import MoreHubScreen from '../features/more/MoreHubScreen';

const Tab = createBottomTabNavigator();

const TAB_META = {
  [ROUTES.TAB_DASHBOARD]: { label: 'Dashboard', icon: LayoutGrid },
  [ROUTES.TAB_LEADS]: { label: 'Leads', icon: Users },
  [ROUTES.TAB_OPPORTUNITIES]: { label: 'Opportunities', icon: Briefcase },
  [ROUTES.TAB_ACTIVITIES]: { label: 'Activities', icon: CheckSquare },
  [ROUTES.TAB_CALL_LOGS]: { label: 'Call Logs', icon: PhoneCall },
  [ROUTES.TAB_MORE]: { label: 'More', icon: Menu },
};

function TabItem({ route, focused, onPress }) {
  const theme = useTheme();
  const meta = TAB_META[route.name] || { label: route.name, icon: LayoutGrid };
  const Icon = meta.icon;
  const scale = useSharedValue(1);
  const pill = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    pill.value = withTiming(focused ? 1 : 0, { duration: theme.motion.durations.fast });
  }, [focused]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: `rgba(0,0,0,0)`,
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pill.value,
    transform: [{ scale: 0.7 + pill.value * 0.3 }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      onPress={() => {
        trigger('selection', { enableVibrateFallback: false });
        scale.value = withSpring(0.88, theme.motion.springs.press, () => {
          scale.value = withSpring(1, theme.motion.springs.press);
        });
        onPress();
      }}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <Animated.View
          style={[
            styles.pill,
            { backgroundColor: theme.brandSoft, borderRadius: theme.radius.full },
            pillStyle,
          ]}
        />
        <Icon size={22} color={focused ? theme.brand : theme.colors.inkFaint} strokeWidth={focused ? 2.4 : 2} />
      </Animated.View>
      <AppText variant="micro" color={focused ? theme.brand : theme.colors.inkFaint} numberOfLines={1}>
        {meta.label}
      </AppText>
    </Pressable>
  );
}

function PremiumTabBar({ state, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.divider,
        },
      ]}
    >
      {state.routes.map((route, index) => (
        <TabItem
          key={route.key}
          route={route}
          focused={state.index === index}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (state.index !== index && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }}
        />
      ))}
    </View>
  );
}

export default function MainTabs() {
  const canLeads = useCan(ROUTE_PERMISSIONS[ROUTES.TAB_LEADS]);
  const canOpps = useCan(ROUTE_PERMISSIONS[ROUTES.TAB_OPPORTUNITIES]);
  const canActivities = useCan(ROUTE_PERMISSIONS[ROUTES.TAB_ACTIVITIES]);
  const canCallLogs = useCan(ROUTE_PERMISSIONS[ROUTES.TAB_CALL_LOGS]);

  return (
    <View style={styles.root}>
      <Tab.Navigator tabBar={(props) => <PremiumTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name={ROUTES.TAB_DASHBOARD} component={DashboardScreen} />
        {canLeads ? <Tab.Screen name={ROUTES.TAB_LEADS} component={LeadsListScreen} /> : null}
        {canOpps ? <Tab.Screen name={ROUTES.TAB_OPPORTUNITIES} component={OpportunitiesListScreen} /> : null}
        {canActivities ? <Tab.Screen name={ROUTES.TAB_ACTIVITIES} component={ActivitiesFeedScreen} /> : null}
        {canCallLogs ? <Tab.Screen name={ROUTES.TAB_CALL_LOGS} component={CallLogSyncScreen} /> : null}
        <Tab.Screen name={ROUTES.TAB_MORE} component={MoreHubScreen} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 52, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 52, height: 30 },
});
