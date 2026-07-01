import React, { useCallback, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';
import PrimaryButton from '../buttons/PrimaryButton';
import SecondaryButton from '../buttons/SecondaryButton';
import DangerButton from '../buttons/DangerButton';

const ConfirmSheet = forwardRef(({
  title = 'Are you sure?',
  subtitle,
  confirmTitle = 'Confirm',
  cancelTitle  = 'Cancel',
  onConfirm,
  onCancel,
  dangerous = false,
  icon = 'help-circle-outline',
}, ref) => {
  const { theme } = useTheme();

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);

  const s = styles(theme);
  const iconColor = dangerous ? theme.colors.danger : theme.colors.primary;

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['35%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetView style={s.content}>
        <View style={[s.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <Icon name={icon} size={32} color={iconColor} />
        </View>
        <Text style={s.title}>{title}</Text>
        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        <View style={s.actions}>
          <SecondaryButton title={cancelTitle} onPress={() => { ref?.current?.close(); onCancel?.(); }} style={s.btn} />
          {dangerous
            ? <DangerButton title={confirmTitle} onPress={() => { ref?.current?.close(); onConfirm?.(); }} style={s.btn} />
            : <PrimaryButton title={confirmTitle} onPress={() => { ref?.current?.close(); onConfirm?.(); }} style={s.btn} />
          }
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = (theme) => StyleSheet.create({
  content:  { padding: spacing.base, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title:    { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.base, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: spacing.base },
  actions:  { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.md },
  btn:      { flex: 1 },
});

export default ConfirmSheet;
