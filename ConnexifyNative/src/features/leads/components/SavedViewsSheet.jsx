import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Toast from 'react-native-toast-message';
import AppText from '../../../design-system/components/AppText';
import Sheet from '../../../design-system/components/Sheet';
import Button from '../../../design-system/components/Button';
import TextField from '../../../design-system/components/TextField';
import IconButton from '../../../design-system/components/IconButton';
import { Bookmark, Trash2, Plus } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useSavedViews, useSavedViewMutations } from '../hooks';

/**
 * SavedViewsSheet — save/apply/delete a named filter+sort combination, parity
 * with the web's saved views. Server: /leads/saved-views (list/create/delete).
 *
 * A saved view stores { filters, sort } as JSON in the server's `filters`
 * column. Applying one calls onApply(view.filters) so the list screen sets
 * its filter+sort state.
 *
 * Usage in LeadsListScreen:
 *   const savedRef = useRef(null);
 *   // header button:
 *   <IconButton icon={Bookmark} onPress={() => savedRef.current?.open()} />
 *   <SavedViewsSheet ref={savedRef} currentConfig={{ filters, sort }}
 *      onApply={(cfg) => { setFilters(cfg.filters || {}); setSort(cfg.sort || sort); }} />
 */

const SavedViewsSheet = React.forwardRef(function SavedViewsSheet({ currentConfig, onApply }, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const views = useSavedViews();
  const { create, remove } = useSavedViewMutations();

  React.useImperativeHandle(ref, () => ({
    open: () => {
      setName('');
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const saveCurrent = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Name your view first' });
      return;
    }
    setSaving(true);
    try {
      // Server's SavedView.filters is a free-form JSON column — store the
      // whole { filters, sort } shape under it (there is no separate `config`
      // column on this server).
      await create.mutateAsync({ name: name.trim(), filters: currentConfig });
      setName('');
    } finally {
      setSaving(false);
    }
  };

  const apply = (view) => {
    onApply?.(view.filters || {});
    sheetRef.current?.dismiss();
    Toast.show({ type: 'success', text1: `Applied "${view.name}"` });
  };

  const list = views.data || [];

  return (
    <Sheet ref={sheetRef} title="Saved views">
      <View style={styles.saveRow}>
        <TextField
          placeholder="Name this view…"
          value={name}
          onChangeText={setName}
          style={styles.flex}
        />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={saveCurrent} disabled={saving} icon={Plus} />
      </View>

      <View style={styles.divider} />

      {list.length ? (
        list.map((v) => (
          <View key={v.id} style={styles.viewRow}>
            <Pressable style={styles.viewMain} onPress={() => apply(v)} accessibilityRole="button" accessibilityLabel={`Apply view ${v.name}`}>
              <Bookmark size={16} color={theme.colors.brand} />
              <AppText variant="body" weight="600">{v.name}</AppText>
            </Pressable>
            <IconButton
              icon={Trash2}
              accessibilityLabel={`Delete view ${v.name}`}
              onPress={() => remove.mutate(v.id)}
            />
          </View>
        ))
      ) : (
        <AppText variant="caption" color="muted" style={styles.empty}>
          No saved views yet. Set filters and a sort, then save this view.
        </AppText>
      )}
    </Sheet>
  );
});

export default SavedViewsSheet;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  saveRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 8 },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  viewMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingVertical: 8 },
  empty: { paddingVertical: 12 },
});
