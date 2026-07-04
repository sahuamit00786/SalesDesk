import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from './components/AppText';
import { CheckCircle2, AlertCircle, Info } from './icons';
import { useTheme } from './ThemeProvider';

function ToastCard({ tone, text1, text2 }) {
  const theme = useTheme();
  const palette = {
    success: { icon: CheckCircle2, color: theme.colors.success, bg: theme.colors.successSoft },
    error: { icon: AlertCircle, color: theme.colors.danger, bg: theme.colors.dangerSoft },
    info: { icon: Info, color: theme.brand, bg: theme.brandSoft },
  }[tone];
  const Icon = palette.icon;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          ...theme.elevation.raised,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.bg, borderRadius: theme.radius.sm + 2 }]}>
        <Icon size={19} color={palette.color} strokeWidth={2.2} />
      </View>
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {text1}
        </AppText>
        {text2 ? (
          <AppText variant="caption" color="inkMuted" numberOfLines={2}>
            {text2}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props) => <ToastCard tone="success" {...props} />,
  error: (props) => <ToastCard tone="error" {...props} />,
  info: (props) => <ToastCard tone="info" {...props} />,
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    width: '92%',
  },
  iconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
});
