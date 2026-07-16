import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import AppText from '../../../design-system/components/AppText';
import Chip from '../../../design-system/components/Chip';
import Sheet from '../../../design-system/components/Sheet';
import Button from '../../../design-system/components/Button';
import { useTheme } from '../../../design-system/ThemeProvider';
import { leadsApi } from '../api';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { showApiError } from '../../../utils/errorMessage';

/**
 * Tags on mobile (parity gap): shows current tags as chips + an "Edit tags"
 * sheet with all workspace tags from form-meta. Saves via the standard lead
 * update payload key `tags: string[]` (Joi: array of trimmed strings —
 * leadsController schema).
 *
 * Render in OverviewTab (LeadDetailTabs):
 *   <LeadTagPicker lead={lead} availableTags={meta.tags} />
 * where `meta` comes from useLeadFormMeta() (already used by LeadFormScreen).
 */

function tagValue(t) {
  // form-meta tags may be strings or {id,name} rows — normalize both.
  return typeof t === 'object' ? String(t.id ?? t.name) : String(t);
}
function tagLabel(t) {
  return typeof t === 'object' ? String(t.name ?? t.label ?? t.id) : String(t);
}

export default function LeadTagPicker({ lead, availableTags = [] }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => (Array.isArray(lead?.tags) ? lead.tags.map(tagValue) : []),
    [lead],
  );
  const [draft, setDraft] = useState(current);

  const toggle = (v) =>
    setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));

  const save = async () => {
    try {
      setBusy(true);
      await leadsApi.update(lead.id, { tags: draft });
      qc.invalidateQueries({ queryKey: keys.leads?.detail?.(ws, lead.id) ?? ['leads', ws, lead.id] });
      qc.invalidateQueries({ queryKey: keys.leads?.all?.(ws) ?? ['leads', ws] });
      Toast.show({ type: 'success', text1: 'Tags updated' });
      sheetRef.current?.dismiss();
    } catch (err) {
      showApiError(err, 'Could not update tags');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.rowHeader}>
        <AppText variant="label" color="muted">Tags</AppText>
        <Pressable
          onPress={() => {
            setDraft(current);
            requestAnimationFrame(() => sheetRef.current?.present());
          }}
          accessibilityRole="button"
          accessibilityLabel="Edit tags"
          hitSlop={8}
        >
          <AppText variant="label" style={{ color: theme.colors.brand }}>Edit</AppText>
        </Pressable>
      </View>

      <View style={styles.chips}>
        {current.length ? (
          (lead.tags || []).map((t) => <Chip key={tagValue(t)} label={tagLabel(t)} />)
        ) : (
          <AppText variant="caption" color="muted">No tags yet</AppText>
        )}
      </View>

      <Sheet ref={sheetRef} title="Edit tags">
        <View style={styles.chips}>
          {availableTags.map((t) => {
            const v = tagValue(t);
            const selected = draft.includes(v);
            return (
              <Chip
                key={v}
                label={tagLabel(t)}
                selected={selected}
                onPress={() => toggle(v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              />
            );
          })}
          {!availableTags.length ? (
            <AppText variant="caption" color="muted">
              No tags defined yet — create them on the web under Lead Configuration.
            </AppText>
          ) : null}
        </View>
        <Button title={busy ? 'Saving…' : 'Save tags'} onPress={save} disabled={busy} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingVertical: 8 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
