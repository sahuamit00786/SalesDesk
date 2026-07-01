import React, { forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
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
import { campaignService } from '../../services/campaignService';

const schema = yup.object({
  amount:        yup.number().typeError('Enter a valid amount').positive('Must be > 0').required('Amount required'),
  paymentMethod: yup.string().required('Select payment method'),
  paymentDate:   yup.date().required('Select payment date').nullable(),
  notes:         yup.string().optional(),
});

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other']
  .map((v) => ({ value: v, label: v }));

const AddPaymentSheet = forwardRef(({ campaignId, lead, onSaved }, ref) => {
  const { theme } = useTheme();
  const snapPoints = ['75%'];

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { amount: '', paymentMethod: 'UPI', paymentDate: new Date(), notes: '' },
  });

  const close = useCallback(() => {
    reset();
    ref?.current?.close();
  }, []);

  const onSubmit = async (data) => {
    try {
      await campaignService.createPayment(campaignId, lead.id, {
        amount:        Number(data.amount),
        paymentMethod: data.paymentMethod,
        paymentDate:   data.paymentDate,
        notes:         data.notes || null,
      });
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      reset();
      onSaved?.();
      ref?.current?.close();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to record payment' });
    }
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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Add Payment</Text>
        {!!lead && (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            For: {lead.name || lead.Lead?.name || ''}
          </Text>
        )}

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Controller
            control={control} name="amount"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Amount (₹)"
                value={String(value)}
                onChangeText={onChange}
                keyboardType="numeric"
                icon="currency-inr"
                error={errors.amount?.message}
              />
            )}
          />

          <Controller
            control={control} name="paymentMethod"
            render={({ field: { onChange, value } }) => (
              <SelectInput
                label="Payment Method"
                value={value}
                options={PAYMENT_METHODS}
                onChange={onChange}
                icon="credit-card-outline"
                error={errors.paymentMethod?.message}
              />
            )}
          />

          <Controller
            control={control} name="paymentDate"
            render={({ field: { onChange, value } }) => (
              <DateInput
                label="Payment Date"
                value={value}
                onChange={onChange}
                icon="calendar-outline"
                error={errors.paymentDate?.message}
              />
            )}
          />

          <Controller
            control={control} name="notes"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Notes (optional)"
                value={value}
                onChangeText={onChange}
                icon="note-text-outline"
                multiline
                numberOfLines={3}
              />
            )}
          />

          <View style={styles.actions}>
            <GhostButton title="Cancel" onPress={close} style={styles.cancelBtn} />
            <PrimaryButton title="Record Payment" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submitBtn} />
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.base },
  title:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 2 },
  subtitle:  { fontSize: fontSize.sm, marginBottom: spacing.base },
  actions:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingBottom: 40 },
  cancelBtn: { flex: 1 },
  submitBtn: { flex: 2 },
});

AddPaymentSheet.displayName = 'AddPaymentSheet';
export default AddPaymentSheet;
