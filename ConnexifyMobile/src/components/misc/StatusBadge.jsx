import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { borderRadius, fontSize, fontWeight } from '../../theme';

const StatusBadge = ({ label, color = '#64748B', icon, style }) => (
  <View style={[styles.badge, { backgroundColor: color + '20' }, style]}>
    {icon && <Icon name={icon} size={11} color={color} style={styles.icon} />}
    <Text style={[styles.text, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius:   borderRadius.full,
  },
  icon: { marginRight: 3 },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});

export default StatusBadge;
