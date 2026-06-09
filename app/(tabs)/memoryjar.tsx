import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Platform, Animated,
} from 'react-native';
import Svg, { Rect, Circle, Path, Line, G, Defs, ClipPath, Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import {
  addMemorySlip, deleteMemorySlip, updateMemorySlip, MemorySlip,
} from '@/lib/firestore';
import NimbusBird from '@/components/NimbusBird';
import { MOOD_OPTIONS } from '@/constants/nimbus';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'Special Moment', emoji: '❤️' },
  { key: 'Achievement',    emoji: '🌟' },
  { key: 'Family',         emoji: '👨‍👩‍👧' },
  { key: 'Friendship',     emoji: '👯' },
  { key: 'Growth',         emoji: '🌱' },
  { key: 'Funny',          emoji: '😄' },
  { key: 'Reflection',     emoji: '🌙' },
  { key: 'Travel',         emoji: '✈️' },
  { key: 'School',         emoji: '📚' },
  { key: 'Photo Memory',   emoji: '📸' },
];

const SOURCE_ICONS: Record<string, string> = {
  diary:   'book-outline',
  unsocial:'planet-outline',
  unsent:  'mail-outline',
  todo:    'checkmark-circle-outline',
  study:   'school-outline',
  cycle:   'moon-outline',
  manual:  'star-outline',
};

const SLIP_COLORS = ['#FDE68A','#FDA4AF','#A5F3FC','#DDD6FE','#BBF7D0','#FCA5A5','#C4B5FD','#FDBA74','#F9A8D4','#6EE7B7'];

function rand(seed: string, i: number): number {
  let h = 0x811c9dc5;
  for (let ci = 0; ci < seed.length; ci++) h = Math.imul(h ^ seed.charCodeAt(ci), 0x01000193);
  h = Math.imul(h ^ i, 0x9e3779b9);
  return Math.abs(h) / 0x7fffffff;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Glass Jar SVG ────────────────────────────────────────────────────────────
function JarSVG({ count }: { count: number }) {
  const W = 200, H = 280;
  const BODY_X = 20, BODY_Y = 70, BODY_W = 160, BODY_H = 190;
  const NECK_X = 56, NECK_Y = 34, NECK_W = 88, NECK_H = 38;
  const LID_X = 45, LID_Y = 16, LID_W = 110, LID_H = 22;

  const maxVisible = 32;
  const visible = Math.min(count, maxVisible);
  const fillFrac = count === 0 ? 0 : Math.min(visible / maxVisible, 1);
  const fillH = fillFrac * (BODY_H - 16);
  const fillY = BODY_Y + BODY_H - fillH;

  const slips = Array.from({ length: visible }, (_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const rx = rand('slip' + i, 0);
    const ry = rand('slip' + i, 1);
    const rr = rand('slip' + i, 2);
    return {
      x: BODY_X + 12 + col * 36 + rx * 10 - 5,
      y: BODY_Y + BODY_H - 26 - row * 26 + ry * 6 - 3,
      color: SLIP_COLORS[i % SLIP_COLORS.length],
      rot: (rr - 0.5) * 22,
    };
  });

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <ClipPath id="bodyClip">
          <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} rx={22} />
        </ClipPath>
      </Defs>

      {/* Jar body background */}
      <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} rx={22} fill="rgba(219,234,254,0.12)" />

      {/* Fill level */}
      {fillH > 0 ? (
        <G clipPath="url(#bodyClip)">
          <Rect x={BODY_X} y={fillY} width={BODY_W} height={fillH + 8} fill="rgba(196,181,253,0.14)" />
          {slips.map((s, i) => (
            <G key={i} transform={`rotate(${s.rot} ${s.x + 14} ${s.y + 9})`}>
              <Rect x={s.x} y={s.y} width={28} height={18} rx={5} fill={s.color} opacity={0.9} />
              <Line x1={s.x + 5} y1={s.y + 7} x2={s.x + 23} y2={s.y + 7} stroke="rgba(0,0,0,0.14)" strokeWidth={1} />
              <Line x1={s.x + 5} y1={s.y + 12} x2={s.x + 18} y2={s.y + 12} stroke="rgba(0,0,0,0.09)" strokeWidth={1} />
            </G>
          ))}
        </G>
      ) : null}

      {/* Jar body outline on top */}
      <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} rx={22} fill="none" stroke="#93C5FD" strokeWidth={2.5} />

      {/* Jar ribs on neck */}
      <Rect x={NECK_X} y={NECK_Y} width={NECK_W} height={NECK_H} rx={8} fill="rgba(219,234,254,0.18)" stroke="#93C5FD" strokeWidth={2.5} />
      <Line x1={NECK_X + 6} y1={NECK_Y + 10} x2={NECK_X + NECK_W - 6} y2={NECK_Y + 10} stroke="#93C5FD" strokeWidth={1} opacity={0.45} />
      <Line x1={NECK_X + 6} y1={NECK_Y + 18} x2={NECK_X + NECK_W - 6} y2={NECK_Y + 18} stroke="#93C5FD" strokeWidth={1} opacity={0.45} />
      <Line x1={NECK_X + 6} y1={NECK_Y + 26} x2={NECK_X + NECK_W - 6} y2={NECK_Y + 26} stroke="#93C5FD" strokeWidth={1} opacity={0.45} />

      {/* Lid */}
      <Rect x={LID_X} y={LID_Y} width={LID_W} height={LID_H} rx={11} fill="#DDD6FE" stroke="#A78BFA" strokeWidth={2} />
      <Rect x={LID_X + 10} y={LID_Y + 5} width={LID_W - 20} height={LID_H - 10} rx={7} fill="rgba(255,255,255,0.22)" />

      {/* Glass shine on body */}
      <Rect x={BODY_X + 12} y={BODY_Y + 18} width={13} height={BODY_H * 0.42} rx={6} fill="white" opacity={0.18} />

      {/* Empty face if no memories */}
      {count === 0 ? (
        <G opacity={0.35}>
          <Circle cx={W / 2 - 12} cy={BODY_Y + BODY_H * 0.48} r={3.5} fill="#93C5FD" />
          <Circle cx={W / 2 + 12} cy={BODY_Y + BODY_H * 0.48} r={3.5} fill="#93C5FD" />
          <Path d={`M ${W / 2 - 13} ${BODY_Y + BODY_H * 0.48 + 14} Q ${W / 2} ${BODY_Y + BODY_H * 0.48 + 24} ${W / 2 + 13} ${BODY_Y + BODY_H * 0.48 + 14}`} stroke="#93C5FD" strokeWidth={2.5} fill="none" />
        </G>
      ) : null}
    </Svg>
  );
}

