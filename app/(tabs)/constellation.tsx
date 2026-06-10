import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  Animated, Modal, Platform, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line as SvgLine } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { deleteStar, Star, StarType } from '@/lib/firestore';
import NimbusBird from '@/components/NimbusBird';
import { format } from '@/lib/dateUtils';

// ── Star visual config ────────────────────────────────────────────────────────
const STAR_CONFIG: Record<StarType, {
  color: string; size: number; emoji: string;
  name: string; lineColor: string; nimbusNote: string;
}> = {
  calm: {
    color: '#8ECFFF', size: 9, emoji: '🌙',
    name: 'The Quiet Places', lineColor: '#8ECFFF45',
    nimbusNote: 'These moments of stillness shaped you quietly.',
  },
  breakthrough: {
    color: '#FFFAAA', size: 13, emoji: '✨',
    name: 'Light Bursts', lineColor: '#FFFAAA45',
    nimbusNote: 'Something opened up in these moments.',
  },
  emotional: {
    color: '#A0AAFF', size: 9, emoji: '💧',
    name: 'The Deep Waters', lineColor: '#A0AAFF45',
    nimbusNote: 'You felt deeply here. That takes courage.',
  },
  growth: {
    color: '#8DEBB8', size: 9, emoji: '🌿',
    name: 'Growing Season', lineColor: '#8DEBB845',
    nimbusNote: 'I see you reaching toward something.',
  },
  intense: {
    color: '#FFB070', size: 11, emoji: '🔥',
    name: 'Burning Bright', lineColor: '#FFB07045',
    nimbusNote: 'These moments burned with something real.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = (((h << 5) + h) ^ id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function starPos(id: string, cw: number, ch: number) {
  const h = hashId(id);
  return {
    x: ((h % 7919) / 7919) * (cw - 80) + 40,
    y: (((h >>> 13) % 7919) / 7919) * (ch - 100) + 50,
  };
}

const AMBIENT = Array.from({ length: 55 }, (_, i) => ({
  key: `a${i}`,
  xR: ((hashId(`amb_${i}`) % 9973) / 9973),
  yR: (((hashId(`amb_${i}`) >>> 13) % 9973) / 9973),
  sz: 1 + (hashId(`amb_${i}`) % 2) * 0.5,
  op: 0.06 + ((hashId(`amb_${i}`) >> 3) % 4) * 0.04,
}));

function getNimbusNote(stars: Star[]): string {
  const n = stars.length;
  if (n === 0) return '';
  if (n === 1) return 'Your first star. Your story is beginning to light up the sky.';
  const byType = Object.fromEntries(
    (['calm','breakthrough','emotional','growth','intense'] as StarType[]).map(t => [
      t, stars.filter(s => s.type === t).length,
    ])
  ) as Record<StarType, number>;
  const constellations = Object.values(byType).filter(v => v > 0).length;
  if (byType.breakthrough > n * 0.4) return "I notice a lot of light bursts in your sky. Something has been opening up for you.";
  if (byType.emotional > n * 0.4) return "Your sky holds a lot of depth. You feel things deeply — and that matters.";
  if (byType.calm > n * 0.4) return "There's a quiet beauty here. These peaceful moments shaped you.";
  if (byType.growth > n * 0.4) return "I see a lot of growing happening in your sky. This part is very active.";
  if (constellations >= 3) return "These moments seem connected in how you were feeling. I notice a pattern forming here.";
  return `${n} star${n > 1 ? 's' : ''} in your sky. Each one is a piece of your becoming.`;
}

// ── Animated star dot ─────────────────────────────────────────────────────────
interface StarDotProps {
  star: Star; canvasW: number; canvasH: number;
  selected: boolean; onPress: () => void;
}

function StarDot({ star, canvasW, canvasH, selected, onPress }: StarDotProps) {
  const cfg = STAR_CONFIG[star.type];
  const twinkle = useRef(new Animated.Value(0.65)).current;
  const pulseSc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const h = hashId(star.id);
    const dur = 1600 + (h % 2400);
    const delay = h % 2000;

    const twinkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.3, duration: dur, useNativeDriver: true }),
      ])
    );

    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (star.type === 'intense') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseSc, { toValue: 1.3, duration: 850, useNativeDriver: true }),
          Animated.timing(pulseSc, { toValue: 0.85, duration: 850, useNativeDriver: true }),
        ])
      );
    }

    const t = setTimeout(() => {
      twinkleLoop.start();
      pulseLoop?.start();
    }, delay);

    return () => {
      clearTimeout(t);
      twinkleLoop.stop();
      pulseLoop?.stop();
    };
  }, []);

  const { x, y } = starPos(star.id, canvasW, canvasH);
  const r = cfg.size + (selected ? 3 : 0);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: cfg.color,
        opacity: twinkle,
        transform: [{ scale: pulseSc }],
        shadowColor: cfg.color,
        shadowRadius: selected ? 18 : 10,
        shadowOpacity: 1,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
      }}
    >
      {selected && (
        <View style={{
          position: 'absolute',
          left: -r * 0.6, top: -r * 0.6,
          width: r * 3.2, height: r * 3.2,
          borderRadius: r * 1.6,
          borderWidth: 1.5,
          borderColor: cfg.color + '70',
        }} />
      )}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={onPress}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      />
    </Animated.View>
  );
}

