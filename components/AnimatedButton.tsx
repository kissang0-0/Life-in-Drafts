import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

type Props = {
  onPress?: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
  scale?: number;
};

export function AnimatedButton({ onPress, style, children, disabled, scale: scaleTarget = 0.94 }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: scaleTarget, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }).start();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
