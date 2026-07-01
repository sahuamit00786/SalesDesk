import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';

const ACTION_WIDTH = 80;
const THRESHOLD = ACTION_WIDTH * 0.6;

const SwipeableRow = ({ children, onEdit, onDelete }) => {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -ACTION_WIDTH * 2);
      } else {
        translateX.value = Math.min(e.translationX, 0);
      }
    })
    .onEnd((e) => {
      if (e.translationX < -THRESHOLD) {
        translateX.value = withSpring(-ACTION_WIDTH * 2);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const close = () => { translateX.value = withSpring(0); };

  const s = styles(theme);

  return (
    <View style={s.container}>
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.action, s.edit]}
          onPress={() => { close(); onEdit?.(); }}
          accessibilityLabel="Edit"
        >
          <Icon name="pencil-outline" size={20} color="#fff" />
          <Text style={s.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.action, s.delete]}
          onPress={() => { close(); onDelete?.(); }}
          accessibilityLabel="Delete"
        >
          <Icon name="trash-can-outline" size={20} color="#fff" />
          <Text style={s.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' },
  actions: {
    position:       'absolute',
    right:          0,
    top:            0,
    bottom:         0,
    flexDirection:  'row',
    width:          ACTION_WIDTH * 2,
  },
  action: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  edit:       { backgroundColor: theme.colors.primary },
  delete:     { backgroundColor: theme.colors.danger },
  actionText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});

export default SwipeableRow;
