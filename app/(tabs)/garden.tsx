import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Image,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Line, G, Rect, Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { DiaryEntry } from '@/lib/firestore';
import NimbusBird from '@/components/NimbusBird';
import { MOOD_OPTIONS } from '@/constants/nimbus';

const { width: SW, height: SH } = Dimensions.get('window');
const GARDEN_H = Math.min(SH * 0.52, 420);
const GROUND_H = 72;
const FLOOR_Y = GARDEN_H - GROUND_H;

// ─── Season Detection ───────────────────────────────────────────────────────
type Season = 'spring' | 'summer' | 'autumn' | 'winter';
function getSeason(): Season {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

const SEASON_SKY: Record<Season, readonly [string, string, string]> = {
  spring: ['#F9D6F0', '#DEC8F8', '#C0DEFF'],
  summer: ['#7EC8E3', '#B8E8FF', '#E0F5FF'],
  autumn: ['#FFD4A3', '#FFC088', '#FFE8CC'],
  winter: ['#CDD9F5', '#E2ECF8', '#F0F4FC'],
};

const SEASON_GROUND: Record<Season, readonly [string, string]> = {
  spring: ['#5DBB63', '#3A8A48'],
  summer: ['#4CAF50', '#2E7D32'],
  autumn: ['#7A5C2A', '#5C4020'],
  winter: ['#A0BDD4', '#7A9BB0'],
};

// ─── Seeded pseudo-random ────────────────────────────────────────────────────
function seededRandom(seed: string, index: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h = Math.imul(h ^ index, 0x9e3779b9);
  return Math.abs(h) / 0x7fffffff;
}

// ─── Mood positioning zones (x fraction of canvas) ───────────────────────────
const MOOD_ZONES: Record<string, { cx: number; spread: number }> = {
  happy:      { cx: 0.78, spread: 0.10 },
  excited:    { cx: 0.88, spread: 0.08 },
  grateful:   { cx: 0.62, spread: 0.09 },
  hopeful:    { cx: 0.42, spread: 0.09 },
  calm:       { cx: 0.28, spread: 0.10 },
  neutral:    { cx: 0.52, spread: 0.14 },
  melancholy: { cx: 0.15, spread: 0.07 },
  sad:        { cx: 0.10, spread: 0.07 },
  anxious:    { cx: 0.36, spread: 0.09 },
  tired:      { cx: 0.52, spread: 0.09 },
  angry:      { cx: 0.92, spread: 0.06 },
};

// ─── Flower growth size (days old) ───────────────────────────────────────────
function getFlowerSize(entry: DiaryEntry): number {
  const raw = entry.createdAt;
  const d: Date = raw && typeof (raw as any).toDate === 'function'
    ? (raw as any).toDate()
    : raw instanceof Date ? raw : new Date(raw as any);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return 26;
  if (days < 3) return 34;
  if (days < 7) return 44;
  return 54;
}

// ─── Weather parse ────────────────────────────────────────────────────────────
type Weather = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'windy' | 'night' | 'clear';
function parseWeather(w?: string): Weather {
  if (!w) return 'clear';
  const l = w.toLowerCase();
  if (l.includes('sun') || l.includes('bright')) return 'sunny';
  if (l.includes('storm') || l.includes('thunder')) return 'stormy';
  if (l.includes('rain') || l.includes('shower')) return 'rainy';
  if (l.includes('cloud') || l.includes('overcast')) return 'cloudy';
  if (l.includes('wind') || l.includes('breezy')) return 'windy';
  if (l.includes('night') || l.includes('dark')) return 'night';
  return 'clear';
}

// ─── SVG Flower Components ───────────────────────────────────────────────────
function SunflowerSVG({ size }: { size: number }) {
  const cx = size / 2, cy = size * 0.38;
  const petals = 12;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={cy + size * 0.16} x2={cx} y2={size * 0.98} stroke="#4A7C59" strokeWidth={size * 0.07} strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.15} cy={size * 0.68} rx={size * 0.13} ry={size * 0.055} fill="#5C9E6E" transform={`rotate(-35 ${cx - size * 0.15} ${size * 0.68})`} />
      <Ellipse cx={cx + size * 0.15} cy={size * 0.58} rx={size * 0.13} ry={size * 0.055} fill="#5C9E6E" transform={`rotate(35 ${cx + size * 0.15} ${size * 0.58})`} />
      {Array.from({ length: petals }, (_, i) => {
        const a = (i * Math.PI * 2) / petals - Math.PI / 2;
        const px = cx + Math.cos(a) * size * 0.23;
        const py = cy + Math.sin(a) * size * 0.23;
        return <Ellipse key={i} cx={px} cy={py} rx={size * 0.14} ry={size * 0.065} fill="#F8C930" transform={`rotate(${(i * 360) / petals} ${px} ${py})`} />;
      })}
      <Circle cx={cx} cy={cy} r={size * 0.15} fill="#7B3F00" />
      <Circle cx={cx} cy={cy} r={size * 0.085} fill="#A0522D" />
    </Svg>
  );
}