// ── SVG constellation lines ───────────────────────────────────────────────────
function ConstellationLines({ stars, canvasW, canvasH }: { stars: Star[]; canvasW: number; canvasH: number }) {
  const segments: React.ReactNode[] = [];
  const TYPES: StarType[] = ['calm', 'breakthrough', 'emotional', 'growth', 'intense'];

  TYPES.forEach(type => {
    const group = stars
      .filter(s => s.type === type)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (group.length < 2) return;
    const cfg = STAR_CONFIG[type];
    for (let i = 0; i < group.length - 1; i++) {
      const a = starPos(group[i].id, canvasW, canvasH);
      const b = starPos(group[i + 1].id, canvasW, canvasH);
      segments.push(
        <SvgLine
          key={`${group[i].id}-${group[i + 1].id}`}
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={cfg.lineColor}
          strokeWidth={1}
          strokeDasharray="4 7"
        />
      );
    }
  });

  return (
    <Svg
      width={canvasW}
      height={canvasH}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      {segments}
    </Svg>
  );
}

// ── Constellation name label ──────────────────────────────────────────────────
function ConstellationLabel({ type, stars, canvasW, canvasH, onPress }: {
  type: StarType; stars: Star[]; canvasW: number; canvasH: number; onPress: () => void;
}) {
  if (stars.length < 2) return null;
  const cfg = STAR_CONFIG[type];
  const positions = stars.map(s => starPos(s.id, canvasW, canvasH));
  const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
  const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length - 30;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ position: 'absolute', left: cx - 72, top: cy, width: 144, alignItems: 'center' }}
      activeOpacity={0.7}
    >
      <View style={{
        backgroundColor: '#08101ECC',
        borderWidth: 1, borderColor: cfg.color + '45',
        borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
      }}>
        <Text style={{ color: cfg.color, fontSize: 11, fontFamily: 'Nunito_700Bold', textAlign: 'center' }}>
          {cfg.emoji} {cfg.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Star detail modal ─────────────────────────────────────────────────────────
function StarModal({ star, onClose, onDelete }: {
  star: Star | null; onClose: () => void; onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    if (star) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 320, duration: 200, useNativeDriver: true }).start();
    }
  }, [!!star]);

  if (!star) return null;
  const cfg = STAR_CONFIG[star.type];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#00000055' }]} />
      </Pressable>
      <Animated.View style={[styles.starModalSheet, { borderColor: cfg.color + '35', transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.starModalHeader}>
          <View style={[styles.starModalIcon, { backgroundColor: cfg.color + '22' }]}>
            <Text style={styles.starModalIconText}>{cfg.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.starModalType, { color: cfg.color }]}>{cfg.name}</Text>
            <Text style={styles.starModalTitle}>{star.title || 'Untitled moment'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color="#8AAABF" />
          </TouchableOpacity>
        </View>

        {!!star.content && (
          <Text style={styles.starModalContent} numberOfLines={4}>{star.content}</Text>
        )}

        <Text style={styles.starModalDate}>
          {format(star.createdAt)}{star.mood ? `  ·  ${star.mood}` : ''}
        </Text>

        <View style={styles.starModalActions}>
          {star.sourceType === 'diary' && (
            <TouchableOpacity
              style={[styles.starModalBtn, { backgroundColor: cfg.color + '1A', borderColor: cfg.color + '35' }]}
              onPress={() => { onClose(); router.push(`/diary/${star.sourceId}` as any); }}
            >
              <Ionicons name="book-outline" size={15} color={cfg.color} />
              <Text style={[styles.starModalBtnText, { color: cfg.color }]}>View Entry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.starModalRemoveBtn]}
            onPress={() => { onDelete(star.id); onClose(); }}
          >
            <Ionicons name="star" size={15} color="#FF6B6B" />
            <Text style={styles.starModalRemoveText}>Remove</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.starModalHint}>Tap "Remove" to unstar this moment</Text>
      </Animated.View>
    </Modal>
  );
}

