import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { userService } from '../../services/userService';
import { spacing } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import KeyboardAware from '../../components/misc/KeyboardAware';
import AppInput from '../../components/inputs/AppInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';

const schema = yup.object({
  oldPassword:     yup.string().required('Current password is required'),
  newPassword:     yup.string().min(8, 'Minimum 8 characters').required('New password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm password'),
});

const ChangePasswordScreen = ({ navigation }) => {
  const { theme }   = useTheme();
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async ({ oldPassword, newPassword }) => {
    setSaving(true);
    try {
      await userService.changePassword(oldPassword, newPassword);
      Toast.show({ type: 'success', text1: 'Password changed successfully' });
      reset();
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to change password', text2: err.message });
    }
    setSaving(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Change Password" navigation={navigation} />
      <KeyboardAware contentContainerStyle={styles.content}>
        <Controller control={control} name="oldPassword"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Current Password *"
              value={value}
              onChangeText={onChange}
              placeholder="••••••••"
              iconLeft="lock-outline"
              secureTextEntry
              error={errors.oldPassword?.message}
            />
          )}
        />
        <Controller control={control} name="newPassword"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="New Password *"
              value={value}
              onChangeText={onChange}
              placeholder="min 8 characters"
              iconLeft="lock-plus-outline"
              secureTextEntry
              error={errors.newPassword?.message}
            />
          )}
        />
        <Controller control={control} name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Confirm New Password *"
              value={value}
              onChangeText={onChange}
              placeholder="repeat new password"
              iconLeft="lock-check-outline"
              secureTextEntry
              error={errors.confirmPassword?.message}
            />
          )}
        />
        <PrimaryButton title="Change Password" onPress={handleSubmit(onSubmit)} loading={saving} />
      </KeyboardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.base },
});

export default ChangePasswordScreen;
