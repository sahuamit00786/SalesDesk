import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, Dimensions } from 'react-native';

export const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.82, 320);

const DrawerContext = createContext({
  isOpen: false,
  drawerWidth: DRAWER_WIDTH,
  translateX: null,
  overlayOpacity: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const DrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 300,
        mass: 0.85,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, overlayOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  }, [translateX, overlayOpacity]);

  return (
    <DrawerContext.Provider value={{ isOpen, drawerWidth: DRAWER_WIDTH, translateX, overlayOpacity, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => useContext(DrawerContext);
