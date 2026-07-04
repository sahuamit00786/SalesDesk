import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuthStore } from '../../../stores/authStore';
import { authErrorMessage } from '../../../api/envelope';
import { useTheme } from '../../../design-system/ThemeProvider';
import AppText from '../../../design-system/components/AppText';
import Button from '../../../design-system/components/Button';
import TextField from '../../../design-system/components/TextField';
import { Mail, Lock, AlertCircle, Zap } from '../../../design-system/icons';

const schema = yup.object({
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // RootNavigator switches to the app on status change
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const s = styles(theme);

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[theme.brand, theme.brandDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + theme.spacing.huge }]}
      >
        <View style={s.decorCircleLg} />
        <View style={s.decorCircleSm} />
        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={s.logoMark}>
            <Zap size={26} color={theme.brand} strokeWidth={2.4} fill={theme.brand} />
          </View>
          <AppText variant="display" color={theme.onBrand} style={s.brandName}>
            LeadNest
          </AppText>
          <AppText variant="body" color={theme.onBrand} style={s.tagline}>
            Your CRM, in your pocket
          </AppText>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(500).delay(120)} style={s.card}>
            <AppText variant="heading">Welcome back</AppText>
            <AppText variant="body" color="inkMuted" style={s.subtitle}>
              Sign in to continue to your workspace
            </AppText>

            {serverError ? (
              <Animated.View entering={FadeInDown.duration(250)} style={s.errorBanner}>
                <AlertCircle size={17} color={theme.colors.danger} strokeWidth={2.2} />
                <AppText variant="label" color="danger" style={s.errorText}>
                  {serverError}
                </AppText>
              </Animated.View>
            ) : null}

            <Controller
              control={control}
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
                  autoComplete="email"
                  error={formState.errors.email?.message}
                  style={s.field}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  icon={Lock}
                  secureTextEntry
                  autoCapitalize="none"
                  error={formState.errors.password?.message}
                  style={s.field}
                  onSubmitEditing={handleSubmit(onSubmit)}
                  returnKeyType="go"
                />
              )}
            />

            <Button
              title="Sign in"
              size="lg"
              fullWidth
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
              style={s.submit}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={s.forgot}
              hitSlop={8}
            >
              <AppText variant="label" color="brand">
                Forgot password?
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.page },
    flex: { flex: 1 },
    hero: {
      paddingHorizontal: theme.spacing.xxl,
      paddingBottom: theme.spacing.xxl,
      borderBottomLeftRadius: theme.radius.xxl + 8,
      borderBottomRightRadius: theme.radius.xxl + 8,
      overflow: 'hidden',
    },
    decorCircleLg: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(255,255,255,0.07)',
      top: -60,
      right: -50,
    },
    decorCircleSm: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.06)',
      bottom: -30,
      left: -20,
    },
    logoMark: {
      width: 52,
      height: 52,
      borderRadius: theme.radius.lg,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    brandName: { letterSpacing: 0.2 },
    tagline: { opacity: 0.85, marginTop: 4 },
    scroll: { flexGrow: 1, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.huge },
    card: {
      marginTop: theme.spacing.xl,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xxl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.elevation.raised,
    },
    subtitle: { marginTop: 4, marginBottom: theme.spacing.xl },
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
    errorText: { flex: 1 },
    field: { marginBottom: theme.spacing.lg },
    submit: { marginTop: theme.spacing.sm },
    forgot: { alignSelf: 'center', marginTop: theme.spacing.lg },
  });
