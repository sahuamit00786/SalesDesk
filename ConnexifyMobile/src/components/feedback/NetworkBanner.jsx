import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, fontWeight } from '../../theme';

// NOTE: add @react-native-community/netinfo to package.json
// npm install @react-native-community/netinfo

const NetworkBanner = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      if (!offline && wasOffline) {
        setShowOnline(true);
        setTimeout(() => setShowOnline(false), 2500);
      }
      if (offline) setWasOffline(true);
    });
    return unsub;
  }, [wasOffline]);

  const visible = isOffline || showOnline;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue:        visible ? 0 : -60,
      duration:       300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const bg = isOffline ? '#EF4444' : '#10B981';
  const icon = isOffline ? 'wifi-off' : 'wifi-check';
  const msg  = isOffline ? 'No internet connection' : 'Back online';

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bg, paddingTop: insets.top + 4, transform: [{ translateY }] }]}>
      <Icon name={icon} size={16} color="#fff" />
      <Text style={styles.text}>{msg}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position:       'absolute',
    top:             0,
    left:            0,
    right:           0,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingBottom:   8,
    gap:             6,
    zIndex:          999,
  },
  text: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});

export default NetworkBanner;
