import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useLeadStore } from '../../store/leadStore';
import { spacing } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import KeyboardAware from '../../components/misc/KeyboardAware';
import AppInput from '../../components/inputs/AppInput';
import SelectInput from '../../components/inputs/SelectInput';
import DateInput from '../../components/inputs/DateInput';
import TextAreaInput from '../../components/inputs/TextAreaInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';

const schema = yup.object({
  name:        yup.string().required('Name is required'),
  phone:       yup.string().required('Phone is required'),
  email:       yup.string().email().optional().nullable(),
  source:      yup.string().optional(),
  stage:       yup.string().optional(),
  priority:    yup.string().optional(),
  nextFollowUp:yup.string().optional().nullable(),
  notes:       yup.string().optional(),
});

const SOURCE_OPTIONS  = ['Walk-in', 'Online', 'Referral', 'Cold Call', 'Social Media', 'Other'].map((v) => ({ value: v, label: v }));
const STAGE_OPTIONS   = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'].map((v) => ({ value: v, label: v }));
const PRIORITY_OPTIONS= ['High', 'Medium', 'Low'].map((v) => ({ value: v, label: v }));

const EditLeadScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { theme } = useTheme();
  const { currentLead, isLoading, fetchLead, updateLead } = useLeadStore();
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => {
    fetchLead(id);
  }, [id]);

  useEffect(() => {
    if (currentLead?.id === id) {
      reset({
        name:         currentLead.name,
        phone:        currentLead.phone,
        email:        currentLead.email,
        source:       currentLead.source,
        stage:        currentLead.stage,
        priority:     currentLead.priority,
        nextFollowUp: currentLead.nextFollowUp,
        notes:        currentLead.notes,
      });
    }
  }, [currentLead]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await updateLead(id, data);
      Toast.show({ type: 'success', text1: 'Lead updated' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to update lead', text2: err.message });
    }
    setSaving(false);
  };

  const s = styles(theme);

  if (isLoading && !currentLead) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <AppHeader title="Edit Lead" navigation={navigation} />
      <KeyboardAware contentContainerStyle={s.content}>
        <Controller control={control} name="name"       render={({ field: { onChange, value } }) => (<AppInput label="Full Name *" value={value} onChangeText={onChange} placeholder="John Doe" iconLeft="account-outline" error={errors.name?.message} autoCapitalize="words" />) } />
        <Controller control={control} name="phone"      render={({ field: { onChange, value } }) => (<AppInput label="Phone *" value={value} onChangeText={onChange} placeholder="+91 9800000000" iconLeft="phone-outline" keyboardType="phone-pad" error={errors.phone?.message} />) } />
        <Controller control={control} name="email"      render={({ field: { onChange, value } }) => (<AppInput label="Email" value={value} onChangeText={onChange} placeholder="john@example.com" iconLeft="email-outline" keyboardType="email-address" />) } />
        <Controller control={control} name="source"     render={({ field: { onChange, value } }) => (<SelectInput label="Source" value={value} onSelect={onChange} options={SOURCE_OPTIONS} />) } />
        <Controller control={control} name="stage"      render={({ field: { onChange, value } }) => (<SelectInput label="Stage" value={value} onSelect={onChange} options={STAGE_OPTIONS} />) } />
        <Controller control={control} name="priority"   render={({ field: { onChange, value } }) => (<SelectInput label="Priority" value={value} onSelect={onChange} options={PRIORITY_OPTIONS} />) } />
        <Controller control={control} name="nextFollowUp" render={({ field: { onChange, value } }) => (<DateInput label="Next Follow-up" value={value} onChange={onChange} />) } />
        <Controller control={control} name="notes"      render={({ field: { onChange, value } }) => (<TextAreaInput label="Notes" value={value} onChangeText={onChange} />) } />
        <PrimaryButton title="Save Changes" onPress={handleSubmit(onSubmit)} loading={saving} />
      </KeyboardAware>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: theme.colors.background },
  center:  { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.base },
});

export default EditLeadScreen;
