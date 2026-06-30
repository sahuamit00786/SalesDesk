import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { userService } from '../../services/userService';
import { spacing } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import TeamMemberCard from '../../components/cards/TeamMemberCard';
import SkeletonList from '../../components/feedback/SkeletonList';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';

const TeamListScreen = ({ navigation }) => {
  const { theme }  = useTheme();
  const insets     = useSafeAreaInsets();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    userService.getTeam()
      .then((data) => { setMembers(data?.data?.rows || data?.rows || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const s = styles(theme, insets);

  return (
    <View style={s.root}>
      <AppHeader title="Team Members" navigation={navigation} />
      {loading ? (
        <View style={s.content}><SkeletonList count={6} /></View>
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlashList
          data={members}
          renderItem={({ item }) => (
            <TeamMemberCard
              member={item}
              onPress={() => navigation.navigate('TeamMemberDetail', { id: item.id, name: item.name })}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={88}
          contentContainerStyle={s.content}
          ListEmptyComponent={<EmptyState icon="account-group-outline" title="No team members" />}
        />
      )}
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.base, paddingBottom: 40 },
});

export default TeamListScreen;