// ─── Slip Card ────────────────────────────────────────────────────────────────
type SlipCardProps = { slip: MemorySlip; onPress: () => void; onDelete: () => void; };
function SlipCard({ slip, onPress, onDelete }: SlipCardProps) {
  const colors = useColors();
  const cat = CATEGORIES.find(c => c.key === slip.category);
  const mood = MOOD_OPTIONS.find(m => m.key === slip.mood);
  const srcIcon = SOURCE_ICONS[slip.source] ?? 'star-outline';
  const colorIdx = SLIP_COLORS.indexOf(SLIP_COLORS[CATEGORIES.findIndex(c => c.key === slip.category) % SLIP_COLORS.length]);
  const slipColor = SLIP_COLORS[Math.abs(slip.id.charCodeAt(0) + slip.id.charCodeAt(1)) % SLIP_COLORS.length];

  return (
    <TouchableOpacity
      style={[styles.slipCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep, borderLeftColor: slipColor, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.slipTop}>
        <View style={[styles.slipCatBadge, { backgroundColor: slipColor + 'AA' }]}>
          <Text style={styles.slipCatEmoji}>{cat ? cat.emoji : '⭐'}</Text>
          <Text style={[styles.slipCatText, { color: colors.navy }]}>{slip.category}</Text>
        </View>
        <View style={styles.slipMeta}>
          {mood ? <Text style={styles.slipMoodEmoji}>{mood.emoji}</Text> : null}
          <Ionicons name={srcIcon as any} size={13} color={colors.textLight} />
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.slipTitle, { color: colors.navy }]} numberOfLines={1}>{slip.title}</Text>
      {slip.content ? (
        <Text style={[styles.slipPreview, { color: colors.textMuted }]} numberOfLines={2}>{slip.content}</Text>
      ) : null}
      <Text style={[styles.slipDate, { color: colors.textLight }]}>{slip.date}</Text>
    </TouchableOpacity>
  );
}