function ForgetMeNotSVG({ size }: { size: number }) {
  const cx = size / 2, cy = size * 0.35;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={cy + size * 0.12} x2={cx} y2={size * 0.98} stroke="#4A7C59" strokeWidth={size * 0.055} strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.11} cy={size * 0.63} rx={size * 0.1} ry={size * 0.044} fill="#5C9E6E" transform={`rotate(-30 ${cx - size * 0.11} ${size * 0.63})`} />
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const a = (deg - 90) * Math.PI / 180;
        const px = cx + Math.cos(a) * size * 0.155;
        const py = cy + Math.sin(a) * size * 0.155;
        return <Ellipse key={i} cx={px} cy={py} rx={size * 0.1} ry={size * 0.065} fill="#93C5FD" transform={`rotate(${deg} ${px} ${py})`} />;
      })}
      <Circle cx={cx} cy={cy} r={size * 0.07} fill="#FEF08A" />
    </Svg>
  );
}

function DaisySVG({ size }: { size: number }) {
  const cx = size / 2, cy = size * 0.36;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={cy + size * 0.14} x2={cx} y2={size * 0.98} stroke="#4A7C59" strokeWidth={size * 0.065} strokeLinecap="round" />
      <Ellipse cx={cx + size * 0.16} cy={size * 0.62} rx={size * 0.12} ry={size * 0.05} fill="#5C9E6E" transform={`rotate(32 ${cx + size * 0.16} ${size * 0.62})`} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
        const px = cx + Math.cos(a) * size * 0.21;
        const py = cy + Math.sin(a) * size * 0.21;
        return <Ellipse key={i} cx={px} cy={py} rx={size * 0.14} ry={size * 0.06} fill="#FAFAFA" transform={`rotate(${(i * 36)} ${px} ${py})`} />;
      })}
      <Circle cx={cx} cy={cy} r={size * 0.13} fill="#F59E0B" />
      <Circle cx={cx} cy={cy} r={size * 0.07} fill="#D97706" />
    </Svg>
  );
}

function BluebellSVG({ size }: { size: number }) {
  const cx = size / 2;
  const bx = cx + size * 0.06, by = size * 0.38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={`M ${cx} ${size * 0.98} Q ${cx + size * 0.08} ${size * 0.6} ${bx} ${by + size * 0.1}`} stroke="#4A7C59" strokeWidth={size * 0.065} fill="none" strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.08} cy={size * 0.68} rx={size * 0.1} ry={size * 0.044} fill="#5C9E6E" transform={`rotate(-25 ${cx - size * 0.08} ${size * 0.68})`} />
      <Path d={`M ${bx - size * 0.14} ${by} Q ${bx - size * 0.19} ${by + size * 0.2} ${bx} ${by + size * 0.24} Q ${bx + size * 0.19} ${by + size * 0.2} ${bx + size * 0.14} ${by} Z`} fill="#818CF8" />
      <Ellipse cx={bx} cy={by} rx={size * 0.14} ry={size * 0.06} fill="#A5B4FC" />
    </Svg>
  );
}