// ── Constellation group modal ─────────────────────────────────────────────────
function ConstellationModal({ type, stars, onClose, onSelectStar }: {
  type: StarType | null; stars: Star[];
  onClose: () => void; onSelectStar: (s: Star) => void;
}) {
  if (!type) return null;
  const cfg = STAR_CONFIG[type];
  const group = [...stars.filter(s => s.type === type)].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#00000065' }]} />
      </Pressable>
      <View style={[styles.constellationSheet, { borderColor: cfg.color + '35' }]}>
        <View style={[styles.constellationHeader, { borderBottomColor: '#ffffff10' }]}>
          <Text style={[styles.constellationTitle, { color: cfg.color }]}>{cfg.emoji} {cfg.name}</Text>
          <Text style={styles.constellationNote}>{cfg.nimbusNote}</Text>
          <Text style={styles.constellationCount}>{group.length} {group.length === 1 ? 'star' : 'stars'} in this constellation</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {group.map(s => (
            <TouchableOpacity
              key={s.id}
              onPress={() => { onClose(); setTimeout(() => onSelectStar(s), 120); }}
              style={[styles.constellationItem, { borderColor: cfg.color + '22' }]}
              activeOpacity={0.7}
            >
              <View style={[styles.constellationDot, { backgroundColor: cfg.color, shadowColor: cfg.color }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.constellationItemTitle}>{s.title || 'Untitled moment'}</Text>
                <Text style={styles.constellationItemDate}>{format(s.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#2A4A5E" />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={styles.constellationClose}>
          <Text style={styles.constellationCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ConstellationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: W, height: H } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const stars = useAppStore((s) => s.stars);

  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [selectedType, setSelectedType] = useState<StarType | null>(null);

  const CANVAS_H = Math.max(H * 0.85, stars.length * 120 + 340);
  const CANVAS_W = W;

  const nimbusNote = useMemo(() => getNimbusNote(stars), [stars]);

  const handleDeleteStar = async (id: string) => {
    if (!user) return;
    await deleteStar(user.uid, id);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)}
          style={{ padding: 6 }}
        >
          <Ionicons name="arrow-back" size={22} color="#8AAABF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Sky ✦</Text>
          <Text style={styles.headerSub}>
            {stars.length === 0
              ? 'Your story will light up over time'
              : `${stars.length} meaningful moment${stars.length !== 1 ? 's' : ''} starred`}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        {/* Sky canvas */}
        <View style={{ width: CANVAS_W, height: CANVAS_H, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#0D1A30', '#070E1A', '#050C18']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Ambient background stars */}
          {AMBIENT.map(a => (
            <View key={a.key} style={{
              position: 'absolute',
              left: a.xR * CANVAS_W,
              top: a.yR * CANVAS_H,
              width: a.sz,
              height: a.sz,
              borderRadius: a.sz / 2,
              backgroundColor: '#FFFFFF',
              opacity: a.op,
            }} />
          ))}

          {/* SVG connection lines */}
          <ConstellationLines stars={stars} canvasW={CANVAS_W} canvasH={CANVAS_H} />

          {/* Constellation name labels */}
          {(['calm','breakthrough','emotional','growth','intense'] as StarType[]).map(type => {
            const group = stars.filter(s => s.type === type);
            if (group.length < 2) return null;
            return (
              <ConstellationLabel
                key={type} type={type}
                stars={group} canvasW={CANVAS_W} canvasH={CANVAS_H}
                onPress={() => setSelectedType(type)}
              />
            );
          })}

          {/* User's stars */}
          {stars.map(star => (
            <StarDot
              key={star.id} star={star}
              canvasW={CANVAS_W} canvasH={CANVAS_H}
              selected={selectedStar?.id === star.id}
              onPress={() => setSelectedStar(star)}
            />
          ))}

          {/* Empty state */}
          {stars.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyStar} />
              <View style={styles.emptyContent}>
                <NimbusBird size={80} />
                <Text style={styles.emptyTitle}>Your story will light up over time</Text>
                <Text style={styles.emptySub}>
                  Open a diary entry and tap the{' '}
                  <Text style={{ color: '#8ECFFF' }}>✦</Text>
                  {' '}star icon to mark a meaningful moment.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Nimbus observation */}
        {stars.length > 0 && (
          <View style={styles.nimbusPanel}>
            <NimbusBird size={50} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.nimbusPanelLabel}>✦ Nimbus</Text>
              <Text style={styles.nimbusPanelText}>"{nimbusNote}"</Text>
            </View>
          </View>
        )}

        {/* Constellation legend */}
        {stars.length > 0 && (
          <View style={styles.legendSection}>
            <Text style={styles.legendTitle}>Constellations</Text>
            <View style={styles.legendGrid}>
              {(['calm','breakthrough','emotional','growth','intense'] as StarType[]).map(type => {
                const count = stars.filter(s => s.type === type).length;
                if (count === 0) return null;
                const cfg = STAR_CONFIG[type];
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => count >= 2 ? setSelectedType(type) : undefined}
                    style={[styles.legendItem, { backgroundColor: cfg.color + '12', borderColor: cfg.color + '28' }]}
                    activeOpacity={count >= 2 ? 0.7 : 1}
                  >
                    <View style={[styles.legendDot, { backgroundColor: cfg.color, shadowColor: cfg.color }]} />
                    <Text style={[styles.legendName, { color: cfg.color }]}>{cfg.emoji} {cfg.name}</Text>
                    <View style={[styles.legendBadge, { backgroundColor: cfg.color + '22' }]}>
                      <Text style={[styles.legendCount, { color: cfg.color }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <StarModal star={selectedStar} onClose={() => setSelectedStar(null)} onDelete={handleDeleteStar} />
      <ConstellationModal
        type={selectedType} stars={stars}
        onClose={() => setSelectedType(null)}
        onSelectStar={(s) => setSelectedStar(s)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070E1A' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: '#070E1A',
  },
  headerTitle: { color: '#E8F4FF', fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { color: '#2E5870', fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 1 },

  emptyState: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  emptyStar: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#8ECFFF',
    shadowColor: '#8ECFFF', shadowRadius: 14, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 },
    opacity: 0.6,
  },
  emptyContent: { alignItems: 'center', gap: 12, paddingHorizontal: 44 },
  emptyTitle: { color: '#7AABBF', fontSize: 15, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  emptySub: { color: '#2E4D60', fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },

  nimbusPanel: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#0D1A2E',
    borderRadius: 20, borderWidth: 1, borderColor: '#1A3050',
    padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  nimbusPanelLabel: {
    color: '#5BB8D4', fontSize: 11, fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  nimbusPanelText: {
    color: '#7AAEC8', fontSize: 14, fontFamily: 'Nunito_400Regular',
    lineHeight: 22, fontStyle: 'italic',
  },

  legendSection: { marginHorizontal: 20, marginTop: 16, gap: 10 },
  legendTitle: {
    color: '#1E3A4E', fontSize: 12, fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1,
  },
  legendDot: {
    width: 7, height: 7, borderRadius: 3.5,
    shadowRadius: 5, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  legendName: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  legendBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  legendCount: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold' },

  // Star modal
  starModalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D1730',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 14,
  },
  starModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  starModalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  starModalIconText: { fontSize: 22 },
  starModalType: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  starModalTitle: { color: '#E0F0FF', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  starModalContent: { color: '#7AAEC0', fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 21 },
  starModalDate: { color: '#3A5A70', fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  starModalActions: { flexDirection: 'row', gap: 10 },
  starModalBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 16, borderWidth: 1,
  },
  starModalBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  starModalRemoveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 13, paddingHorizontal: 20, borderRadius: 16,
    backgroundColor: '#FF6B6B18', borderWidth: 1, borderColor: '#FF6B6B35',
  },
  starModalRemoveText: { color: '#FF6B6B', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  starModalHint: { color: '#1E3A4E', fontSize: 12, fontFamily: 'Nunito_400Regular', textAlign: 'center' },

  // Constellation modal
  constellationSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D1730',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, maxHeight: '75%',
  },
  constellationHeader: {
    padding: 24, gap: 6,
    borderBottomWidth: 1,
  },
  constellationTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  constellationNote: { color: '#4A7A90', fontSize: 13, fontFamily: 'Nunito_400Regular', fontStyle: 'italic' },
  constellationCount: { color: '#2A4A60', fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 4 },
  constellationItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff08', borderRadius: 16,
    padding: 14, borderWidth: 1,
  },
  constellationDot: {
    width: 10, height: 10, borderRadius: 5,
    shadowRadius: 6, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  constellationItemTitle: { color: '#D8F0FF', fontSize: 14, fontFamily: 'Nunito_700Bold' },
  constellationItemDate: { color: '#2E5270', fontSize: 12, fontFamily: 'Nunito_400Regular' },
  constellationClose: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ffffff10' },
  constellationCloseText: { color: '#3A6A80', fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
});
