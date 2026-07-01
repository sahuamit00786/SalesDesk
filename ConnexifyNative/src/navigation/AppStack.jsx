import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabs from './BottomTabs';

import LeadDetailScreen       from '../screens/leads/LeadDetailScreen';
import AddLeadScreen          from '../screens/leads/AddLeadScreen';
import EditLeadScreen         from '../screens/leads/EditLeadScreen';
import AttendanceDetailScreen from '../screens/attendance/AttendanceDetailScreen';
import TeamMemberDetailScreen from '../screens/profile/TeamMemberDetailScreen';
import TeamListScreen         from '../screens/profile/TeamListScreen';
import EditProfileScreen      from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen   from '../screens/profile/ChangePasswordScreen';
import ProfileScreen          from '../screens/profile/ProfileScreen';
import CampaignsListScreen    from '../screens/campaigns/CampaignsListScreen';
import CampaignDetailScreen   from '../screens/campaigns/CampaignDetailScreen';
import CallSyncScreen         from '../screens/callsync/CallSyncScreen';
import DealDetailScreen       from '../screens/deals/DealDetailScreen';
import LeaveScreen            from '../screens/leave/LeaveScreen';
import NotificationsScreen    from '../screens/notifications/NotificationsScreen';
import CalendarScreen         from '../screens/calendar/CalendarScreen';

const Stack = createStackNavigator();

const slideFromRight = ({ current, layouts }) => ({
  cardStyle: {
    transform: [{
      translateX: current.progress.interpolate({
        inputRange:  [0, 1],
        outputRange: [layouts.screen.width, 0],
      }),
    }],
  },
});

const slideFromBottom = ({ current, layouts }) => ({
  cardStyle: {
    transform: [{
      translateY: current.progress.interpolate({
        inputRange:  [0, 1],
        outputRange: [layouts.screen.height, 0],
      }),
    }],
  },
});

const AppStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false, cardStyleInterpolator: slideFromRight }}
  >
    <Stack.Screen name="Tabs" component={BottomTabs} />

    {/* Leads */}
    <Stack.Screen name="LeadDetail"  component={LeadDetailScreen} />
    <Stack.Screen name="AddLead"     component={AddLeadScreen}   options={{ cardStyleInterpolator: slideFromBottom }} />
    <Stack.Screen name="EditLead"    component={EditLeadScreen}  options={{ cardStyleInterpolator: slideFromBottom }} />

    {/* Deals */}
    <Stack.Screen name="DealDetail"  component={DealDetailScreen} />

    {/* HR */}
    <Stack.Screen name="Leave"            component={LeaveScreen} />
    <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />

    {/* Notifications + Calendar */}
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Calendar"      component={CalendarScreen} />

    {/* Call History */}
    <Stack.Screen name="CallSync" component={CallSyncScreen} />

    {/* Campaigns */}
    <Stack.Screen name="Campaigns"      component={CampaignsListScreen} />
    <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />

    {/* Profile */}
    <Stack.Screen name="Profile"          component={ProfileScreen} />
    <Stack.Screen name="TeamMemberDetail" component={TeamMemberDetailScreen} />
    <Stack.Screen name="TeamList"         component={TeamListScreen} />
    <Stack.Screen name="EditProfile"      component={EditProfileScreen}      options={{ cardStyleInterpolator: slideFromBottom }} />
    <Stack.Screen name="ChangePassword"   component={ChangePasswordScreen}   options={{ cardStyleInterpolator: slideFromBottom }} />
  </Stack.Navigator>
);

export default AppStack;