function LavenderSVG({ size }: { size: number }) {
  const offsets = [-size * 0.13, 0, size * 0.13];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {offsets.map((ox, si) => {
        const sx = size / 2 + ox;
        return (
          <G key={si}>
            <Line x1={sx} y1={size * 0.95} x2={sx} y2={size * 0.22} stroke="#4A7C59" strokeWidth={size * 0.045} strokeLinecap="round" />
            {[0.22, 0.31, 0.40, 0.49].map((yf, j) => (
              <G key={j}>
                <Ellipse cx={sx - size * 0.055} cy={size * yf} rx={size * 0.055} ry={size * 0.032} fill="#C4B5FD" transform={`rotate(-20 ${sx - size * 0.055} ${size * yf})`} />
                <Ellipse cx={sx + size * 0.055} cy={size * yf} rx={size * 0.055} ry={size * 0.032} fill="#C4B5FD" transform={`rotate(20 ${sx + size * 0.055} ${size * yf})`} />
              </G>
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

function PoppySVG({ size }: { size: number }) {
  const cx = size / 2, cy = size * 0.36;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={cy + size * 0.15} x2={cx} y2={size * 0.98} stroke="#4A7C59" strokeWidth={size * 0.07} strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.15} cy={size * 0.65} rx={size * 0.13} ry={size * 0.052} fill="#5C9E6E" transform={`rotate(-40 ${cx - size * 0.15} ${size * 0.65})`} />
      {[0, 90, 180, 270].map((deg, i) => {
        const a = deg * Math.PI / 180;
        const px = cx + Math.cos(a) * size * 0.17;
        const py = cy + Math.sin(a) * size * 0.17;
        return <Ellipse key={i} cx={px} cy={py} rx={size * 0.155} ry={size * 0.11} fill="#EF4444" transform={`rotate(${deg} ${px} ${py})`} />;
      })}
      <Circle cx={cx} cy={cy} r={size * 0.095} fill="#111827" />
      <Circle cx={cx} cy={cy} r={size * 0.05} fill="#374151" />
    </Svg>
  );
}

function MoonflowerSVG({ size }: { size: number }) {
  const cx = size / 2, cy = size * 0.38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={cy + size * 0.15} x2={cx} y2={size * 0.98} stroke="#4A7C59" strokeWidth={size * 0.065} strokeLinecap="round" />
      <Ellipse cx={cx + size * 0.14} cy={size * 0.62} rx={size * 0.12} ry={size * 0.05} fill="#5C9E6E" transform={`rotate(30 ${cx + size * 0.14} ${size * 0.62})`} />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const a = (deg - 90) * Math.PI / 180;
        const px = cx + Math.cos(a) * size * 0.15;
        const py = cy + Math.sin(a) * size * 0.15;
        return <Ellipse key={i} cx={px} cy={py} rx={size * 0.105} ry={size * 0.058} fill="#EDE9FE" transform={`rotate(${deg} ${px} ${py})`} />;
      })}
      <Circle cx={cx} cy={cy} r={size * 0.11} fill="#DDD6FE" />
      <Path d={`M ${cx - size * 0.055} ${cy - size * 0.06} A ${size * 0.085} ${size * 0.085} 0 1 1 ${cx - size * 0.055} ${cy + size * 0.06}`} fill="#C4B5FD" />
    </Svg>
  );
}

function TulipSVG({ size, fillColor = '#FAFAFA' }: { size: number; fillColor?: string }) {
  const cx = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={size * 0.52} x2={cx} y2={size * 0.98} stroke="#4A7C59" strokeWidth={size * 0.07} strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.14} cy={size * 0.7} rx={size * 0.12} ry={size * 0.05} fill="#5C9E6E" transform={`rotate(-35 ${cx - size * 0.14} ${size * 0.7})`} />
      <Path d={`M ${cx} ${size * 0.52} Q ${cx - size * 0.23} ${size * 0.36} ${cx - size * 0.09} ${size * 0.19} Q ${cx} ${size * 0.28} ${cx} ${size * 0.52}`} fill={fillColor} />
      <Path d={`M ${cx} ${size * 0.52} Q ${cx + size * 0.23} ${size * 0.36} ${cx + size * 0.09} ${size * 0.19} Q ${cx} ${size * 0.28} ${cx} ${size * 0.52}`} fill={fillColor} />
      <Path d={`M ${cx - size * 0.1} ${size * 0.52} Q ${cx} ${size * 0.24} ${cx + size * 0.1} ${size * 0.52}`} fill={fillColor} opacity={0.82} />
    </Svg>
  );
}

