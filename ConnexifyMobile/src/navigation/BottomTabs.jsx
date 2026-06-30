import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabBar from '../components/navigation/BottomTabBar';

import DashboardScreen           from '../screens/dashboard/DashboardScreen';
import LeadsListScreen           from '../screens/leads/LeadsListScreen';
import ActivityListScreen        from '../screens/activity/ActivityListScreen';
import CampaignsListScreen       from '../screens/campaigns/CampaignsListScreen';
import AttendanceDashboardScreen from '../screens/attendance/AttendanceDashboardScreen';
import ProfileScreen             from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const BottomTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <BottomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home"       component={DashboardScreen} />
    <Tab.Screen name="Leads"      component={LeadsListScreen} />
    <Tab.Screen name="Activity"   component={ActivityListScreen} />
    <Tab.Screen name="Campaigns"  component={CampaignsListScreen} />
    <Tab.Screen name="Attendance" component={AttendanceDashboardScreen} />
    <Tab.Screen name="Profile"    component={ProfileScreen} />
  </Tab.Navigator>
);

export default BottomTabs;
