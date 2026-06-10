import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import {
  loadBarefaced, saveBarefaced, todayBFStr, getTodayLog,
  upsertTodayLog, updateBFStreaks, getSkinMeta, getGlowLevel,
  getNimbusSkincareNote, freshMorningSteps, freshNightSteps,
  PRODUCT_TYPE_META, PRODUCT_TYPES, SKIN_TYPE_META,
  type BarefacedStore, type DayLog, type SkinCondition, type RoutineStep,
  type SkinProduct, type ProductType, type SkinTypeTag,
} from '@/lib/barefacedData';

const SKIN_CONDITIONS: { key: SkinCondition; emoji: string; label: string }[] = [
  { key: 'calm',        emoji: '🌿', label: 'Calm'        },
  { key: 'hydrated',    emoji: '💧', label: 'Hydrated'    },
  { key: 'glowing',     emoji: '🌸', label: 'Glowing'     },
  { key: 'dry',         emoji: '🌬', label: 'Dry'         },
  { key: 'sensitive',   emoji: '⚡', label: 'Sensitive'   },
  { key: 'breakingout', emoji: '🔥', label: 'Breaking Out'},
];

function MirrorVisual({ log, glowColor, glowOpacity }: {
  log: DayLog; glowColor: string; glowOpacity: number;
}) {
  const fogOpacity = 1 - glowOpacity;
  return (
    <View style={mirrorStyles.wrap}>
      <LinearGradient
        colors={['#E8F0FF', '#D4E4F8', '#C9D8F0']}
        style={mirrorStyles.mirror}
      >
        {/* Fog overlay — fades as routines complete */}
        <View style={[mirrorStyles.fog, { opacity: fogOpacity * 0.55 }]} />

        {/* Glow shimmer */}
        <LinearGradient
          colors={[glowColor + '00', glowColor + '55', glowColor + '00']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}
        />

        {/* Nimbus in mirror */}
        <View style={mirrorStyles.nimbusWrap}>
          <NimbusBird size={58} />
        </View>

        {/* Routine completion chips */}
        <View style={mirrorStyles.chips}>
          <View style={[mirrorStyles.chip, {
            backgroundColor: log.morningDone ? '#98D4A330' : '#FFFFFF22',
            borderColor: log.morningDone ? '#98D4A380' : '#FFFFFF40',
          }]}>
            <Text style={[mirrorStyles.chipText, { color: log.morningDone ? '#2E6B45' : '#6B7A9F' }]}>
              {log.morningDone ? '✓' : '○'} AM
            </Text>
          </View>
          <View style={[mirrorStyles.chip, {
            backgroundColor: log.nightDone ? '#C9AEED30' : '#FFFFFF22',
            borderColor: log.nightDone ? '#C9AEED80' : '#FFFFFF40',
          }]}>
            <Text style={[mirrorStyles.chipText, { color: log.nightDone ? '#6B3FA0' : '#6B7A9F' }]}>
              {log.nightDone ? '✓' : '○'} PM
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const mirrorStyles = StyleSheet.create({
  wrap: { borderRadius: 24, overflow: 'hidden', height: 178 },
  mirror: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fog: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B8C8E0',
  },
  nimbusWrap: { marginBottom: 8 },
  chips: {
    position: 'absolute', bottom: 12, flexDirection: 'row', gap: 8,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1,
  },
  chipText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
});

function StepChecklist({
  steps, onToggle, colors,
}: { steps: RoutineStep[]; onToggle: (id: string) => void; colors: any }) {
  return (
    <View style={{ gap: 8 }}>
      {steps.map(step => (
        <TouchableOpacity
          key={step.id}
          onPress={() => onToggle(step.id)}
          style={[stepStyles.row, {
            backgroundColor: step.done ? colors.surface : colors.background,
            borderColor: step.done ? '#98D4A370' : colors.border,
          }]}
          activeOpacity={0.7}
        >
          <View style={[stepStyles.check, {
            backgroundColor: step.done ? '#98D4A3' : 'transparent',
            borderColor: step.done ? '#98D4A3' : colors.border,
          }]}>
            {step.done && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={[stepStyles.label, {
            color: step.done ? colors.navy : colors.textMuted,
            textDecorationLine: step.done ? 'line-through' : 'none',
          }]}>
            {step.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 11, borderWidth: 1.5,
  },
  check: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
});

export default function BarefacedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [store, setStore] = useState<BarefacedStore | null>(null);
  const [todayLog, setTodayLog] = useState<DayLog | null>(null);
  const [routineModal, setRoutineModal] = useState<'morning' | 'night' | null>(null);
  const [skinModal, setSkinModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<SkinProduct | null>(null);

  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pType, setPType] = useState<ProductType>('cleanser');
  const [pSkinType, setPSkinType] = useState<SkinTypeTag>('all');
  const [pNotes, setPNotes] = useState('');

  const loadData = useCallback(async () => {
    const s = await loadBarefaced();
    const log = getTodayLog(s);
    setStore(s);
    setTodayLog(log);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const persistLog = async (newLog: DayLog, newStore?: BarefacedStore) => {
    if (!store) return;
    const base = newStore ?? store;
    let updated = upsertTodayLog(base, newLog);
    updated = updateBFStreaks(updated, newLog.morningDone, newLog.nightDone);
    await saveBarefaced(updated);
    setStore(updated);
    setTodayLog(newLog);
  };

  const handleToggleStep = async (type: 'morning' | 'night', id: string) => {
    if (!todayLog) return;
    const field = type === 'morning' ? 'morningSteps' : 'nightSteps';
    const steps = todayLog[field].map(s => s.id === id ? { ...s, done: !s.done } : s);
    const allDone = steps.every(s => s.done);
    const newLog: DayLog = {
      ...todayLog,
      [field]: steps,
      ...(type === 'morning' ? { morningDone: allDone } : { nightDone: allDone }),
    };
    setTodayLog(newLog);
    await persistLog(newLog);
  };

  const handleMarkAll = async (type: 'morning' | 'night') => {
    if (!todayLog) return;
    const field = type === 'morning' ? 'morningSteps' : 'nightSteps';
    const steps = todayLog[field].map(s => ({ ...s, done: true }));
    const newLog: DayLog = {
      ...todayLog,
      [field]: steps,
      ...(type === 'morning' ? { morningDone: true } : { nightDone: true }),
    };
    await persistLog(newLog);
    setRoutineModal(null);
  };

  const handleSkinSelect = async (condition: SkinCondition) => {
    if (!todayLog) return;
    const newLog: DayLog = { ...todayLog, skinCondition: condition };
    await persistLog(newLog);
    setSkinModal(false);
  };

  const handleAddProduct = async () => {
    if (!store || !pName.trim()) return;
    const newProduct: SkinProduct = {
      id: Date.now().toString(),
      name: pName.trim(),
      brand: pBrand.trim(),
      type: pType,
      skinType: pSkinType,
      notes: pNotes.trim(),
      addedDate: todayBFStr(),
      isFavorite: false,
    };
    const updated: BarefacedStore = { ...store, products: [newProduct, ...store.products] };
    await saveBarefaced(updated);
    setStore(updated);
    setProductModal(false);
    setPName(''); setPBrand(''); setPNotes('');
    setPType('cleanser'); setPSkinType('all');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!store) return;
    const updated: BarefacedStore = { ...store, products: store.products.filter(p => p.id !== id) };
    await saveBarefaced(updated);
    setStore(updated);
    setViewProduct(null);
  };

  const handleToggleFavorite = async (id: string) => {
    if (!store) return;
    const updated: BarefacedStore = {
      ...store,
      products: store.products.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p),
    };
    await saveBarefaced(updated);
    setStore(updated);
  };

  if (!store || !todayLog) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingCenter, { paddingTop: topPad + 60 }]}>
          <NimbusBird size={80} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Preparing your mirror…</Text>
        </View>
      </View>
    );
  }

  const glow = getGlowLevel(todayLog);
  const nimbusNote = getNimbusSkincareNote(todayLog);
  const skinMeta = todayLog.skinCondition ? getSkinMeta(todayLog.skinCondition) : null;
  const morningPct = todayLog.morningSteps.filter(s => s.done).length / todayLog.morningSteps.length;
  const nightPct = todayLog.nightSteps.filter(s => s.done).length / todayLog.nightSteps.length;
  const hasAnyActivity = todayLog.morningDone || todayLog.nightDone || !!todayLog.skinCondition;

  const recentLogs = store.logs.filter(l => l.date !== todayBFStr()).slice(0, 5);
  const calmStreak = store.logs.slice(0, 7).filter(l =>
    l.skinCondition === 'calm' || l.skinCondition === 'glowing' || l.skinCondition === 'hydrated'
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>Barefaced</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your skincare ritual</Text>
        </View>
        <View style={[styles.glowBadge, { backgroundColor: glow.color + '25', borderColor: glow.color + '60' }]}>
          <Text style={[styles.glowBadgeText, { color: glow.color }]}>{glow.label}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mirror visual */}
        <MirrorVisual log={todayLog} glowColor={glow.color} glowOpacity={glow.opacity} />

        {/* Today's skin state */}
        <View style={styles.skinRow}>
          <TouchableOpacity
            onPress={() => setSkinModal(true)}
            style={[styles.skinCard, {
              backgroundColor: skinMeta ? skinMeta.color + '18' : colors.surface,
              borderColor: skinMeta ? skinMeta.color + '55' : colors.border,
              shadowColor: colors.shadowDeep,
            }]}
            activeOpacity={0.8}
          >
            <Text style={styles.skinEmoji}>{skinMeta ? skinMeta.emoji : '🪞'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.skinLabel, { color: colors.textMuted }]}>Skin today</Text>
              <Text style={[styles.skinValue, { color: skinMeta ? skinMeta.color : colors.navy }]}>
                {skinMeta ? skinMeta.label : 'How is it feeling?'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Nimbus note */}
        <View style={[styles.nimbusRow, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <NimbusBird size={44} />
          <Text style={[styles.nimbusNote, { color: colors.navy }]}>{nimbusNote}</Text>
        </View>

        {/* Routines */}
        <View style={styles.routinesRow}>
          {/* Morning */}
          <TouchableOpacity
            onPress={() => setRoutineModal('morning')}
            activeOpacity={0.8}
            style={[styles.routineCard, {
              backgroundColor: todayLog.morningDone ? '#98D4A315' : colors.surface,
              borderColor: todayLog.morningDone ? '#98D4A355' : colors.border,
              shadowColor: colors.shadowDeep,
            }]}
          >
            <Text style={styles.routineEmoji}>🌅</Text>
            <Text style={[styles.routineTitle, { color: colors.navy }]}>Morning</Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.progressBarFill, {
                width: `${Math.round(morningPct * 100)}%` as any,
                backgroundColor: '#98D4A3',
              }]} />
            </View>
            <Text style={[styles.routineCount, { color: colors.textMuted }]}>
              {todayLog.morningSteps.filter(s => s.done).length}/{todayLog.morningSteps.length} steps
            </Text>
          </TouchableOpacity>

          {/* Night */}
          <TouchableOpacity
            onPress={() => setRoutineModal('night')}
            activeOpacity={0.8}
            style={[styles.routineCard, {
              backgroundColor: todayLog.nightDone ? '#C9AEED15' : colors.surface,
              borderColor: todayLog.nightDone ? '#C9AEED55' : colors.border,
              shadowColor: colors.shadowDeep,
            }]}
          >
            <Text style={styles.routineEmoji}>🌙</Text>
            <Text style={[styles.routineTitle, { color: colors.navy }]}>Night</Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.progressBarFill, {
                width: `${Math.round(nightPct * 100)}%` as any,
                backgroundColor: '#C9AEED',
              }]} />
            </View>
            <Text style={[styles.routineCount, { color: colors.textMuted }]}>
              {todayLog.nightSteps.filter(s => s.done).length}/{todayLog.nightSteps.length} steps
            </Text>
          </TouchableOpacity>
        </View>

        {/* Streaks */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🌅</Text>
            <Text style={[styles.statNum, { color: colors.navy }]}>{store.morningStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Morning streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🌙</Text>
            <Text style={[styles.statNum, { color: colors.navy }]}>{store.nightStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Night streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🌿</Text>
            <Text style={[styles.statNum, { color: colors.navy }]}>{calmStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calm days</Text>
          </View>
        </View>

        {/* Insight cloud */}
        {store.logs.length >= 3 && (
          <View style={[styles.insightCard, { backgroundColor: '#E8F0FF50', borderColor: '#B8C8E055' }]}>
            <Text style={[styles.insightLabel, { color: '#6B7A9F' }]}>🪞 Mirror insight</Text>
            <Text style={[styles.insightText, { color: colors.navy }]}>
              {store.morningStreak >= 3
                ? 'Morning care is becoming a consistent part of your days. 🌅'
                : store.nightStreak >= 3
                ? 'Your night routine is showing up reliably. That quiet consistency matters. 🌙'
                : "Each time you show up for your skin, you\u2019re building something gentle and lasting."}
            </Text>
          </View>
        )}

        {/* Recent log history */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>Recent days</Text>
            {recentLogs.map(log => {
              const meta = log.skinCondition ? getSkinMeta(log.skinCondition) : null;
              const g = getGlowLevel(log);
              return (
                <View key={log.date} style={[styles.historyRow, {
                  backgroundColor: colors.surface, borderColor: colors.border,
                }]}>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>{log.date}</Text>
                  <View style={styles.historyMid}>
                    {meta && (
                      <View style={[styles.historyBadge, { backgroundColor: meta.color + '20', borderColor: meta.color + '50' }]}>
                        <Text style={{ fontSize: 11 }}>{meta.emoji} {meta.label}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyIcons}>
                    <Text style={{ fontSize: 14, opacity: log.morningDone ? 1 : 0.2 }}>🌅</Text>
                    <Text style={{ fontSize: 14, opacity: log.nightDone ? 1 : 0.2 }}>🌙</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {!hasAnyActivity && store.logs.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <NimbusBird size={72} />
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>A soft, clear beginning</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              "Care starts with showing up once."
            </Text>
            <TouchableOpacity
              onPress={() => setRoutineModal('morning')}
              style={[styles.emptyBtn, { backgroundColor: '#E8F0FF' }]}
            >
              <Text style={[styles.emptyBtnText, { color: '#3D4B72' }]}>🌅 Start First Routine</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Product library ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>My Products</Text>
            <TouchableOpacity
              onPress={() => setProductModal(true)}
              style={[styles.addProductBtn, { backgroundColor: '#E8F0FF', borderColor: '#B8C8E060' }]}
            >
              <Ionicons name="add" size={14} color="#3D4B72" />
              <Text style={[styles.addProductBtnText, { color: '#3D4B72' }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {store.products.length === 0 ? (
            <TouchableOpacity
              onPress={() => setProductModal(true)}
              style={[styles.productEmptyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.productEmptyText, { color: colors.textMuted }]}>
                🫧 Tap to add your first product
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.productGrid}>
              {store.products.map(product => {
                const meta = PRODUCT_TYPE_META[product.type];
                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => setViewProduct(product)}
                    activeOpacity={0.8}
                    style={[styles.productCard, {
                      backgroundColor: colors.surface,
                      borderColor: meta.color + '50',
                      shadowColor: colors.shadowDeep,
                    }]}
                  >
                    {product.isFavorite && (
                      <Text style={styles.productFavStar}>★</Text>
                    )}
                    <View style={[styles.productIcon, { backgroundColor: meta.color + '25' }]}>
                      <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                    </View>
                    <Text style={[styles.productName, { color: colors.navy }]} numberOfLines={2}>
                      {product.name}
                    </Text>
                    {product.brand ? (
                      <Text style={[styles.productBrand, { color: colors.textMuted }]} numberOfLines={1}>
                        {product.brand}
                      </Text>
                    ) : null}
                    <View style={[styles.productTypeBadge, { backgroundColor: meta.color + '20' }]}>
                      <Text style={[styles.productTypeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Routine modal */}
      <Modal
        visible={!!routineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRoutineModal(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.navy }]}>
                  {routineModal === 'morning' ? '🌅 Morning Routine' : '🌙 Night Routine'}
                </Text>
                <TouchableOpacity onPress={() => setRoutineModal(null)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                <StepChecklist
                  steps={routineModal === 'morning' ? todayLog.morningSteps : todayLog.nightSteps}
                  onToggle={id => handleToggleStep(routineModal!, id)}
                  colors={colors}
                />
              </ScrollView>

              <TouchableOpacity
                onPress={() => handleMarkAll(routineModal!)}
                style={[styles.saveBtn, { backgroundColor: routineModal === 'morning' ? '#98D4A330' : '#C9AEED30',
                  borderColor: routineModal === 'morning' ? '#98D4A380' : '#C9AEED80',
                  borderWidth: 1,
                }]}
              >
                <Text style={[styles.saveBtnText, { color: routineModal === 'morning' ? '#2E6B45' : '#6B3FA0' }]}>
                  {routineModal === 'morning' ? '🌅 Complete all steps' : '🌙 Complete all steps'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Skin condition modal */}
      <Modal
        visible={skinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSkinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.navy }]}>🪞 How is your skin feeling?</Text>
              <TouchableOpacity onPress={() => setSkinModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.skinGrid}>
              {SKIN_CONDITIONS.map(c => {
                const meta = getSkinMeta(c.key);
                const active = todayLog.skinCondition === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => handleSkinSelect(c.key)}
                    style={[styles.skinOptBtn, {
                      backgroundColor: active ? meta.color + '25' : colors.background,
                      borderColor: active ? meta.color : colors.border,
                    }]}
                  >
                    <Text style={styles.skinOptEmoji}>{c.emoji}</Text>
                    <Text style={[styles.skinOptLabel, { color: active ? meta.color : colors.navy }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Add product modal */}
      <Modal
        visible={productModal}
        transparent
        animationType="slide"
        onRequestClose={() => setProductModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.navy }]}>🫧 Add a product</Text>
                <TouchableOpacity onPress={() => setProductModal(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                {/* Name */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Product name *</Text>
                <TextInput
                  style={[styles.fieldInput, { borderColor: colors.border, color: colors.navy }]}
                  placeholder="e.g. Gentle Hydrating Cleanser"
                  placeholderTextColor={colors.textMuted}
                  value={pName}
                  onChangeText={setPName}
                  autoFocus
                />

                {/* Brand */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Brand (optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { borderColor: colors.border, color: colors.navy }]}
                  placeholder="e.g. CeraVe, La Roche-Posay…"
                  placeholderTextColor={colors.textMuted}
                  value={pBrand}
                  onChangeText={setPBrand}
                />

                {/* Type */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {PRODUCT_TYPES.map(t => {
                      const m = PRODUCT_TYPE_META[t];
                      const active = pType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setPType(t)}
                          style={[styles.typeChip, {
                            backgroundColor: active ? m.color + '30' : colors.background,
                            borderColor: active ? m.color : colors.border,
                          }]}
                        >
                          <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                          <Text style={[styles.typeChipText, { color: active ? m.color : colors.textMuted }]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Skin type */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Best for</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {(Object.keys(SKIN_TYPE_META) as SkinTypeTag[]).map(st => {
                    const m = SKIN_TYPE_META[st];
                    const active = pSkinType === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setPSkinType(st)}
                        style={[styles.typeChip, {
                          backgroundColor: active ? m.color + '25' : colors.background,
                          borderColor: active ? m.color : colors.border,
                        }]}
                      >
                        <Text style={[styles.typeChipText, { color: active ? m.color : colors.textMuted }]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Notes */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Notes (optional)</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextarea, { borderColor: colors.border, color: colors.navy }]}
                  placeholder="Helps with dryness, use AM only…"
                  placeholderTextColor={colors.textMuted}
                  value={pNotes}
                  onChangeText={setPNotes}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>

              <TouchableOpacity
                onPress={handleAddProduct}
                disabled={!pName.trim()}
                style={[styles.saveBtn, {
                  backgroundColor: pName.trim() ? '#E8F0FF' : colors.borderLight,
                }]}
              >
                <Text style={[styles.saveBtnText, { color: pName.trim() ? '#3D4B72' : colors.textMuted }]}>
                  Save product 🫧
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View product modal */}
      {viewProduct && (
        <Modal
          visible={!!viewProduct}
          transparent
          animationType="slide"
          onRequestClose={() => setViewProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 26 }}>{PRODUCT_TYPE_META[viewProduct.type].emoji}</Text>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.navy }]}>{viewProduct.name}</Text>
                    {viewProduct.brand ? (
                      <Text style={[styles.viewProductBrand, { color: colors.textMuted }]}>{viewProduct.brand}</Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setViewProduct(null)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 10 }}>
                <View style={styles.viewProductRow}>
                  <View style={[styles.viewProductBadge, { backgroundColor: PRODUCT_TYPE_META[viewProduct.type].color + '20' }]}>
                    <Text style={[styles.viewProductBadgeText, { color: PRODUCT_TYPE_META[viewProduct.type].color }]}>
                      {PRODUCT_TYPE_META[viewProduct.type].label}
                    </Text>
                  </View>
                  <View style={[styles.viewProductBadge, { backgroundColor: SKIN_TYPE_META[viewProduct.skinType].color + '20' }]}>
                    <Text style={[styles.viewProductBadgeText, { color: SKIN_TYPE_META[viewProduct.skinType].color }]}>
                      {SKIN_TYPE_META[viewProduct.skinType].label}
                    </Text>
                  </View>
                </View>

                {viewProduct.notes ? (
                  <View style={[styles.viewProductNotes, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.viewProductNotesLabel, { color: colors.textMuted }]}>Notes</Text>
                    <Text style={[styles.viewProductNotesText, { color: colors.navy }]}>{viewProduct.notes}</Text>
                  </View>
                ) : null}

                <Text style={[styles.viewProductDate, { color: colors.textMuted }]}>
                  Added {viewProduct.addedDate}
                </Text>
              </View>

              <View style={styles.viewProductActions}>
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(viewProduct.id)}
                  style={[styles.viewProductActionBtn, {
                    backgroundColor: viewProduct.isFavorite ? '#FFCA6B25' : colors.background,
                    borderColor: viewProduct.isFavorite ? '#FFCA6B80' : colors.border,
                  }]}
                >
                  <Text style={[styles.viewProductActionText, { color: viewProduct.isFavorite ? '#C89A00' : colors.textMuted }]}>
                    {viewProduct.isFavorite ? '★ Favorited' : '☆ Favorite'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteProduct(viewProduct.id)}
                  style={[styles.viewProductActionBtn, { backgroundColor: '#FF6B6B12', borderColor: '#FF6B6B40' }]}
                >
                  <Text style={[styles.viewProductActionText, { color: '#E05555' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 1 },
  glowBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, borderWidth: 1.5,
  },
  glowBadgeText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  skinRow: { gap: 10 },
  skinCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1.5, padding: 14,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.6, shadowRadius: 5, elevation: 2,
  },
  skinEmoji: { fontSize: 28 },
  skinLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  skinValue: { fontSize: 16, fontFamily: 'Nunito_700Bold', marginTop: 2 },

  nimbusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, padding: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 8, elevation: 2,
  },
  nimbusNote: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 20 },

  routinesRow: { flexDirection: 'row', gap: 12 },
  routineCard: {
    flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 8,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 2,
  },
  routineEmoji: { fontSize: 24 },
  routineTitle: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  progressBarBg: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 5, borderRadius: 3 },
  routineCount: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  statsCard: {
    flexDirection: 'row', borderRadius: 18, padding: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 20 },
  statNum: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { fontSize: 9, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 8 },

  insightCard: {
    borderRadius: 18, borderWidth: 1, padding: 14, gap: 6,
  },
  insightLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  insightText: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 21, fontStyle: 'italic' },

  section: { gap: 8 },
  sectionLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12, borderWidth: 1,
  },
  historyDate: { fontSize: 11, fontFamily: 'Nunito_400Regular', width: 76 },
  historyMid: { flex: 1 },
  historyBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  historyIcons: { flexDirection: 'row', gap: 4 },

  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 3,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 21, fontStyle: 'italic' },
  emptyBtn: { marginTop: 6, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000044', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 16, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },

  saveBtn: { borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 15, fontFamily: 'Nunito_700Bold' },

  /* Product library */
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addProductBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  addProductBtnText: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  productEmptyRow: {
    borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    padding: 20, alignItems: 'center',
  },
  productEmptyText: { fontSize: 13, fontFamily: 'Nunito_400Regular' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: {
    width: '47%', borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 6,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 2,
  },
  productFavStar: { position: 'absolute', top: 10, right: 12, fontSize: 13, color: '#FFCA6B' },
  productIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 13, fontFamily: 'Nunito_700Bold', lineHeight: 18 },
  productBrand: { fontSize: 10, fontFamily: 'Nunito_400Regular' },
  productTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  productTypeText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  /* Add product modal */
  fieldLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 11,
    fontSize: 14, fontFamily: 'Nunito_400Regular', marginBottom: 14,
  },
  fieldTextarea: { textAlignVertical: 'top', minHeight: 70 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5,
  },
  typeChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  /* View product modal */
  viewProductBrand: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 1 },
  viewProductRow: { flexDirection: 'row', gap: 8 },
  viewProductBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  viewProductBadgeText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  viewProductNotes: {
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 4,
  },
  viewProductNotesLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  viewProductNotesText: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 20 },
  viewProductDate: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  viewProductActions: { flexDirection: 'row', gap: 10 },
  viewProductActionBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center',
  },
  viewProductActionText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinOptBtn: {
    width: '30%', alignItems: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
    flexGrow: 1,
  },
  skinOptEmoji: { fontSize: 24 },
  skinOptLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
});
