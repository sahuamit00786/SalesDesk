import React, { forwardRef, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import SearchInput from '../../components/inputs/SearchInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import GhostButton from '../../components/buttons/GhostButton';
import { leadService } from '../../services/leadService';
import { useCampaignStore } from '../../store/campaignStore';

const AddLeadToCampaignSheet = forwardRef(({ campaignId, existingLeadIds = [], onSaved }, ref) => {
  const { theme } = useTheme();
  const { addLeadToCampaign } = useCampaignStore();
  const [search, setSearch]     = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const snapPoints = ['80%'];

  const doSearch = useCallback(async (text) => {
    setSearch(text);
    if (!text.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await leadService.getLeads({ search: text, limit: 30 });
      const rows = data?.data?.rows || data?.rows || [];
      setResults(rows.filter((l) => !existingLeadIds.includes(l.id)));
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [existingLeadIds]);

  const toggle = (id) => setSelected((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );

  const handleAdd = async () => {
    if (!selected.length) return;
    setSubmitting(true);
    try {
      await addLeadToCampaign(campaignId, selected);
      Toast.show({ type: 'success', text1: `${selected.length} lead(s) added` });
      setSelected([]);
      setSearch('');
      setResults([]);
      onSaved?.();
      ref?.current?.close();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to add leads' });
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setSelected([]);
    setSearch('');
    setResults([]);
    ref?.current?.close();
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: theme.colors.borderLight }]}
        onPress={() => toggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, { borderColor: isSelected ? theme.colors.primary : theme.colors.border, backgroundColor: isSelected ? theme.colors.primary : 'transparent' }]}>
          {isSelected && <Icon name="check" size={12} color="#fff" />}
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>
            {item.phone || item.email || item.stage || ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Add Leads to Campaign</Text>
        <SearchInput value={search} onChangeText={doSearch} placeholder="Search by name, phone..." style={styles.search} />

        {searching && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 12 }} />}

        {!searching && results.length === 0 && search.length > 0 && (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No leads found</Text>
        )}

        {!searching && results.length === 0 && !search && (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Search to find leads</Text>
        )}

        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
        />

        {selected.length > 0 && (
          <Text style={[styles.selCount, { color: theme.colors.primary }]}>{selected.length} lead(s) selected</Text>
        )}

        <View style={styles.actions}>
          <GhostButton title="Cancel" onPress={close} style={styles.cancelBtn} />
          <PrimaryButton title={`Add ${selected.length || ''} Lead${selected.length !== 1 ? 's' : ''}`} onPress={handleAdd} loading={submitting} disabled={!selected.length} style={styles.submitBtn} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.base },
  title:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  search:    { marginBottom: spacing.sm },
  list:      { flex: 1 },
  item:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  checkbox:  { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemBody:  { flex: 1 },
  itemName:  { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  itemSub:   { fontSize: fontSize.sm, marginTop: 2 },
  emptyText: { textAlign: 'center', marginVertical: 24, fontSize: fontSize.sm },
  selCount:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: 8 },
  actions:   { flexDirection: 'row', gap: spacing.sm, paddingBottom: 32, paddingTop: 8 },
  cancelBtn: { flex: 1 },
  submitBtn: { flex: 2 },
});

AddLeadToCampaignSheet.displayName = 'AddLeadToCampaignSheet';
export default AddLeadToCampaignSheet;
