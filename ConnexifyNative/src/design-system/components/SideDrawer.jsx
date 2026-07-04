import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AppText from './AppText';
import { X } from '../icons';
import { useTheme } from '../ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(320, SCREEN_WIDTH * 0.82);
const DURATION = 220;

/**
 * Slide-in drawer from the left. Open via ref.open(), close via ref.close().
 */
const SideDrawer = forwardRef(function SideDrawer({ title, children }, ref) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateX = useSharedValue(-PANEL_WIDTH);
  const backdropOpacity = useSharedValue(0);

  const close = () => {
    backdropOpacity.value = withTiming(0, { duration: DURATION });
    translateX.value = withTiming(-PANEL_WIDTH, { duration: DURATION }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  };

  useImperativeHandle(ref, () => ({
    open: () => {
      setVisible(true);
      translateX.value = withTiming(0, { duration: DURATION });
      backdropOpacity.value = withTiming(1, { duration: DURATION });
    },
    close,
  }));

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      {visible ? <StatusBar barStyle="light-content" backgroundColor="transparent" translucent /> : null}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          panelStyle,
          {
            width: PANEL_WIDTH,
            backgroundColor: theme.colors.cardElevated,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View style={styles.header}>
          <AppText variant="heading">{title}</AppText>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            hitSlop={10}
            style={styles.closeBtn}
          >
            <X size={20} color={theme.colors.inkMuted} strokeWidth={2.2} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 12, paddingBottom: 24 },
});

export default SideDrawer;
