import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTheme } from '../../theme/ThemeContext';
import { fontWeight } from '../../theme';

const COLORS = [
  '#4F46E5','#06B6D4','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1',
];

const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');

const getColor = (name = '') =>
  COLORS[name.charCodeAt(0) % COLORS.length];

const Avatar = ({ name, uri, size = 36, style }) => {
  const { theme } = useTheme();
  const initials = getInitials(name);
  const bgColor  = getColor(name);
  const fontSize = size * 0.38;

  if (uri) {
    return (
      <FastImage
        source={{ uri, priority: FastImage.priority.normal }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode={FastImage.resizeMode.cover}
      />
    );
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }, style]}>
      <Text style={{ color: '#fff', fontSize, fontWeight: fontWeight.bold }}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export default Avatar;
