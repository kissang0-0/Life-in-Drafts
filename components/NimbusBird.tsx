import React from 'react';
import { Image } from 'react-native';

type Props = {
  size?: number;
};

export default function NimbusBird({ size = 48 }: Props) {
  return (
    <Image
      source={require('@/assets/nimbus-logo.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
