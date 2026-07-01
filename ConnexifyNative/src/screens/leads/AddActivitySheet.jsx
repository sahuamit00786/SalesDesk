import React, { forwardRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useActivityStore } from '../../store/activityStore';
import { leadService } from '../../services/leadService';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import SelectInput from '../../components/inputs/SelectInput';
import DateInput from '../../components/inputs/DateInput';
import AppInput from '../../components/inputs/AppInput';
import TextAreaInput from '../../components/inputs/TextAreaInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import SearchInput from '../../components/inputs/SearchInput';

const schema = yup.object({
  type:         yup.string().required('Activity type is required'),
  activityDate: yup.string().required('Date is required'),
  description:  yup.string().optional(),
  duration:     yup.number().optional().nullable()
    .transform((v, o) => (o === '' ? null : v)),
  nextAction:       yup.string().optional(),
  nextFollowUpDate: yup.string().optional().nullable(),
});

const TYPE_OPTIONS = [
  'Call','Meeting','Email','WhatsApp','Site Visit','Demo','Follow-up','Note',
].map((v) => ({ value: v, label: v }));

const LeadSearchSheet = ({ visible, onSelect, onClose, theme }) => {
  const [query, setQuery]   = useState('');
  const [leads, setLeads]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    searchLeads('');
  }, [visible]);

  const searchLeads = async (q) => {
    setLoading(true);
    try {
      const data = await leadService.getLeads({ search: q, limit: 20 });
      setLeads(data?.data?.rows || data?.rows || []);
    } catch (_) {}
    setLoading(false);
  };

  const s = leadSearchS(theme);

  if (!visible) return null;

  return (
    <View style={s.overlay}>
      <View style={s.box}>
        <View style={s.header}>
          <Text style={s.title}>Select Lead</Text>
          <TouchableOpacity onPress={onClose}><Icon name="close" size={22} color={theme.colors.textPrimary} /></TouchableOpacity>
        </View>
        <SearchInput value={query} onChangeText={(v) => { setQuery(v); searchLeads(v); }} placeholder="Search leads..." style={s.search} />
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.leadRow} onPress={() => onSelect(item)}>
              <Text style={s.leadName}>{item.name}</Text>
              <Text style={s.leadPhone}>{item.phone}</Text>
            </TouchableOpacity>
          )}
          style={s.list}
        />
      </View>
    </View>
  );
};

const leadSearchS = (theme) => StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay, zIndex: 100, justifyContent: 'flex-end' },
  box:     { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.base, maxHeight: '70%' },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  title:   { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  search:  { marginBottom: spacing.sm },
  list:    { maxHeight: 300 },
  leadRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  leadName:  { fontSize: fontSize.base, color: theme.colors.textPrimary, fontWeight: fontWeight.medium },
  leadPhone: { fontSize: fontSize.sm, color: theme.colors.textSecondary },
});

const AddActivitySheet = forwardRef(({ leadId, onSaved }, ref) => {
  const { theme } = useTheme();
  const { createActivity } = useActivityStore();
  const [saving, setSaving]         = useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [selectedLead, setSelectedLead]     = useState(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      type: '', activityDate: new Date().toISOString(),
      description: '', duration: '', nextAction: '', nextFollowUpDate: null,
    },
  });

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);

  const onSubmit = async (data) => {
    const effectiveLeadId = leadId || selectedLead?.id;
    if (!effectiveLeadId) {
      Toast.show({ type: 'error', text1: 'Please select a lead' });
      return;
    }
    setSaving(true);
    try {
      await createActivity({ ...data, leadId: effectiveLeadId });
      Toast.show({ type: 'success', text1: 'Activity logged' });
      reset();
      setSelectedLead(null);
      ref?.current?.close();
      onSaved?.();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to log activity', text2: err.message });
    }
    setSaving(false);
  };

  const s = styles(theme);

  return (
    <>
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={['80%', '95%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        keyboardBehavior="extend"
      >
        <BottomSheetScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Log Activity</Text>

          {/* Lead selector — only when not opened from a specific lead */}
          {!leadId && (
            <View style={s.mb}>
              <Text style={s.fieldLabel}>Lead *</Text>
              <TouchableOpacity
                style={[s.leadTrigger, !selectedLead && s.leadTriggerEmpty]}
                onPress={() => setLeadPickerOpen(true)}
                accessibilityLabel="Select lead"
              >
                <Icon name="account-outline" size={18} color={selectedLead ? theme.colors.textPrimary : theme.colors.textMuted} />
                <Text style={[s.leadTriggerText, !selectedLead && { color: theme.colors.textMuted }]}>
                  {selectedLead ? `${selectedLead.name} · ${selectedLead.phone || ''}` : 'Select a lead…'}
                </Text>
                <Icon name="chevron-down" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <Controller control={control} name="type"
            render={({ field: { onChange, value } }) => (
              <SelectInput label="Activity Type *" value={value} onSelect={onChange} options={TYPE_OPTIONS} error={errors.type?.message} />
            )}
          />

          <Controller control={control} name="activityDate"
            render={({ field: { onChange, value } }) => (
              <DateInput label="Date & Time *" value={value} onChange={onChange} mode="datetime" error={errors.activityDate?.message} />
            )}
          />

          <Controller control={control} name="duration"
            render={({ field: { onChange, value } }) => (
              <AppInput label="Duration (minutes)" value={value} onChangeText={onChange} placeholder="e.g. 30" keyboardType="numeric" iconLeft="clock-outline" />
            )}
          />

          <Controller control={control} name="description"
            render={({ field: { onChange, value } }) => (
              <TextAreaInput label="Notes / Description" value={value} onChangeText={onChange} placeholder="What happened?" />
            )}
          />

          {/* Next action section */}
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Next Steps (optional)</Text>

          <Controller control={control} name="nextAction"
            render={({ field: { onChange, value } }) => (
              <AppInput label="Next Action" value={value} onChangeText={onChange} placeholder="e.g. Send proposal, Schedule demo" iconLeft="arrow-right-circle-outline" />
            )}
          />

          <Controller control={control} name="nextFollowUpDate"
            render={({ field: { onChange, value } }) => (
              <DateInput label="Next Follow-up Date" value={value} onChange={onChange} placeholder="Select date" />
            )}
          />

          <PrimaryButton title="Save Activity" onPress={handleSubmit(onSubmit)} loading={saving} style={s.btn} />
        </BottomSheetScrollView>
      </BottomSheet>

      <LeadSearchSheet
        visible={leadPickerOpen}
        onSelect={(lead) => { setSelectedLead(lead); setLeadPickerOpen(false); }}
        onClose={() => setLeadPickerOpen(false)}
        theme={theme}
      />
    </>
  );
});

const styles = (theme) => StyleSheet.create({
  content:      { padding: spacing.base, paddingBottom: 40 },
  title:        { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.base },
  mb:           { marginBottom: spacing.base },
  fieldLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: theme.colors.textSecondary, marginBottom: 6 },
  leadTrigger:  {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: borderRadius.md, height: 48, paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  leadTriggerEmpty: { borderColor: theme.colors.border },
  leadTriggerText:  { flex: 1, fontSize: fontSize.base, color: theme.colors.textPrimary },
  divider:   { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: spacing.base },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  btn:       { marginTop: spacing.sm },
});

export default AddActivitySheet;
