import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

const { width, height } = Dimensions.get('window');

type Props = {
  children: React.ReactNode;
};

export function SoftBackground({ children }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceAlt, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: colors.primary + '22' }]} />
      <View style={[styles.blob2, { backgroundColor: colors.lavender + '33' }]} />
      <View style={[styles.blob3, { backgroundColor: colors.accent + '22' }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -60,
  },
  blob2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: height * 0.3,
    left: -50,
  },
  blob3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: 80,
    right: 20,
  },
});
