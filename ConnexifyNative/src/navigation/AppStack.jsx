import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import { ROUTES } from './routes';

import LeadDetailScreen from '../features/leads/screens/LeadDetailScreen';
import LeadFormScreen from '../features/leads/screens/LeadFormScreen';
import TasksListScreen from '../features/tasks/screens/TasksListScreen';
import ActivitiesFeedScreen from '../features/activities/screens/ActivitiesFeedScreen';
import CallsListScreen from '../features/calls/screens/CallsListScreen';
import MeetingsListScreen from '../features/meetings/screens/MeetingsListScreen';
import MeetingDetailScreen from '../features/meetings/screens/MeetingDetailScreen';
import MeetingFormScreen from '../features/meetings/screens/MeetingFormScreen';
import CalendarScreen from '../features/calendar/screens/CalendarScreen';
import DocumentsBrowserScreen from '../features/documents/screens/DocumentsBrowserScreen';
import TeamListScreen from '../features/team/screens/TeamListScreen';
import TeamMemberDetailScreen from '../features/team/screens/TeamMemberDetailScreen';
import InvitationsScreen from '../features/team/screens/InvitationsScreen';
import RolesScreen from '../features/team/screens/RolesScreen';
import ProfileScreen from '../features/settings/screens/ProfileScreen';
import EditProfileScreen from '../features/settings/screens/EditProfileScreen';
import AppearanceScreen from '../features/settings/screens/AppearanceScreen';
import SecurityScreen from '../features/settings/screens/SecurityScreen';
import AttendanceScreen from '../features/attendance/screens/AttendanceScreen';
import LeaveScreen from '../features/leave/screens/LeaveScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import DealsListScreen from '../features/deals/screens/DealsListScreen';
import DealDetailScreen from '../features/deals/screens/DealDetailScreen';
import { SalesDocsListScreen, SalesDocDetailScreen } from '../features/sales/screens/SalesDocsScreen';
import GlobalSearchScreen from '../features/search/screens/GlobalSearchScreen';
import PipelineBoardScreen from '../features/pipeline/screens/PipelineBoardScreen';
import { CampaignsListScreen, CampaignDetailScreen } from '../features/campaigns/screens/CampaignsScreen';
import { ReportsHubScreen, ReportDetailScreen } from '../features/reports/screens/ReportsScreen';
import CopilotScreen from '../features/copilot/screens/CopilotScreen';
import NotificationSettingsScreen from '../features/settings/screens/NotificationSettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name={ROUTES.TABS} component={MainTabs} />

      {/* Leads */}
      <Stack.Screen name={ROUTES.LEAD_DETAIL} component={LeadDetailScreen} />
      <Stack.Screen name={ROUTES.ADD_LEAD} component={LeadFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name={ROUTES.EDIT_LEAD} component={LeadFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name={ROUTES.OPPORTUNITY_DETAIL} component={LeadDetailScreen} />

      {/* Engage */}
      <Stack.Screen name={ROUTES.TASKS} component={TasksListScreen} />
      <Stack.Screen name={ROUTES.CALLS} component={CallsListScreen} />
      <Stack.Screen name={ROUTES.MEETINGS} component={MeetingsListScreen} />
      <Stack.Screen name={ROUTES.MEETING_DETAIL} component={MeetingDetailScreen} />
      <Stack.Screen name={ROUTES.MEETING_FORM} component={MeetingFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name={ROUTES.CALENDAR} component={CalendarScreen} />
      <Stack.Screen name={ROUTES.ACTIVITY_LEGACY} component={ActivitiesFeedScreen} />

      {/* Workspace */}
      <Stack.Screen name={ROUTES.DOCUMENTS} component={DocumentsBrowserScreen} />
      <Stack.Screen name={ROUTES.ATTENDANCE} component={AttendanceScreen} />
      <Stack.Screen name={ROUTES.LEAVE} component={LeaveScreen} />
      <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />

      {/* Admin */}
      <Stack.Screen name={ROUTES.TEAM_LIST} component={TeamListScreen} />
      <Stack.Screen name={ROUTES.TEAM_MEMBER_DETAIL} component={TeamMemberDetailScreen} />
      <Stack.Screen name={ROUTES.INVITATIONS} component={InvitationsScreen} />
      <Stack.Screen name={ROUTES.ROLES} component={RolesScreen} />

      {/* Account */}
      <Stack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
      <Stack.Screen name={ROUTES.EDIT_PROFILE} component={EditProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name={ROUTES.CHANGE_PASSWORD} component={SecurityScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name={ROUTES.SETTINGS_APPEARANCE} component={AppearanceScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name={ROUTES.SETTINGS_SECURITY} component={SecurityScreen} options={{ animation: 'slide_from_bottom' }} />

      {/* Modules */}
      <Stack.Screen name={ROUTES.DEALS} component={DealsListScreen} />
      <Stack.Screen name={ROUTES.DEAL_DETAIL} component={DealDetailScreen} />
      <Stack.Screen name={ROUTES.SALES_DOCS} component={SalesDocsListScreen} />
      <Stack.Screen name="SalesDocDetail" component={SalesDocDetailScreen} />
      <Stack.Screen name={ROUTES.SEARCH} component={GlobalSearchScreen} />
      <Stack.Screen name={ROUTES.PIPELINE} component={PipelineBoardScreen} />
      <Stack.Screen name={ROUTES.CAMPAIGNS} component={CampaignsListScreen} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <Stack.Screen name={ROUTES.REPORTS} component={ReportsHubScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name={ROUTES.COPILOT} component={CopilotScreen} />
      <Stack.Screen name={ROUTES.NOTIFICATION_SETTINGS} component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}