function SproutSVG({ size }: { size: number }) {
  const cx = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={`M ${cx} ${size * 0.98} Q ${cx - size * 0.04} ${size * 0.65} ${cx} ${size * 0.44}`} stroke="#4A7C59" strokeWidth={size * 0.07} fill="none" strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.15} cy={size * 0.5} rx={size * 0.17} ry={size * 0.09} fill="#6EE7B7" transform={`rotate(-30 ${cx - size * 0.15} ${size * 0.5})`} />
      <Ellipse cx={cx + size * 0.12} cy={size * 0.63} rx={size * 0.13} ry={size * 0.07} fill="#6EE7B7" transform={`rotate(25 ${cx + size * 0.12} ${size * 0.63})`} />
    </Svg>
  );
}

function MistFlowerSVG({ size }: { size: number }) {
  const cx = size / 2, cy = size * 0.38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={cx} y1={cy + size * 0.15} x2={cx} y2={size * 0.98} stroke="#6B7280" strokeWidth={size * 0.06} strokeLinecap="round" />
      <Ellipse cx={cx - size * 0.13} cy={size * 0.66} rx={size * 0.11} ry={size * 0.044} fill="#9CA3AF" transform={`rotate(-30 ${cx - size * 0.13} ${size * 0.66})`} />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i * Math.PI * 2) / 14;
        const r = size * (0.1 + 0.075 * (i % 2));
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        return <Circle key={i} cx={px} cy={py} r={size * 0.045} fill="#CBD5E1" opacity={0.78} />;
      })}
      <Circle cx={cx} cy={cy} r={size * 0.065} fill="#E2E8F0" />
    </Svg>
  );
}

function SeedlingSVG({ size }: { size: number }) {
  const cx = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Ellipse cx={cx} cy={size * 0.88} rx={size * 0.18} ry={size * 0.07} fill="#8B6914" opacity={0.5} />
      <Path d={`M ${cx} ${size * 0.88} L ${cx} ${size * 0.6}`} stroke="#4A7C59" strokeWidth={size * 0.06} strokeLinecap="round" />
      <Ellipse cx={cx} cy={size * 0.56} rx={size * 0.13} ry={size * 0.13} fill="#A3E635" opacity={0.9} />
    </Svg>
  );
}

// ─── Flower component map ─────────────────────────────────────────────────────
type FlowerCompProps = { size: number };
const FLOWER_COMPS: Record<string, React.FC<FlowerCompProps>> = {
  happy:      ({ size }) => <SunflowerSVG size={size} />,
  excited:    ({ size }) => <DaisySVG size={size} />,
  calm:       ({ size }) => <ForgetMeNotSVG size={size} />,
  sad:        ({ size }) => <BluebellSVG size={size} />,
  anxious:    ({ size }) => <LavenderSVG size={size} />,
  angry:      ({ size }) => <PoppySVG size={size} />,
  tired:      ({ size }) => <MoonflowerSVG size={size} />,
  neutral:    ({ size }) => <TulipSVG size={size} fillColor="#F1F5F9" />,
  grateful:   ({ size }) => <TulipSVG size={size} fillColor="#FDA4AF" />,
  hopeful:    ({ size }) => <SproutSVG size={size} />,
  melancholy: ({ size }) => <MistFlowerSVG size={size} />,
};

const MOOD_LABELS: Record<string, string> = {
  happy: 'Sunflower', excited: 'Daisy', calm: 'Forget-Me-Not',
  sad: 'Bluebell', anxious: 'Lavender', angry: 'Poppy',
  tired: 'Moonflower', neutral: 'White Tulip', grateful: 'Pink Tulip',
  hopeful: 'Sprout', melancholy: 'Mist Flower',
};

