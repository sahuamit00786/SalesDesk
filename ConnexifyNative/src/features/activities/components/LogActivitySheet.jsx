import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Sheet from '../../../design-system/components/Sheet';
import AppText from '../../../design-system/components/AppText';
import Avatar from '../../../design-system/components/Avatar';
import SearchBar from '../../../design-system/components/SearchBar';
import SelectField from '../../../design-system/components/SelectField';
import TextField from '../../../design-system/components/TextField';
import Button from '../../../design-system/components/Button';
import { Skeleton } from '../../../design-system/components/Skeleton';
import { Phone, Mail, Video, StickyNote, CheckSquare, X } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { leadsApi } from '../../leads/api';

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'task', label: 'Task', icon: CheckSquare },
];

/** Global "log activity" — pick a lead (search), pick type, write body. */
const LogActivitySheet = forwardRef(function LogActivitySheet({ onLogged }, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [lead, setLead] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [type, setType] = useState('call');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (presetLead) => {
      setLead(presetLead || null);
      setQuery('');
      setResults([]);
      setType('call');
      setBody('');
      setBusy(false);
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const search = async (text) => {
    if (!text.trim()) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      const { data } = await leadsApi.list({ search: text.trim(), limit: 8, page: 1 });
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!lead || !body.trim()) return;
    try {
      setBusy(true);
      await leadsApi.addActivity(lead.id, { type, body: body.trim() });
      Toast.show({ type: 'success', text1: 'Activity logged' });
      sheetRef.current?.dismiss();
      onLogged?.();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not log activity', text2: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheetRef} title="Log activity" scrollable snapPoints={['75%']}>
      {!lead ? (
        <>
          <AppText variant="label" color="inkMuted" style={styles.label}>
            Lead
          </AppText>
          <SearchBar value={query} onChangeText={setQuery} onDebounced={search} placeholder="Search leads…" />
          <View style={styles.results}>
            {searching ? (
              <>
                <Skeleton height={48} />
                <Skeleton height={48} style={styles.gap} />
              </>
            ) : (
              results.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => setLead(item)}
                  style={[styles.resultRow, { borderRadius: theme.radius.md }]}
                  android_ripple={{ color: theme.brandFaint }}
                >
                  <Avatar name={item.contactName || item.title} size={34} />
                  <View style={styles.resultTexts}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {item.contactName || item.title}
                    </AppText>
                    <AppText variant="caption" color="inkFaint" numberOfLines={1}>
                      {item.company || item.email || item.phone || '—'}
                    </AppText>
                  </View>
                </Pressable>
              ))
            )}
            {!searching && query.trim() && results.length === 0 ? (
              <AppText variant="caption" color="inkFaint" style={styles.noResults}>
                No leads found for "{query}"
              </AppText>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <View style={[styles.leadPill, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
            <Avatar name={lead.contactName || lead.title} size={30} />
            <AppText variant="bodyStrong" style={styles.leadName} numberOfLines={1}>
              {lead.contactName || lead.title}
            </AppText>
            <Pressable onPress={() => setLead(null)} hitSlop={8} accessibilityLabel="Change lead">
              <X size={16} color={theme.colors.inkMuted} strokeWidth={2.4} />
            </Pressable>
          </View>
          <SelectField label="Type" value={type} onChange={setType} options={ACTIVITY_TYPES} style={styles.field} />
          <TextField
            label="Details"
            value={body}
            onChangeText={setBody}
            placeholder="What happened?"
            multiline
            style={styles.field}
          />
          <Button title="Log activity" fullWidth loading={busy} disabled={!body.trim()} onPress={submit} />
        </>
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  results: { marginTop: 10 },
  gap: { marginTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10 },
  resultTexts: { flex: 1 },
  noResults: { textAlign: 'center', paddingVertical: 16 },
  leadPill: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 14 },
  leadName: { flex: 1 },
  field: { marginBottom: 14 },
});

export default LogActivitySheet;
