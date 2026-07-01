import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { spacing } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import KeyboardAware from '../../components/misc/KeyboardAware';
import AppInput from '../../components/inputs/AppInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';

const schema = yup.object({
  name:  yup.string().required('Name is required'),
  phone: yup.string().optional(),
});

const EditProfileScreen = ({ navigation }) => {
  const { theme }  = useTheme();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const updated = await userService.updateProfile(data);
      updateUser(updated);
      Toast.show({ type: 'success', text1: 'Profile updated' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message });
    }
    setSaving(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Edit Profile" navigation={navigation} />
      <KeyboardAware contentContainerStyle={styles.content}>
        <Controller control={control} name="name"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Full Name *"
              value={value}
              onChangeText={onChange}
              placeholder="Your name"
              iconLeft="account-outline"
              autoCapitalize="words"
              error={errors.name?.message}
            />
          )}
        />
        <Controller control={control} name="phone"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Phone"
              value={value}
              onChangeText={onChange}
              placeholder="+91 9800000000"
              iconLeft="phone-outline"
              keyboardType="phone-pad"
            />
          )}
        />
        <PrimaryButton title="Save Changes" onPress={handleSubmit(onSubmit)} loading={saving} />
      </KeyboardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.base },
});

export default EditProfileScreen;
