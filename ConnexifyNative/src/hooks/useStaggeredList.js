import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an animated style factory for staggered list entry.
 * Usage:
 *   const getItemStyle = useStaggeredList(data.length);
 *   // in renderItem:
 *   <Animated.View style={getItemStyle(index)}> ... </Animated.View>
 */
export const useStaggeredList = (itemCount, staggerMs = 50) => {
  const animations = useRef(
    Array.from({ length: Math.max(itemCount, 20) }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.stagger(
      staggerMs,
      animations.slice(0, itemCount).map((anim) =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }),
      ),
    ).start();
  }, [itemCount]);

  return (index) => ({
    opacity: animations[index] ?? new Animated.Value(1),
    transform: [{
      translateY: (animations[index] ?? new Animated.Value(1)).interpolate({
        inputRange:  [0, 1],
        outputRange: [24, 0],
      }),
    }],
  });
};