// ─── Pull Memory Modal ────────────────────────────────────────────────────────
function PullModal({ slip, onClose }: { slip: MemorySlip | null; onClose: () => void }) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (slip) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
    }
  }, [slip]);

  if (!slip) return null;
  const cat = CATEGORIES.find(c => c.key === slip.category);
  const mood = MOOD_OPTIONS.find(m => m.key === slip.mood);
  const slipColor = SLIP_COLORS[Math.abs((slip.id.charCodeAt(0) ?? 0) + (slip.id.charCodeAt(1) ?? 0)) % SLIP_COLORS.length];

  const savedDate = (() => {
    const d = slip.createdAt instanceof Date ? slip.createdAt : new Date(slip.createdAt as any);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
    const yrs = Math.floor(diffDays / 365);
    return `${yrs} year${yrs !== 1 ? 's' : ''} ago`;
  })();

  return (
    <Modal transparent animationType="none" visible={!!slip} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.pullCard, { backgroundColor: colors.surface, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.pullSlipTop, { backgroundColor: slipColor + '55' }]}>
              <Text style={styles.pullCatEmoji}>{cat ? cat.emoji : '⭐'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pullCategory, { color: colors.textMuted }]}>{slip.category}</Text>
                <Text style={[styles.pullTimeAgo, { color: colors.textLight }]}>{savedDate}</Text>
              </View>
              {mood ? <Text style={styles.pullMoodEmoji}>{mood.emoji}</Text> : null}
            </View>
            <View style={styles.pullBody}>
              <Text style={[styles.pullTitle, { color: colors.navy }]}>{slip.title}</Text>
              {slip.date ? (
                <Text style={[styles.pullDate, { color: colors.textLight }]}>{slip.date}</Text>
              ) : null}
              {slip.content ? (
                <Text style={[styles.pullContent, { color: colors.text }]}>{slip.content}</Text>
              ) : null}
              {slip.source !== 'manual' ? (
                <View style={styles.pullSource}>
                  <Ionicons name={SOURCE_ICONS[slip.source] as any ?? 'star-outline'} size={12} color={colors.textLight} />
                  <Text style={[styles.pullSourceText, { color: colors.textLight }]}>Saved from {slip.source}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={[styles.pullClose, { backgroundColor: colors.primary + '22' }]} onPress={onClose}>
              <Text style={[styles.pullCloseText, { color: colors.primary }]}>Put it back 🫙</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Add Memory Modal ─────────────────────────────────────────────────────────
type AddModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (slip: Omit<MemorySlip, 'id' | 'createdAt' | 'updatedAt'>) => void;
};
function AddModal({ visible, onClose, onSave }: AddModalProps) {
  const colors = useColors();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState('Special Moment');
  const [mood, setMood] = useState('');

  const reset = () => { setTitle(''); setContent(''); setDate(todayStr()); setCategory('Special Moment'); setMood(''); };

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Missing title', 'Give this memory a title.'); return; }
    onSave({ title: title.trim(), content: content.trim(), date, source: 'manual', category, mood: mood || undefined, photos: [], isFavorite: false });
    reset();
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.addCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.addTitle, { color: colors.navy }]}>Save a Memory 🫙</Text>

          <TextInput
            style={[styles.addInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            placeholder="Memory title..."
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <TextInput
            style={[styles.addTextarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            placeholder="What happened? What made it special?"
            placeholderTextColor={colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />

          <TextInput
            style={[styles.addInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor={colors.textLight}
            value={date}
            onChangeText={setDate}
          />

          <Text style={[styles.addLabel, { color: colors.textMuted }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catChip, category === c.key && { backgroundColor: colors.primary }]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.catChipText, { color: category === c.key ? '#fff' : colors.textMuted }]}>
                    {c.emoji} {c.key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.addLabel, { color: colors.textMuted }]}>Mood (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.catRow}>
              {MOOD_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodChip, mood === m.key && { backgroundColor: colors.lavender }]}
                  onPress={() => setMood(mood === m.key ? '' : m.key)}
                >
                  <Text style={styles.moodChipEmoji}>{m.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.addBtns}>
            <TouchableOpacity style={[styles.addCancel, { borderColor: colors.border }]} onPress={() => { reset(); onClose(); }}>
              <Text style={[styles.addCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addSave, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={styles.addSaveText}>Save Memory</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MemoryJarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const { memorySlips } = useAppStore();
  const topPad = Platform.OS === 'web' ? 64 : insets.top;

  const [filterCat, setFilterCat] = useState<string>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [pulledMemory, setPulledMemory] = useState<MemorySlip | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<MemorySlip | null>(null);

  const filteredSlips = useMemo(() => {
    if (filterCat === 'All') return memorySlips;
    return memorySlips.filter(s => s.category === filterCat);
  }, [memorySlips, filterCat]);

  // On This Day
  const onThisDaySlips = useMemo(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todaySuffix = `-${mm}-${dd}`;
    return memorySlips.filter(s => s.date.endsWith(todaySuffix) && s.date.slice(0, 4) !== String(today.getFullYear()));
  }, [memorySlips]);

  const handlePull = useCallback(() => {
    if (memorySlips.length === 0) return;
    const idx = Math.floor(Math.random() * memorySlips.length);
    setPulledMemory(memorySlips[idx]);
  }, [memorySlips]);

  const handleSave = useCallback(async (slip: Omit<MemorySlip, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    await addMemorySlip(user.uid, slip);
  }, [user]);

  const handleDelete = useCallback((slip: MemorySlip) => {
    if (!user) return;
    Alert.alert('Remove Memory', `Remove "${slip.title}" from the jar?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMemorySlip(user.uid, slip.id) },
    ]);
  }, [user]);

  const handleToggleFav = useCallback(async (slip: MemorySlip) => {
    if (!user) return;
    await updateMemorySlip(user.uid, slip.id, { isFavorite: !slip.isFavorite });
  }, [user]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of memorySlips) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [memorySlips]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={[colors.lavender + '60', colors.background]} style={[styles.header, { paddingTop: topPad + 6 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.navy }]}>🫙 Memory Jar</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {memorySlips.length === 0 ? 'Your digital keepsake box' : `${memorySlips.length} memor${memorySlips.length !== 1 ? 'ies' : 'y'} inside`}
            </Text>
          </View>
          <TouchableOpacity style={[styles.addFab, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 80 + 24 : insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Jar visualization */}
        <View style={styles.jarSection}>
          <JarSVG count={memorySlips.length} />
          {memorySlips.length > 0 ? (
            <TouchableOpacity style={[styles.pullBtn, { backgroundColor: colors.navy }]} onPress={handlePull} activeOpacity={0.85}>
              <Text style={styles.pullBtnText}>🎲 Pull a Memory</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.pullBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
              <Text style={styles.pullBtnText}>✨ Save First Memory</Text>
            </TouchableOpacity>
          )}
          {memorySlips.length === 0 ? (
            <View style={styles.emptyHint}>
              <NimbusBird size={56} />
              <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>
                Some moments deserve to be kept forever.
              </Text>
            </View>
          ) : null}
        </View>

        {/* On This Day */}
        {onThisDaySlips.length > 0 ? (
          <View style={[styles.onThisDay, { backgroundColor: colors.lavender + '30', borderColor: colors.lavenderDeep + '40' }]}>
            <View style={styles.onThisDayHeader}>
              <Ionicons name="calendar-outline" size={16} color={colors.lavenderDeep} />
              <Text style={[styles.onThisDayTitle, { color: colors.navy }]}>On This Day</Text>
            </View>
            {onThisDaySlips.map(slip => {
              const yr = slip.date.slice(0, 4);
              const diff = new Date().getFullYear() - parseInt(yr, 10);
              return (
                <TouchableOpacity key={slip.id} style={styles.onThisDayItem} onPress={() => setSelectedSlip(slip)} activeOpacity={0.8}>
                  <Text style={[styles.onThisDayYear, { color: colors.lavenderDeep }]}>
                    {diff} year{diff !== 1 ? 's' : ''} ago
                  </Text>
                  <Text style={[styles.onThisDaySlipTitle, { color: colors.navy }]} numberOfLines={1}>{slip.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Stats row */}
        {memorySlips.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsRow}>
            {CATEGORIES.filter(c => (catCounts[c.key] ?? 0) > 0).map(c => (
              <View key={c.key} style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={styles.statChipEmoji}>{c.emoji}</Text>
                <Text style={[styles.statChipCount, { color: colors.navy }]}>{catCounts[c.key]}</Text>
                <Text style={[styles.statChipLabel, { color: colors.textMuted }]}>{c.key}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Category filter */}
        {memorySlips.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            {['All', ...CATEGORIES.map(c => c.key)].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCat === cat && { backgroundColor: colors.primary }]}
                onPress={() => setFilterCat(cat)}
              >
                <Text style={[styles.filterChipText, { color: filterCat === cat ? '#fff' : colors.textMuted }]}>
                  {cat === 'All' ? '✨ All' : `${CATEGORIES.find(c => c.key === cat)?.emoji ?? ''} ${cat}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* Memory slips list */}
        {filteredSlips.length > 0 ? (
          <View style={styles.slipList}>
            {filteredSlips.map(slip => (
              <SlipCard
                key={slip.id}
                slip={slip}
                onPress={() => setSelectedSlip(slip)}
                onDelete={() => handleDelete(slip)}
              />
            ))}
          </View>
        ) : memorySlips.length > 0 ? (
          <View style={styles.emptyCat}>
            <Text style={[styles.emptyCatText, { color: colors.textLight }]}>No memories in this category yet.</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Pull a Memory Modal */}
      <PullModal slip={pulledMemory} onClose={() => setPulledMemory(null)} />

      {/* Selected slip detail */}
      <PullModal slip={selectedSlip} onClose={() => setSelectedSlip(null)} />

      {/* Add Memory Modal */}
      <AddModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  addFab: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },

  jarSection: { alignItems: 'center', paddingTop: 8, gap: 12 },
  pullBtn: {
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  pullBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
  emptyHint: { alignItems: 'center', gap: 8, marginTop: 4 },
  emptyMsg: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', maxWidth: 240, lineHeight: 20 },

  onThisDay: {
    borderRadius: 16, padding: 14, gap: 8, borderWidth: 1,
  },
  onThisDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onThisDayTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  onThisDayItem: { gap: 2 },
  onThisDayYear: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  onThisDaySlipTitle: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  statsScroll: { marginHorizontal: -16 },
  statsRow: { paddingHorizontal: 16, gap: 10 },
  statChip: {
    alignItems: 'center', gap: 2, padding: 10, borderRadius: 14,
    minWidth: 72,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statChipEmoji: { fontSize: 18 },
  statChipCount: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  statChipLabel: { fontSize: 9, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },

  filterScroll: { marginHorizontal: -16 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  filterChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  slipList: { gap: 10 },
  slipCard: {
    borderRadius: 16, padding: 14, gap: 6,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  slipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slipCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  slipCatEmoji: { fontSize: 11 },
  slipCatText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },
  slipMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slipMoodEmoji: { fontSize: 13 },
  slipTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  slipPreview: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  slipDate: { fontSize: 11, fontFamily: 'Nunito_400Regular' },

  emptyCat: { alignItems: 'center', paddingVertical: 32 },
  emptyCatText: { fontSize: 14, fontFamily: 'Nunito_400Regular' },

  // Modals
  modalBg: {
    flex: 1, backgroundColor: 'rgba(15,27,68,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  pullCard: {
    width: '100%', maxWidth: 380, borderRadius: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 14,
  },
  pullSlipTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  pullCatEmoji: { fontSize: 28 },
  pullCategory: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  pullTimeAgo: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  pullMoodEmoji: { fontSize: 24 },
  pullBody: { padding: 20, gap: 8 },
  pullTitle: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold', lineHeight: 26 },
  pullDate: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  pullContent: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 22 },
  pullSource: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pullSourceText: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  pullClose: {
    margin: 16, marginTop: 0, paddingVertical: 11, borderRadius: 18, alignItems: 'center',
  },
  pullCloseText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  addCard: {
    width: '100%', maxWidth: 400, borderRadius: 28, padding: 24, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 14,
    maxHeight: '90%',
  },
  addTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', marginBottom: 4, textAlign: 'center' },
  addLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  addInput: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Nunito_400Regular',
  },
  addTextarea: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Nunito_400Regular', minHeight: 90,
  },
  catRow: { flexDirection: 'row', gap: 8 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  catChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  moodChip: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  moodChipEmoji: { fontSize: 18 },
  addBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  addCancel: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 11, alignItems: 'center' },
  addCancelText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  addSave: { flex: 1.5, borderRadius: 16, paddingVertical: 11, alignItems: 'center' },
  addSaveText: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold' },
});