// ─── GardenFlower ─────────────────────────────────────────────────────────────
type GardenFlowerProps = {
  entry: DiaryEntry;
  canvasW: number;
  onPress: (e: DiaryEntry) => void;
  isMemory?: boolean;
};

function GardenFlower({ entry, canvasW, onPress, isMemory }: GardenFlowerProps) {
  const sway = useRef(new Animated.Value(0)).current;
  const mood = entry.mood || 'neutral';
  const size = getFlowerSize(entry);
  const zone = MOOD_ZONES[mood] ?? MOOD_ZONES['neutral'];

  const r0 = seededRandom(entry.id, 0);
  const r1 = seededRandom(entry.id, 1);
  const r2 = seededRandom(entry.id, 2);
  const r3 = seededRandom(entry.id, 3);

  const xFraction = zone.cx + (r0 - 0.5) * zone.spread * 2;
  const x = Math.max(size * 0.6, Math.min(canvasW - size * 0.6, xFraction * canvasW));
  const yJitter = r1 * 28;
  const topY = FLOOR_Y - size - yJitter;

  const FlowerComp = FLOWER_COMPS[mood] ?? (({ size: s }) => <TulipSVG size={s} />);

  useEffect(() => {
    const delay = r2 * 1800;
    const duration = 1800 + r3 * 1200;
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration, useNativeDriver: true, easing: (t) => Math.sin(t * Math.PI) }),
          Animated.timing(sway, { toValue: -1, duration, useNativeDriver: true, easing: (t) => Math.sin(t * Math.PI) }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });

  return (
    <TouchableOpacity
      style={[styles.flowerAbs, { left: x - size / 2, top: topY }]}
      onPress={() => onPress(entry)}
      activeOpacity={0.82}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <FlowerComp size={size} />
      </Animated.View>
      {isMemory ? (
        <View style={styles.glowDot} />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Weather Overlay ──────────────────────────────────────────────────────────
function WeatherOverlay({ weather, canvasW }: { weather: Weather; canvasW: number }) {
  const rainAnim = useRef(new Animated.Value(0)).current;
  const cloudAnim = useRef(new Animated.Value(0)).current;
  const sunAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (weather === 'rainy' || weather === 'stormy') {
      Animated.loop(Animated.timing(rainAnim, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    }
    if (weather === 'cloudy' || weather === 'windy' || weather === 'stormy') {
      Animated.loop(Animated.sequence([
        Animated.timing(cloudAnim, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(cloudAnim, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])).start();
    }
    if (weather === 'sunny') {
      Animated.loop(Animated.sequence([
        Animated.timing(sunAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(sunAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])).start();
    }
  }, [weather]);

  const rainY = rainAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, FLOOR_Y] });
  const cloudX = cloudAnim.interpolate({ inputRange: [0, 1], outputRange: [0, canvasW * 0.15] });
  const sunOpacity = sunAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  if (weather === 'sunny') {
    return (
      <Animated.View style={[styles.overlay, { opacity: sunOpacity }]} pointerEvents="none">
        <Svg width={canvasW} height={FLOOR_Y}>
          <Circle cx={canvasW * 0.88} cy={50} r={38} fill="#FDE68A" opacity={0.85} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI * 2) / 12;
            const x1 = canvasW * 0.88 + Math.cos(a) * 44;
            const y1 = 50 + Math.sin(a) * 44;
            const x2 = canvasW * 0.88 + Math.cos(a) * 60;
            const y2 = 50 + Math.sin(a) * 60;
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FDE68A" strokeWidth={3} opacity={0.6} />;
          })}
        </Svg>
      </Animated.View>
    );
  }

  if (weather === 'rainy' || weather === 'stormy') {
    const drops = Array.from({ length: 20 }, (_, i) => ({
      x: (i / 20) * canvasW + seededRandom('rain', i) * (canvasW / 20),
    }));
    return (
      <Animated.View style={[styles.overlay, { transform: [{ translateY: rainY }] }]} pointerEvents="none">
        <Svg width={canvasW} height={FLOOR_Y}>
          {drops.map((d, i) => (
            <Line key={i} x1={d.x} y1={i * 22 % FLOOR_Y} x2={d.x + 2} y2={(i * 22 + 14) % FLOOR_Y}
              stroke="#93C5FD" strokeWidth={1.5} opacity={0.55} />
          ))}
        </Svg>
      </Animated.View>
    );
  }

  if (weather === 'cloudy' || weather === 'windy') {
    return (
      <Animated.View style={[styles.overlay, { transform: [{ translateX: cloudX }] }]} pointerEvents="none">
        <Svg width={canvasW + 100} height={FLOOR_Y}>
          {[
            { cx: canvasW * 0.2, cy: 55, r: 34 },
            { cx: canvasW * 0.35, cy: 45, r: 44 },
            { cx: canvasW * 0.5, cy: 62, r: 30 },
            { cx: canvasW * 0.7, cy: 40, r: 48 },
            { cx: canvasW * 0.85, cy: 58, r: 36 },
          ].map((c, i) => (
            <G key={i}>
              <Circle cx={c.cx - 22} cy={c.cy + 8} r={c.r * 0.7} fill="#E2E8F0" opacity={0.55} />
              <Circle cx={c.cx} cy={c.cy} r={c.r} fill="#E2E8F0" opacity={0.55} />
              <Circle cx={c.cx + 22} cy={c.cy + 8} r={c.r * 0.75} fill="#E2E8F0" opacity={0.55} />
            </G>
          ))}
        </Svg>
      </Animated.View>
    );
  }

  if (weather === 'night') {
    return (
      <View style={[styles.overlay, { backgroundColor: 'rgba(15,27,68,0.35)' }]} pointerEvents="none">
        <Svg width={canvasW} height={FLOOR_Y}>
          <Circle cx={canvasW * 0.85} cy={44} r={22} fill="#FEF3C7" opacity={0.9} />
          <Circle cx={canvasW * 0.85 + 14} cy={34} r={16} fill="#1e3a5f" opacity={0.95} />
          {Array.from({ length: 22 }, (_, i) => (
            <Circle key={i} cx={seededRandom('star', i) * canvasW} cy={seededRandom('star', i + 100) * FLOOR_Y * 0.65}
              r={1 + seededRandom('star', i + 50)} fill="#FEF9C3" opacity={0.8} />
          ))}
        </Svg>
      </View>
    );
  }

  return null;
}

