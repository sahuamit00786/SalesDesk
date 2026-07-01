import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabBar from '../components/navigation/BottomTabBar';
import DrawerMenu from '../components/navigation/DrawerMenu';

import DashboardScreen           from '../screens/dashboard/DashboardScreen';
import LeadsListScreen           from '../screens/leads/LeadsListScreen';
import DealsScreen               from '../screens/deals/DealsScreen';
import ActivityListScreen        from '../screens/activity/ActivityListScreen';
import AttendanceDashboardScreen from '../screens/attendance/AttendanceDashboardScreen';

const Tab = createBottomTabNavigator();

const BottomTabs = () => (
  <View style={{ flex: 1 }}>
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"       component={DashboardScreen} />
      <Tab.Screen name="Leads"      component={LeadsListScreen} />
      <Tab.Screen name="Deals"      component={DealsScreen} />
      <Tab.Screen name="Activity"   component={ActivityListScreen} />
      <Tab.Screen name="Attendance" component={AttendanceDashboardScreen} />
    </Tab.Navigator>
    <DrawerMenu />
  </View>
);

export default BottomTabs;
