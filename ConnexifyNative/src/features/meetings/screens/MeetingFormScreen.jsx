import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import TextField from '../../../design-system/components/TextField';
import SelectField from '../../../design-system/components/SelectField';
import DateField from '../../../design-system/components/DateField';
import SearchBar from '../../../design-system/components/SearchBar';
import Avatar from '../../../design-system/components/Avatar';
import Button from '../../../design-system/components/Button';
import { Skeleton } from '../../../design-system/components/Skeleton';
import { X } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useMeetingMutations } from '../hooks';
import { MEETING_TYPES } from '../api';
import { leadsApi } from '../../leads/api';

export default function MeetingFormScreen({ navigation }) {
  const theme = useTheme();
  const { create } = useMeetingMutations();

  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('follow_up');
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [agenda, setAgenda] = useState('');
  const [lead, setLead] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const search = async (text) => {
    if (!text.trim()) return setResults([]);
    try {
      setSearching(true);
      const { data } = await leadsApi.list({ search: text.trim(), limit: 6, page: 1 });
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    const next = {};
    if (!title.trim()) next.title = 'Title is required';
    if (!start) next.start = 'Start time is required';
    if (!end) next.end = 'End time is required';
    if (start && end && end.getTime() <= start.getTime()) next.end = 'End must be after start';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setBusy(true);
      await create.mutateAsync({
        title: title.trim(),
        meetingType,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        agenda: agenda.trim() || undefined,
        leadId: lead?.id || undefined,
      });
      Toast.show({ type: 'success', text1: 'Meeting scheduled' });
      navigation.goBack();
    } catch {
      // hook shows the toast
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold>
      <AppHeader title="New meeting" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card style={styles.section}>
            <TextField label="Title *" value={title} onChangeText={setTitle} placeholder="Product demo with Acme" error={errors.title} style={styles.field} />
            <SelectField label="Type" value={meetingType} onChange={setMeetingType} options={MEETING_TYPES} style={styles.field} />
            <View style={styles.row}>
              <DateField label="Starts *" mode="datetime" value={start} onChange={setStart} error={errors.start} style={styles.rowItem} />
              <DateField label="Ends *" mode="datetime" value={end} onChange={setEnd} error={errors.end} style={styles.rowItem} />
            </View>
            <TextField label="Agenda" value={agenda} onChangeText={setAgenda} multiline placeholder="Topics to cover" style={styles.fieldLast} />
          </Card>

          <Card style={styles.section}>
            <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
              LINKED LEAD (OPTIONAL)
            </AppText>
            {lead ? (
              <View style={[styles.leadPill, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
                <Avatar name={lead.contactName || lead.title} size={30} />
                <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                  {lead.contactName || lead.title}
                </AppText>
                <Pressable onPress={() => setLead(null)} hitSlop={8} accessibilityLabel="Remove lead">
                  <X size={16} color={theme.colors.inkMuted} strokeWidth={2.4} />
                </Pressable>
              </View>
            ) : (
              <>
                <SearchBar value={query} onChangeText={setQuery} onDebounced={search} placeholder="Search leads…" />
                <View style={styles.results}>
                  {searching ? (
                    <Skeleton height={44} />
                  ) : (
                    results.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setLead(item)}
                        accessibilityRole="button"
                        style={[styles.resultRow, { borderRadius: theme.radius.md }]}
                        android_ripple={{ color: theme.brandFaint }}
                      >
                        <Avatar name={item.contactName || item.title} size={30} />
                        <AppText variant="body" style={styles.flex} numberOfLines={1}>
                          {item.contactName || item.title}
                        </AppText>
                      </Pressable>
                    ))
                  )}
                </View>
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.submitBar, { backgroundColor: theme.colors.page, borderTopColor: theme.colors.divider }]}>
        <Button title="Schedule meeting" size="lg" fullWidth loading={busy} onPress={submit} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  section: { marginBottom: 14 },
  blockTitle: { letterSpacing: 0.8, marginBottom: 10 },
  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 2 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1, marginBottom: 14 },
  leadPill: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  results: { marginTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8 },
  submitBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
});