// ─── Milestone Decorations ────────────────────────────────────────────────────
function MilestoneDecor({ count, canvasW }: { count: number; canvasW: number }) {
  if (count < 10) return null;
  const groundTop = FLOOR_Y;
  return (
    <Svg width={canvasW} height={GROUND_H} style={{ position: 'absolute', top: groundTop, left: 0 }}>
      {count >= 10 ? (
        Array.from({ length: Math.min(count, 16) }, (_, i) => (
          <Ellipse key={i} cx={canvasW * 0.15 + i * (canvasW * 0.65 / 16)} cy={22}
            rx={14} ry={10} fill="#9CA3AF" opacity={0.65} />
        ))
      ) : null}
      {count >= 50 ? (
        <G>
          <Rect x={canvasW * 0.45} y={4} width={8} height={34} rx={4} fill="#8B6914" />
          <Rect x={canvasW * 0.55} y={4} width={8} height={34} rx={4} fill="#8B6914" />
          <Path d={`M ${canvasW * 0.42} 4 Q ${canvasW * 0.5} -10 ${canvasW * 0.58} 4`} stroke="#8B6914" strokeWidth={6} fill="none" />
        </G>
      ) : null}
      {count >= 100 ? (
        <Ellipse cx={canvasW * 0.5} cy={42} rx={canvasW * 0.1} ry={18} fill="#7EC8E3" opacity={0.55} />
      ) : null}
    </Svg>
  );
}

