import React from 'react';
import { Image } from 'react-native';

type Props = {
  size?: number;
};

export default function NimbusBird({ size = 80 }: Props) {
  return (
    <Image
      source={require('@/assets/nimbus-bird.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
