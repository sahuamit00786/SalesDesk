import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';

/**
 * Themed bottom sheet modal. Open via ref.present(), close via ref.dismiss().
 * scrollable → BottomSheetScrollView body.
 */
const Sheet = forwardRef(function Sheet(
  { title, subtitle, children, snapPoints: snapProp, scrollable = false, onDismiss, footer = null },
  ref,
) {
  const theme = useTheme();
  const snapPoints = useMemo(() => snapProp || null, [snapProp]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />
    ),
    [],
  );

  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints || undefined}
      enableDynamicSizing={!snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      backgroundStyle={{
        backgroundColor: theme.colors.cardElevated,
        borderRadius: theme.radius.xxl,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.inkFaint, width: 40 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <Body
        style={scrollable ? styles.scrollBody : undefined}
        contentContainerStyle={scrollable ? styles.body : undefined}
      >
        <View style={scrollable ? undefined : styles.body}>
          {title ? (
            <View style={styles.header}>
              <AppText variant="heading">{title}</AppText>
              {subtitle ? (
                <AppText variant="caption" color="inkMuted" style={styles.subtitle}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          ) : null}
          {children}
          {footer}
        </View>
      </Body>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  scrollBody: { flex: 0 },
  body: { paddingHorizontal: 20, paddingBottom: 28 },
  header: { marginBottom: 14, marginTop: 2 },
  subtitle: { marginTop: 3 },
});

export default Sheet;