// ─── Nimbus Garden Visitor ─────────────────────────────────────────────────────
function NimbusVisitor({ canvasW }: { canvasW: number }) {
  const posX = useRef(new Animated.Value(-60)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(posX, {
        toValue: canvasW + 60,
        duration: 14000,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 4000);
    return () => clearTimeout(timer);
  }, [canvasW]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.nimbusVisitor, { transform: [{ translateX: posX }] }]} pointerEvents="none">
      <NimbusBird size={48} />
    </Animated.View>
  );
}

// ─── Flower Detail Modal ──────────────────────────────────────────────────────
function FlowerModal({ entry, onClose }: { entry: DiaryEntry | null; onClose: () => void }) {
  const colors = useColors();
  if (!entry) return null;
  const mood = entry.mood || 'neutral';
  const FlowerComp = FLOWER_COMPS[mood] ?? (({ size: s }) => <TulipSVG size={s} />);
  const moodOption = MOOD_OPTIONS.find(m => m.key === mood);
  const flowerName = MOOD_LABELS[mood] ?? 'Flower';
  const dateStr = (() => {
    const raw = entry.createdAt;
    const d: Date = raw && typeof (raw as any).toDate === 'function'
      ? (raw as any).toDate()
      : raw instanceof Date ? raw : new Date(raw as any);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  })();

  return (
    <Modal transparent animationType="fade" visible={!!entry} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={styles.modalFlowerRow}>
            <FlowerComp size={80} />
          </View>
          <Text style={[styles.modalFlowerName, { color: colors.navy }]}>{flowerName}</Text>
          <Text style={[styles.modalMood, { color: colors.textMuted }]}>
            {moodOption ? `${moodOption.emoji} ${moodOption.label}` : mood}
          </Text>
          <Text style={[styles.modalDate, { color: colors.textLight }]}>{dateStr}</Text>
          {entry.title ? (
            <Text style={[styles.modalTitle, { color: colors.navy }]}>{entry.title}</Text>
          ) : null}
          {entry.content ? (
            <Text style={[styles.modalContent, { color: colors.text }]} numberOfLines={5}>
              {entry.content}
            </Text>
          ) : null}
          {entry.isFavorite ? (
            <View style={styles.memoryTag}>
              <Ionicons name="heart" size={13} color="#F472B6" />
              <Text style={styles.memoryTagText}>Memory Bloom</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primary + '22' }]} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: colors.primary }]}>Back to garden</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type TimeFilter = 'week' | 'month' | 'year' | 'all';

