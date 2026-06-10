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
  loadLingers, saveLingers, todayWLStr, getStateMeta,
  getRecentLogs, getMostCommonHour, getMostCommonState,
  getWeeklyReflection, getPatternInsight, getNimbusLingerResponse,
  getHabitCount, getHabitWeekStreak, getHabitNimbusResponse,
  formatHour, isNightTime,
  type WhatLingersStore, type LingerLog, type LogType, type EmotionalState, type HabitType,
} from '@/lib/whatLingersData';

const EMOTIONAL_STATES: EmotionalState[] = [
  'overwhelmed', 'stressed', 'anxious', 'bored', 'social', 'tired', 'sad', 'neutral',
];

const LOG_TYPES: { key: LogType; label: string; desc: string }[] = [
  { key: 'action', label: 'Moment', desc: 'Something that happened' },
  { key: 'urge',   label: 'Urge',   desc: 'A feeling, not yet acted on' },
];

function FoggyNimbus({ activityLevel }: { activityLevel: number }) {
  const opacity = Math.max(0.3, 1 - activityLevel * 0.15);
  return (
    <View style={{ alignItems: 'center', opacity }}>
      <NimbusBird size={56} />
    </View>
  );
}

export default function WhatLingersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [store, setStore] = useState<WhatLingersStore | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nimbusResponse, setNimbusResponse] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  const [logType, setLogType] = useState<LogType>('action');
  const [what, setWhat] = useState('');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('neutral');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    const s = await loadLingers();
    setStore(s);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleLog = async () => {
    if (!store || !what.trim()) return;
    const now = new Date();
    const newLog: LingerLog = {
      id: Date.now().toString(),
      date: todayWLStr(),
      timestamp: now.toISOString(),
      type: logType,
      habitType: 'general',
      what: what.trim(),
      emotionalState,
      intensity,
      notes: notes.trim(),
      hourOfDay: now.getHours(),
    };
    const updated: WhatLingersStore = {
      ...store,
      logs: [newLog, ...store.logs],
    };
    await saveLingers(updated);
    setStore(updated);
    const response = getNimbusLingerResponse(newLog, updated.logs.length);
    setNimbusResponse(response);
    setShowResponse(true);
    setModalVisible(false);
    setWhat('');
    setNotes('');
    setLogType('action');
    setEmotionalState('neutral');
    setIntensity(3);
    setTimeout(() => setShowResponse(false), 8000);
  };

  const handleHabitLog = async (habit: HabitType) => {
    if (!store) return;
    const now = new Date();
    const label = habit === 'vaping' ? 'Vaped' : 'Drank';
    const newLog: LingerLog = {
      id: Date.now().toString(),
      date: todayWLStr(),
      timestamp: now.toISOString(),
      type: 'action',
      habitType: habit,
      what: label,
      emotionalState: 'neutral',
      intensity: 3,
      notes: '',
      hourOfDay: now.getHours(),
    };
    const updated: WhatLingersStore = {
      ...store,
      logs: [newLog, ...store.logs],
    };
    await saveLingers(updated);
    setStore(updated);
    const todayCount = getHabitCount(updated.logs, habit, 1);
    const response = getHabitNimbusResponse(habit, todayCount);
    setNimbusResponse(response);
    setShowResponse(true);
    setTimeout(() => setShowResponse(false), 7000);
  };

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingCenter, { paddingTop: topPad + 60 }]}>
          <FoggyNimbus activityLevel={0} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Observing the quiet…</Text>
        </View>
      </View>
    );
  }

  const recent7 = getRecentLogs(store.logs, 7);
  const todayLogs = store.logs.filter(l => l.date === todayWLStr());
  const activityLevel = recent7.length;
  const commonHour = getMostCommonHour(recent7);
  const commonState = getMostCommonState(recent7);
  const weeklyReflection = getWeeklyReflection(recent7);
  const patternInsight = getPatternInsight(store.logs.slice(0, 20));
  const isNight = isNightTime(new Date().getHours());

  const vapingToday = getHabitCount(store.logs, 'vaping', 1);
  const drinkingToday = getHabitCount(store.logs, 'drinking', 1);
  const vapingWeek = getHabitCount(store.logs, 'vaping', 7);
  const drinkingWeek = getHabitCount(store.logs, 'drinking', 7);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#E8EAF010', '#D4D8E808']}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>What Lingers</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {isNight ? 'A quiet space for late hours.' : 'A mirror, not a mirror of judgment.'}
          </Text>
        </View>
        <FoggyNimbus activityLevel={activityLevel} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Nimbus response bubble */}
        {showResponse && nimbusResponse && (
          <View style={[styles.nimbusBubble, { backgroundColor: '#D4D8E8CC', borderColor: '#B0B8D055' }]}>
            <Text style={[styles.nimbusBubbleName, { color: '#6B7A9F' }]}>✦ Nimbus</Text>
            <Text style={[styles.nimbusBubbleText, { color: colors.navy }]}>{nimbusResponse}</Text>
          </View>
        )}

        {/* Log moment button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#D4D8E840', '#E8EAF020']}
            style={[styles.logBtn, { borderColor: '#B0B8D055' }]}
          >
            <View style={[styles.logBtnIcon, { backgroundColor: '#B0B8D030' }]}>
              <Ionicons name="add" size={22} color="#6B7A9F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.logBtnTitle, { color: colors.navy }]}>Log a moment</Text>
              <Text style={[styles.logBtnSub, { color: colors.textMuted }]}>
                {isNight ? 'Late night. I noticed.' : 'Something to observe, not judge.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Habit trackers: Vaping & Drinking ── */}
        <View style={styles.habitRow}>
          {/* Vaping */}
          <TouchableOpacity
            onPress={() => handleHabitLog('vaping')}
            activeOpacity={0.8}
            style={styles.habitCardWrap}
          >
            <LinearGradient
              colors={['#B0C4DE22', '#8B9DC322']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.habitCard, { borderColor: '#8B9DC355' }]}
            >
              <View style={styles.habitCardTop}>
                <Text style={styles.habitEmoji}>🚬</Text>
                <View style={[styles.habitCountBadge, { backgroundColor: vapingToday > 0 ? '#8B9DC330' : 'transparent', borderColor: '#8B9DC350' }]}>
                  <Text style={[styles.habitCountNum, { color: vapingToday > 0 ? '#4A5F8A' : colors.textMuted }]}>
                    {vapingToday}
                  </Text>
                </View>
              </View>
              <Text style={[styles.habitTitle, { color: colors.navy }]}>Vaping</Text>
              <Text style={[styles.habitSub, { color: colors.textMuted }]}>
                {vapingWeek > 0 ? `${vapingWeek} this week` : 'Tap to log'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Drinking */}
          <TouchableOpacity
            onPress={() => handleHabitLog('drinking')}
            activeOpacity={0.8}
            style={styles.habitCardWrap}
          >
            <LinearGradient
              colors={['#FFCA6B18', '#F4A26118']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.habitCard, { borderColor: '#FFCA6B55' }]}
            >
              <View style={styles.habitCardTop}>
                <Text style={styles.habitEmoji}>🍺</Text>
                <View style={[styles.habitCountBadge, { backgroundColor: drinkingToday > 0 ? '#FFCA6B30' : 'transparent', borderColor: '#FFCA6B50' }]}>
                  <Text style={[styles.habitCountNum, { color: drinkingToday > 0 ? '#A07820' : colors.textMuted }]}>
                    {drinkingToday}
                  </Text>
                </View>
              </View>
              <Text style={[styles.habitTitle, { color: colors.navy }]}>Drinking</Text>
              <Text style={[styles.habitSub, { color: colors.textMuted }]}>
                {drinkingWeek > 0 ? `${drinkingWeek} this week` : 'Tap to log'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Pattern insight */}
        {patternInsight && (
          <View style={[styles.insightCard, { backgroundColor: '#D4D8E828', borderColor: '#B0B8D040' }]}>
            <Text style={[styles.insightLabel, { color: '#6B7A9F' }]}>✦ Nimbus notices</Text>
            <Text style={[styles.insightText, { color: colors.navy }]}>{patternInsight}</Text>
          </View>
        )}

        {/* Weekly reflection */}
        {weeklyReflection && (
          <View style={[styles.reflectionCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep, borderColor: colors.border }]}>
            <Text style={[styles.reflectionLabel, { color: colors.textMuted }]}>🌫️ This week</Text>
            <Text style={[styles.reflectionText, { color: colors.navy }]}>{weeklyReflection}</Text>
          </View>
        )}

        {/* Stats row */}
        {store.logs.length > 0 && (
          <View style={[styles.statsRow, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.navy }]}>{todayLogs.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.navy }]}>{recent7.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>This week</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.navy }]}>
                {commonHour !== null ? formatHour(commonHour) : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Common time</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.navy }]}>
                {commonState ? getStateMeta(commonState).emoji : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Often feeling</Text>
            </View>
          </View>
        )}

        {/* Today's logs */}
        {todayLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>Today</Text>
            {todayLogs.map(log => {
              const meta = getStateMeta(log.emotionalState);
              const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View
                  key={log.id}
                  style={[styles.logRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.logDot, { backgroundColor: meta.color + '30' }]}>
                    <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.logTopRow}>
                      <Text style={[styles.logWhat, { color: colors.navy }]} numberOfLines={1}>
                        {log.what}
                      </Text>
                      <View style={[styles.typeBadge, {
                        backgroundColor: log.type === 'urge' ? '#C9AEED22' : '#D4D8E830',
                        borderColor: log.type === 'urge' ? '#C9AEED55' : '#B0B8D040',
                      }]}>
                        <Text style={[styles.typeBadgeText, {
                          color: log.type === 'urge' ? '#9B7FC8' : '#6B7A9F',
                        }]}>
                          {log.type === 'urge' ? 'urge' : 'moment'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.logMeta, { color: colors.textMuted }]}>
                      {meta.label} · {time}
                    </Text>
                    {log.notes ? (
                      <Text style={[styles.logNotes, { color: colors.textMuted }]} numberOfLines={2}>
                        {log.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Past logs */}
        {store.logs.filter(l => l.date !== todayWLStr()).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>Earlier</Text>
            {store.logs.filter(l => l.date !== todayWLStr()).slice(0, 8).map(log => {
              const meta = getStateMeta(log.emotionalState);
              const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View
                  key={log.id}
                  style={[styles.logRow, styles.logRowMuted, { backgroundColor: colors.surface + 'CC', borderColor: colors.border + '80' }]}
                >
                  <View style={[styles.logDot, { backgroundColor: meta.color + '20' }]}>
                    <Text style={{ fontSize: 14, opacity: 0.7 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.logWhat, { color: colors.navy + 'CC' }]} numberOfLines={1}>
                      {log.what}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.textMuted }]}>
                      {meta.label} · {log.date} · {time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {store.logs.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <FoggyNimbus activityLevel={0} />
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>A quiet, clear space</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              "I am not here to change you.{'\n'}I am here to help you see yourself more clearly."
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={[styles.emptyBtn, { backgroundColor: '#D4D8E8' }]}
            >
              <Text style={[styles.emptyBtnText, { color: '#3D4B72' }]}>🫧 Log a moment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Log modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.navy }]}>🫧 Log a moment</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* Type selector */}
                <View style={styles.typeRow}>
                  {LOG_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setLogType(t.key)}
                      style={[
                        styles.typeBtn,
                        { borderColor: logType === t.key ? '#6B7A9F' : colors.border },
                        logType === t.key && { backgroundColor: '#D4D8E840' },
                      ]}
                    >
                      <Text style={[styles.typeBtnLabel, { color: logType === t.key ? '#3D4B72' : colors.textMuted }]}>
                        {t.label}
                      </Text>
                      <Text style={[styles.typeBtnDesc, { color: colors.textMuted }]}>{t.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* What happened */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>
                  {logType === 'urge' ? 'What are you feeling pulled toward?' : 'What happened?'}
                </Text>
                <TextInput
                  style={[styles.textInput, { borderColor: colors.border, color: colors.navy }]}
                  placeholder={logType === 'urge' ? 'A quiet, honest answer…' : 'No judgment here…'}
                  placeholderTextColor={colors.textMuted}
                  value={what}
                  onChangeText={setWhat}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />

                {/* Emotional state */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>How were you feeling?</Text>
                <View style={styles.stateGrid}>
                  {EMOTIONAL_STATES.map(s => {
                    const meta = getStateMeta(s);
                    const active = emotionalState === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setEmotionalState(s)}
                        style={[
                          styles.stateBtn,
                          { borderColor: active ? meta.color : colors.border },
                          active && { backgroundColor: meta.color + '22' },
                        ]}
                      >
                        <Text style={styles.stateEmoji}>{meta.emoji}</Text>
                        <Text style={[styles.stateLabel, { color: active ? meta.color : colors.textMuted }]}>
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Intensity (urge only) */}
                {logType === 'urge' && (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.navy }]}>
                      Intensity right now: {intensity}/5
                    </Text>
                    <View style={styles.intensityRow}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <TouchableOpacity
                          key={n}
                          onPress={() => setIntensity(n)}
                          style={[
                            styles.intensityDot,
                            { backgroundColor: n <= intensity ? '#6B7A9F' : colors.borderLight },
                          ]}
                        />
                      ))}
                    </View>
                  </>
                )}

                {/* Notes */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Anything else? (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputSm, { borderColor: colors.border, color: colors.navy }]}
                  placeholder="Context, thoughts, what came before…"
                  placeholderTextColor={colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />
              </ScrollView>

              <TouchableOpacity
                onPress={handleLog}
                disabled={!what.trim()}
                style={[
                  styles.saveBtn,
                  { backgroundColor: what.trim() ? '#D4D8E8' : colors.borderLight },
                ]}
              >
                <Text style={[styles.saveBtnText, { color: what.trim() ? '#3D4B72' : colors.textMuted }]}>
                  Noted 🫧
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 2, fontStyle: 'italic' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, gap: 14 },

  nimbusBubble: {
    borderRadius: 18, borderWidth: 1, padding: 14, gap: 5,
  },
  nimbusBubbleName: { fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  nimbusBubbleText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 21, fontStyle: 'italic' },

  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, borderWidth: 1.5, padding: 16,
  },
  logBtnIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logBtnTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  logBtnSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 1, fontStyle: 'italic' },

  insightCard: {
    borderRadius: 18, borderWidth: 1, padding: 14, gap: 6,
  },
  insightLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  insightText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 21, fontStyle: 'italic' },

  reflectionCard: {
    borderRadius: 18, borderWidth: 1, padding: 14, gap: 6,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 2,
  },
  reflectionLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  reflectionText: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 21, fontStyle: 'italic' },

  statsRow: {
    flexDirection: 'row', borderRadius: 18, padding: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { fontSize: 9, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 6 },

  section: { gap: 8 },
  sectionLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold' },

  logRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 16, padding: 12, borderWidth: 1,
  },
  logRowMuted: { opacity: 0.75 },
  logDot: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logWhat: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },
  logMeta: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  logNotes: { fontSize: 11, fontFamily: 'Nunito_400Regular', fontStyle: 'italic', marginTop: 1 },

  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 3,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 21, fontStyle: 'italic', color: '#6B7A9F' },
  emptyBtn: { marginTop: 6, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000044', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 14, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1.5,
    padding: 12, alignItems: 'center', gap: 2,
  },
  typeBtnLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  typeBtnDesc: { fontSize: 10, fontFamily: 'Nunito_400Regular', textAlign: 'center' },

  fieldLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', marginBottom: 8 },
  textInput: {
    borderWidth: 1.5, borderRadius: 14, padding: 12,
    fontSize: 14, fontFamily: 'Nunito_400Regular',
    textAlignVertical: 'top', minHeight: 80, marginBottom: 14,
  },
  textInputSm: { minHeight: 60 },

  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  stateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1.5,
  },
  stateEmoji: { fontSize: 14 },
  stateLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  intensityRow: { flexDirection: 'row', gap: 10, marginBottom: 14, paddingHorizontal: 4 },
  intensityDot: { flex: 1, height: 8, borderRadius: 4 },

  saveBtn: { borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: 'Nunito_700Bold' },

  habitRow: { flexDirection: 'row', gap: 12 },
  habitCardWrap: { flex: 1 },
  habitCard: {
    borderRadius: 20, borderWidth: 1.5,
    padding: 16, gap: 4,
  },
  habitCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  habitEmoji: { fontSize: 24 },
  habitCountBadge: {
    minWidth: 32, height: 32, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  habitCountNum: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  habitTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  habitSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', fontStyle: 'italic' },
});
