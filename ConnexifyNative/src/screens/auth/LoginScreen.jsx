import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, Image,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { fontSize, fontWeight, spacing } from '../../theme';
import AppInput from '../../components/inputs/AppInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';

const schema = yup.object({
  email:    yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Min 6 characters').required('Password is required'),
});

const LoginScreen = () => {
  const { theme, isDark } = useTheme();
  const insets   = useSafeAreaInsets();
  const { login, isLoading } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async ({ email, password }) => {
    const result = await login(email, password);
    if (!result.success) {
      Toast.show({ type: 'error', text1: 'Login failed', text2: result.message });
    }
  };

  const s = styles(theme, insets);

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Animatable.View animation="fadeInDown" duration={600} delay={100} style={s.logoArea}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>C</Text>
          </View>
          <Text style={s.appName}>Connexify</Text>
          <Text style={s.tagline}>Your CRM, in your pocket</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={300} style={s.card}>
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.sub}>Sign in to continue</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Email address"
                value={value}
                onChangeText={onChange}
                placeholder="you@company.com"
                iconLeft="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Password"
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                iconLeft="lock-outline"
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />

          <PrimaryButton
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={s.btn}
          />
        </Animatable.View>

        <Text style={s.footer}>Connexify CRM v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:     { flex: 1, backgroundColor: theme.colors.background },
  scroll:   { flexGrow: 1, justifyContent: 'center', padding: spacing.base, paddingTop: insets.top + spacing['2xl'] },
  logoArea: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: '#fff', fontSize: 40, fontWeight: fontWeight.bold },
  appName:  { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  tagline:  { fontSize: fontSize.base, color: theme.colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    24,
    padding:         spacing['2xl'],
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    16,
    elevation:       4,
    marginBottom:    spacing['2xl'],
  },
  heading:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: 4 },
  sub:      { fontSize: fontSize.base, color: theme.colors.textSecondary, marginBottom: spacing['2xl'] },
  btn:      { marginTop: spacing.sm },
  footer:   { textAlign: 'center', fontSize: fontSize.xs, color: theme.colors.textMuted, marginBottom: insets.bottom + spacing.base },
});

export default LoginScreen;