export default function GardenScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diary } = useAppStore();
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const season = useMemo(() => getSeason(), []);
  const skyColors = SEASON_SKY[season];
  const groundColors = SEASON_GROUND[season];
  const topPad = Platform.OS === 'web' ? 64 : insets.top;

  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<TimeFilter, number> = {
      week:  7 * 86400000,
      month: 30 * 86400000,
      year:  365 * 86400000,
      all:   Infinity,
    };
    const cutoff = cutoffs[filter];
    return diary.filter((e) => {
      if (!e.mood) return false;
      const raw = e.createdAt;
      const d: Date = raw && typeof (raw as any).toDate === 'function'
        ? (raw as any).toDate()
        : raw instanceof Date ? raw : new Date(raw as any);
      return now - d.getTime() <= cutoff;
    });
  }, [diary, filter]);

  const latestWeather = useMemo(() => {
    const withWeather = diary.filter(e => e.weather);
    return withWeather.length > 0 ? parseWeather(withWeather[0].weather) : 'clear';
  }, [diary]);

  const canvasW = useMemo(
    () => Math.max(SW * 1.8, filteredEntries.length * 65 + 300),
    [filteredEntries.length]
  );

  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filteredEntries) {
      if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
    }
    return counts;
  }, [filteredEntries]);

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantFlower = dominantMood ? MOOD_LABELS[dominantMood] : null;

  const handleFlowerPress = useCallback((entry: DiaryEntry) => {
    setSelectedEntry(entry);
  }, []);

  const FILTER_LABELS: { key: TimeFilter; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[skyColors[0], skyColors[1]]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerInner}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.navy }]}>🌸 Mood Garden</Text>
            {dominantFlower ? (
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                {filteredEntries.length} flower{filteredEntries.length !== 1 ? 's' : ''} · mostly {dominantFlower}
              </Text>
            ) : (
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your emotional garden</Text>
            )}
          </View>
          <View style={[styles.seasonBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.seasonText, { color: colors.textMuted }]}>
              {season === 'spring' ? '🌸 Spring' : season === 'summer' ? '☀️ Summer' : season === 'autumn' ? '🍂 Autumn' : '❄️ Winter'}
            </Text>
          </View>
        </View>

        {/* Timeline filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_LABELS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filter === key && { backgroundColor: colors.primary }]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterChipText, { color: filter === key ? '#fff' : colors.textMuted }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ── Garden Canvas ── */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <SeedlingSVG size={80} />
          <NimbusBird size={96} />
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>Every garden begins</Text>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>with a single seed.</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Write your first Dear Me entry with a mood to plant your first flower.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gardenScroll} bounces>
          <View style={[styles.gardenCanvas, { width: canvasW, height: GARDEN_H }]}>
            {/* Sky */}
            <LinearGradient
              colors={[skyColors[0], skyColors[1], skyColors[2]]}
              style={[styles.sky, { height: FLOOR_Y }]}
            />

            {/* Weather overlay */}
            <WeatherOverlay weather={latestWeather} canvasW={canvasW} />

            {/* Ground */}
            <LinearGradient
              colors={[groundColors[0], groundColors[1]]}
              style={[styles.ground, { top: FLOOR_Y }]}
            />

            {/* Milestone decorations */}
            <MilestoneDecor count={filteredEntries.length} canvasW={canvasW} />

            {/* Flowers */}
            {filteredEntries.map((entry) => (
              <GardenFlower
                key={entry.id}
                entry={entry}
                canvasW={canvasW}
                onPress={handleFlowerPress}
                isMemory={entry.isFavorite}
              />
            ))}

            {/* Nimbus visitor */}
            <NimbusVisitor canvasW={canvasW} />
          </View>
        </ScrollView>
      )}

      {/* ── Stats bar ── */}
      {filteredEntries.length > 0 ? (
        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([mood, count]) => {
              const opt = MOOD_OPTIONS.find(m => m.key === mood);
              return (
                <View key={mood} style={styles.statItem}>
                  <Text style={styles.statEmoji}>{opt?.emoji ?? '🌸'}</Text>
                  <Text style={[styles.statCount, { color: colors.navy }]}>{count}</Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>
                    {opt?.label ?? mood}
                  </Text>
                </View>
              );
            })}
        </View>
      ) : null}

      {/* ── Flower Detail Modal ── */}
      <FlowerModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  seasonBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  seasonText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  filterChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  gardenScroll: { flex: 1 },
  gardenCanvas: { position: 'relative', overflow: 'hidden' },
  sky: { position: 'absolute', top: 0, left: 0, right: 0 },
  ground: {
    position: 'absolute', left: 0, right: 0,
    height: GROUND_H, borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, height: FLOOR_Y, overflow: 'hidden' },
  flowerAbs: { position: 'absolute' },
  glowDot: {
    position: 'absolute', top: 2, right: 2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F472B6',
  },
  nimbusVisitor: {
    position: 'absolute', top: FLOOR_Y - 72, left: 0,
  },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginTop: 4 },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12,
    paddingHorizontal: 16, borderTopWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statEmoji: { fontSize: 18 },
  statCount: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Nunito_400Regular' },
  modalBg: {
    flex: 1, backgroundColor: 'rgba(15,27,68,0.42)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 360, borderRadius: 28, padding: 28, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  modalFlowerRow: { marginBottom: 8 },
  modalFlowerName: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  modalMood: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  modalDate: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  modalTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center', marginTop: 8 },
  modalContent: {
    fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center',
    lineHeight: 22, color: '#6B7280',
  },
  memoryTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FDF2F8', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  memoryTagText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: '#F472B6' },
  closeBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  closeBtnText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
});
