import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authApi } from '../api';
import { useTheme } from '../../../design-system/ThemeProvider';
import AppText from '../../../design-system/components/AppText';
import Button from '../../../design-system/components/Button';
import TextField from '../../../design-system/components/TextField';
import { ArrowLeft, Mail, KeyRound, Lock, AlertCircle, CheckCircle2 } from '../../../design-system/icons';

const emailSchema = yup.object({
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
});

const resetSchema = yup.object({
  otp: yup.string().trim().min(4, 'Enter the code from your email').required('Reset code is required'),
  password: yup.string().min(8, 'At least 8 characters').required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Confirm your new password'),
});

export default function ForgotPasswordScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emailForm = useForm({ resolver: yupResolver(emailSchema), defaultValues: { email: '' } });
  const resetForm = useForm({
    resolver: yupResolver(resetSchema),
    defaultValues: { otp: '', password: '', confirmPassword: '' },
  });

  const sendCode = async ({ email: value }) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(value);
      setEmail(value);
      setStep('reset');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const doReset = async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({ email, ...values });
      Toast.show({ type: 'success', text1: 'Password updated', text2: 'Sign in with your new password' });
      navigation.goBack();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const s = styles(theme);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={s.back}
          hitSlop={10}
        >
          <ArrowLeft size={22} color={theme.colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[s.iconBadge, { backgroundColor: theme.brandSoft }]}>
              <KeyRound size={26} color={theme.brand} strokeWidth={2.2} />
            </View>
            <AppText variant="title">Reset password</AppText>
            <AppText variant="body" color="inkMuted" style={s.subtitle}>
              {step === 'email'
                ? "Enter your account email and we'll send you a reset code."
                : `We sent a reset code to ${email}. Enter it below with your new password.`}
            </AppText>
          </Animated.View>

          {serverError ? (
            <Animated.View entering={FadeInDown.duration(250)} style={s.errorBanner}>
              <AlertCircle size={17} color={theme.colors.danger} strokeWidth={2.2} />
              <AppText variant="label" color="danger" style={s.flexText}>
                {serverError}
              </AppText>
            </Animated.View>
          ) : null}

          {step === 'email' ? (
            <Animated.View entering={FadeInDown.duration(350).delay(80)}>
              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    placeholder="you@company.com"
                    icon={Mail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailForm.formState.errors.email?.message}
                    style={s.field}
                  />
                )}
              />
              <Button
                title="Send reset code"
                size="lg"
                fullWidth
                loading={submitting}
                onPress={emailForm.handleSubmit(sendCode)}
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInRight.duration(350)}>
              <View style={s.sentBanner}>
                <CheckCircle2 size={17} color={theme.colors.success} strokeWidth={2.2} />
                <AppText variant="label" color="success" style={s.flexText}>
                  Code sent — check your inbox
                </AppText>
              </View>
              <Controller
                control={resetForm.control}
                name="otp"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Reset code"
                    value={value}
                    onChangeText={onChange}
                    placeholder="6-digit code"
                    icon={KeyRound}
                    keyboardType="number-pad"
                    error={resetForm.formState.errors.otp?.message}
                    style={s.field}
                  />
                )}
              />
              <Controller
                control={resetForm.control}
                name="password"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="New password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="At least 8 characters"
                    icon={Lock}
                    secureTextEntry
                    error={resetForm.formState.errors.password?.message}
                    style={s.field}
                  />
                )}
              />
              <Controller
                control={resetForm.control}
                name="confirmPassword"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Confirm password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Repeat new password"
                    icon={Lock}
                    secureTextEntry
                    error={resetForm.formState.errors.confirmPassword?.message}
                    style={s.field}
                  />
                )}
              />
              <Button
                title="Update password"
                size="lg"
                fullWidth
                loading={submitting}
                onPress={resetForm.handleSubmit(doReset)}
              />
              <Pressable onPress={() => setStep('email')} style={s.resend} hitSlop={8}>
                <AppText variant="label" color="brand">
                  Use a different email
                </AppText>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.page },
    flex: { flex: 1 },
    flexText: { flex: 1 },
    topBar: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
    back: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { padding: theme.spacing.xxl, paddingTop: theme.spacing.lg },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    subtitle: { marginTop: 6, marginBottom: theme.spacing.xxl },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginBottom: theme.spacing.lg,
      gap: 8,
    },
    sentBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.successSoft,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginBottom: theme.spacing.lg,
      gap: 8,
    },
    field: { marginBottom: theme.spacing.lg },
    resend: { alignSelf: 'center', marginTop: theme.spacing.lg },
  });
