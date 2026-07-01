import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';
import PrimaryButton from '../buttons/PrimaryButton';

const EmptyState = ({ icon = 'inbox-outline', title = 'Nothing here', subtitle, ctaTitle, onCta, style }) => {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <Animatable.View animation="fadeIn" duration={400} style={[s.container, style]}>
      <View style={s.iconWrap}>
        <Icon name={icon} size={64} color={theme.colors.border} />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {ctaTitle && onCta && (
        <PrimaryButton title={ctaTitle} onPress={onCta} style={s.cta} fullWidth={false} />
      )}
    </Animatable.View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] },
  iconWrap:  { marginBottom: spacing.base },
  title:     { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle:  { fontSize: fontSize.base, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  cta:       { marginTop: spacing['2xl'] },
});

export default EmptyState;
