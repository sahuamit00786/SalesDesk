import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import BottomTabs from './BottomTabs';
import LeadDetailScreen       from '../screens/leads/LeadDetailScreen';
import AddLeadScreen          from '../screens/leads/AddLeadScreen';
import EditLeadScreen         from '../screens/leads/EditLeadScreen';
import AttendanceDetailScreen from '../screens/attendance/AttendanceDetailScreen';
import TeamMemberDetailScreen from '../screens/profile/TeamMemberDetailScreen';
import TeamListScreen         from '../screens/profile/TeamListScreen';
import EditProfileScreen      from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen   from '../screens/profile/ChangePasswordScreen';
import CampaignDetailScreen   from '../screens/campaigns/CampaignDetailScreen';
import CallSyncScreen         from '../screens/callsync/CallSyncScreen';

const Stack = createStackNavigator();

const AppStack = () => {
  const { theme } = useTheme();

  const screenOptions = {
    headerShown: false,
    cardStyleInterpolator: ({ current, layouts }) => ({
      cardStyle: {
        transform: [{
          translateX: current.progress.interpolate({
            inputRange:  [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        }],
      },
    }),
  };

  const modalOptions = {
    headerShown: false,
    presentation: 'modal',
    cardStyleInterpolator: ({ current, layouts }) => ({
      cardStyle: {
        transform: [{
          translateY: current.progress.interpolate({
            inputRange:  [0, 1],
            outputRange: [layouts.screen.height, 0],
          }),
        }],
      },
    }),
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Tabs" component={BottomTabs} />
      <Stack.Screen name="LeadDetail"  component={LeadDetailScreen} />
      <Stack.Screen name="AddLead"     component={AddLeadScreen}    options={modalOptions} />
      <Stack.Screen name="EditLead"    component={EditLeadScreen}   options={modalOptions} />
      <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
      <Stack.Screen name="TeamMemberDetail" component={TeamMemberDetailScreen} />
      <Stack.Screen name="TeamList"        component={TeamListScreen} />
      <Stack.Screen name="EditProfile"      component={EditProfileScreen}    options={modalOptions} />
      <Stack.Screen name="ChangePassword"   component={ChangePasswordScreen} options={modalOptions} />
      <Stack.Screen name="CampaignDetail"   component={CampaignDetailScreen} />
      <Stack.Screen name="CallSync"         component={CallSyncScreen} />
    </Stack.Navigator>
  );
};

export default AppStack;
