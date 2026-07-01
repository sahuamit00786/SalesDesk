import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { userService } from '../../services/userService';
import { activityService } from '../../services/activityService';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import Avatar from '../../components/misc/Avatar';
import StatCard from '../../components/cards/StatCard';
import ActivityCard from '../../components/cards/ActivityCard';

const TeamMemberDetailScreen = ({ route, navigation }) => {
  const { id, name } = route.params;
  const { theme }  = useTheme();
  const [member, setMember] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    userService.getMember(id).then(setMember).catch(() => {});
    activityService.getActivities({ assignedTo: id, limit: 20 })
      .then((d) => setActivities(d?.data?.rows || d?.rows || []))
      .catch(() => {});
  }, [id]);

  const s = styles(theme);

  return (
    <View style={s.root}>
      <AppHeader title={name || 'Member'} navigation={navigation} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <Avatar name={member?.name || name} size={64} uri={member?.avatar} />
          <View style={s.profileBody}>
            <Text style={s.name}>{member?.name || name}</Text>
            <Text style={s.role}>{member?.role || 'Member'}</Text>
            <Text style={s.email}>{member?.email}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
          <StatCard icon="account-group"   label="Total Leads"        value={member?.leadsCount ?? 0}        color={theme.colors.primary} style={s.stat} />
          <StatCard icon="check-circle"    label="Converted"          value={member?.convertedCount ?? 0}    color={theme.colors.success} style={s.stat} />
          <StatCard icon="lightning-bolt"  label="Activities (month)" value={member?.activitiesCount ?? 0}   color={theme.colors.accent}  style={s.stat} />
        </ScrollView>

        {activities.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Recent Activities</Text>
            {activities.map((a) => <ActivityCard key={a.id} activity={a} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: theme.colors.background },
  content:     { padding: spacing.base, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.base, marginBottom: spacing.base, ...shadows.card,
  },
  profileBody: { flex: 1 },
  name:        { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  role:        { fontSize: fontSize.sm, color: theme.colors.textSecondary },
  email:       { fontSize: fontSize.sm, color: theme.colors.textMuted },
  statsRow:    { gap: spacing.sm, marginBottom: spacing.base },
  stat:        { width: 140 },
  sectionTitle:{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.sm },
});

export default TeamMemberDetailScreen;
