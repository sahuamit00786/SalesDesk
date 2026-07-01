import React, { forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';
import AppInput from '../../components/inputs/AppInput';
import SelectInput from '../../components/inputs/SelectInput';
import DateInput from '../../components/inputs/DateInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import GhostButton from '../../components/buttons/GhostButton';
import { useDealStore } from '../../store/dealStore';

const STAGES = [
  { value: 'new',         label: 'New'         },
  { value: 'qualified',   label: 'Qualified'   },
  { value: 'proposal',    label: 'Proposal'    },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won',         label: 'Won'         },
  { value: 'lost',        label: 'Lost'        },
];

const schema = yup.object({
  title:         yup.string().required('Title required'),
  value:         yup.number().typeError('Enter valid amount').min(0).optional().nullable(),
  stage:         yup.string().required('Select a stage'),
  expectedClose: yup.date().optional().nullable(),
});

const AddDealSheet = forwardRef(({ onSaved }, ref) => {
  const { theme } = useTheme();
  const { createDeal } = useDealStore();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { title: '', value: '', stage: 'new', expectedClose: null },
  });

  const close = useCallback(() => { reset(); ref?.current?.close(); }, []);

  const onSubmit = async (data) => {
    try {
      await createDeal({
        title:         data.title,
        value:         data.value ? Number(data.value) : null,
        stage:         data.stage,
        expectedClose: data.expectedClose || null,
      });
      Toast.show({ type: 'success', text1: 'Deal created' });
      reset();
      onSaved?.();
      ref?.current?.close();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to create deal' });
    }
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['80%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      keyboardBehavior="interactive"
    >
      <BottomSheetScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: theme.colors.textPrimary }]}>New Deal</Text>

        <Controller
          control={control} name="title"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Deal Title" value={value} onChangeText={onChange} icon="briefcase-outline" error={errors.title?.message} />
          )}
        />

        <Controller
          control={control} name="value"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Value (₹)" value={String(value)} onChangeText={onChange} keyboardType="numeric" icon="currency-inr" error={errors.value?.message} />
          )}
        />

        <Controller
          control={control} name="stage"
          render={({ field: { onChange, value } }) => (
            <SelectInput label="Stage" value={value} options={STAGES} onChange={onChange} icon="stairs" error={errors.stage?.message} />
          )}
        />

        <Controller
          control={control} name="expectedClose"
          render={({ field: { onChange, value } }) => (
            <DateInput label="Expected Close Date" value={value} onChange={onChange} icon="calendar-outline" error={errors.expectedClose?.message} />
          )}
        />

        <View style={s.actions}>
          <GhostButton title="Cancel" onPress={close} style={{ flex: 1 }} />
          <PrimaryButton title="Create Deal" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={{ flex: 2 }} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const s = StyleSheet.create({
  container: { padding: spacing.base, paddingBottom: 40 },
  title:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.base },
  actions:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});

AddDealSheet.displayName = 'AddDealSheet';
export default AddDealSheet;
