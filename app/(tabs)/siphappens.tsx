import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import {
  loadSip, saveSip, todaySipStr, getTodayRecord, getTotalMLForDay,
  mlToGlasses, unitToML, getCloudStatus, updateStreak,
  type SipStore, type SipDayRecord, type WaterUnit,
} from '@/lib/sipHappensData';

const NIMBUS_HYDRATION_NOTES = [
  "Even small sips can change your whole day. 💧",
  "You've got this — one sip at a time. ☁️",
  "Your cloud is waiting for a little rain. 🌧️",
  "Staying hydrated is a quiet act of self-love. 💙",
  "Small sips still count. Always. 🌱",
  "Your garden might need water too. 🌸",
];

function CloudVisual({ glasses, goal }: { glasses: number; goal: number }) {
  const status = getCloudStatus(glasses, goal);
  const pct = Math.min(1, goal > 0 ? glasses / goal : 0);
  const drops = Math.round(pct * 8);

  return (
    <View style={cloudStyles.container}>
      <View style={[cloudStyles.cloudBody, { opacity: 0.15 + pct * 0.85 }]}>
        <View style={[cloudStyles.cloudMain, { backgroundColor: status.color + 'CC' }]} />
        <View style={[cloudStyles.cloudBumpL, { backgroundColor: status.color + 'CC' }]} />
        <View style={[cloudStyles.cloudBumpR, { backgroundColor: status.color + 'CC' }]} />
        <View style={[cloudStyles.cloudBumpC, { backgroundColor: status.color + 'CC' }]} />
      </View>
      <Text style={cloudStyles.emoji}>{status.emoji}</Text>
      <View style={cloudStyles.dropsRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Text key={i} style={[cloudStyles.drop, { opacity: i < drops ? 1 : 0.15 }]}>
            💧
          </Text>
        ))}
      </View>
      <Text style={[cloudStyles.statusLabel, { color: status.color }]}>{status.label}</Text>
    </View>
  );
}

const cloudStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  cloudBody: { width: 160, height: 80, position: 'relative', marginBottom: -8 },
  cloudMain: { position: 'absolute', bottom: 0, left: 20, right: 20, height: 52, borderRadius: 26 },
  cloudBumpL: { position: 'absolute', bottom: 26, left: 14, width: 56, height: 56, borderRadius: 28 },
  cloudBumpR: { position: 'absolute', bottom: 26, right: 14, width: 48, height: 48, borderRadius: 24 },
  cloudBumpC: { position: 'absolute', bottom: 36, left: 44, width: 68, height: 68, borderRadius: 34 },
  emoji: { fontSize: 52, lineHeight: 60 },
  dropsRow: { flexDirection: 'row', gap: 4 },
  drop: { fontSize: 14 },
  statusLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', letterSpacing: 0.4 },
});

type QuickAdd = { label: string; ml: number; unit: WaterUnit; emoji: string };
const QUICK_ADDS: QuickAdd[] = [
  { label: '+1 Glass',  ml: 250,  unit: 'glass',      emoji: '🥛' },
  { label: '+500ml',    ml: 500,  unit: 'bottle500',  emoji: '💧' },
  { label: '+1 Litre',  ml: 1000, unit: 'bottle1000', emoji: '🫙' },
];

export default function SipHappensScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [store, setStore] = useState<SipStore | null>(null);
  const [todayRecord, setTodayRecord] = useState<SipDayRecord>({ date: todaySipStr(), logs: [] });
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customML, setCustomML] = useState('');
  const [justLogged, setJustLogged] = useState(false);

  const loadData = useCallback(async () => {
    const s = await loadSip();
    setStore(s);
    setTodayRecord(getTodayRecord(s.days, todaySipStr()));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const addWater = async (ml: number, unit: WaterUnit) => {
    if (!store) return;
    const date = todaySipStr();
    const newLog = {
      id: Date.now().toString(),
      date,
      ml,
      unit,
      timestamp: new Date().toISOString(),
    };

    const existingDayIdx = store.days.findIndex(d => d.date === date);
    let newDays = [...store.days];
    if (existingDayIdx >= 0) {
      newDays[existingDayIdx] = {
        ...newDays[existingDayIdx],
        logs: [...newDays[existingDayIdx].logs, newLog],
      };
    } else {
      newDays = [...newDays, { date, logs: [newLog] }];
    }

    let updated: SipStore = { ...store, days: newDays };
    updated = updateStreak(updated, date);

    await saveSip(updated);
    setStore(updated);
    setTodayRecord(getTodayRecord(updated.days, date));
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1800);
  };

  const removeLastLog = async () => {
    if (!store || todayRecord.logs.length === 0) return;
    const date = todaySipStr();
    const newLogs = todayRecord.logs.slice(0, -1);
    const newDays = store.days.map(d =>
      d.date === date ? { ...d, logs: newLogs } : d
    );
    const updated = { ...store, days: newDays };
    await saveSip(updated);
    setStore(updated);
    setTodayRecord({ date, logs: newLogs });
  };

  const handleCustomLog = async () => {
    const ml = parseInt(customML);
    if (isNaN(ml) || ml <= 0 || ml > 5000) {
      Alert.alert('Invalid amount', 'Please enter a value between 1 and 5000 ml.');
      return;
    }
    await addWater(ml, 'custom');
    setCustomML('');
    setCustomModalVisible(false);
  };

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingCenter, { paddingTop: topPad + 60 }]}>
          <NimbusBird size={80} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your cloud…</Text>
        </View>
      </View>
    );
  }

  const totalML = getTotalMLForDay(todayRecord);
  const glasses = mlToGlasses(totalML, store.glassML);
  const goal = store.goalGlasses;
  const goalML = goal * store.glassML;
  const pct = Math.min(1, goalML > 0 ? totalML / goalML : 0);
  const isGoalMet = glasses >= goal;
  const status = getCloudStatus(glasses, goal);
  const nimbusNote = NIMBUS_HYDRATION_NOTES[Math.floor(glasses) % NIMBUS_HYDRATION_NOTES.length];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>Sip Happens</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your daily hydration cloud</Text>
        </View>
        {todayRecord.logs.length > 0 && (
          <TouchableOpacity
            onPress={removeLastLog}
            style={[styles.undoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-undo-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.undoBtnText, { color: colors.textMuted }]}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cloud hero card */}
        <LinearGradient
          colors={[status.color + '18', '#C9AEED18']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: status.color + '40' }]}
        >
          <CloudVisual glasses={glasses} goal={goal} />

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: status.color }]} />
          </View>

          <View style={styles.intakeRow}>
            <Text style={[styles.intakeNum, { color: status.color }]}>{glasses.toFixed(1)}</Text>
            <Text style={[styles.intakeSep, { color: colors.textMuted }]}> / </Text>
            <Text style={[styles.intakeGoal, { color: colors.navy }]}>{goal}</Text>
            <Text style={[styles.intakeUnit, { color: colors.textMuted }]}> glasses</Text>
          </View>

          <Text style={[styles.intakeML, { color: colors.textMuted }]}>
            {totalML} ml of {goalML} ml
          </Text>

          {isGoalMet && (
            <View style={[styles.goalBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.goalBadgeText, { color: status.color }]}>🌈 Goal reached! Amazing!</Text>
            </View>
          )}
        </LinearGradient>

        {/* Nimbus note */}
        <View style={[styles.nimbusRow, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <NimbusBird size={44} />
          <Text style={[styles.nimbusNote, { color: colors.navy }]}>{justLogged ? '✨ Logged! Your cloud thanks you.' : nimbusNote}</Text>
        </View>

        {/* Quick add buttons */}
        <Text style={[styles.sectionLabel, { color: colors.navy }]}>Add water</Text>
        <View style={styles.quickRow}>
          {QUICK_ADDS.map((qa) => (
            <TouchableOpacity
              key={qa.unit}
              onPress={() => addWater(qa.ml, qa.unit)}
              activeOpacity={0.78}
              style={[styles.quickBtn, { backgroundColor: '#7EC8E318', borderColor: '#7EC8E355' }]}
            >
              <Text style={styles.quickEmoji}>{qa.emoji}</Text>
              <Text style={[styles.quickLabel, { color: colors.navy }]}>{qa.label}</Text>
              <Text style={[styles.quickML, { color: colors.textMuted }]}>{qa.ml}ml</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setCustomModalVisible(true)}
            activeOpacity={0.78}
            style={[styles.quickBtn, { backgroundColor: '#C9AEED18', borderColor: '#C9AEED55' }]}
          >
            <Text style={styles.quickEmoji}>✏️</Text>
            <Text style={[styles.quickLabel, { color: colors.navy }]}>Custom</Text>
            <Text style={[styles.quickML, { color: colors.textMuted }]}>any ml</Text>
          </TouchableOpacity>
        </View>

        {/* Streak */}
        <View style={[styles.streakCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>🌧️</Text>
            <Text style={[styles.streakNum, { color: colors.navy }]}>{store.streakDays}</Text>
            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>Day streak</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>🏆</Text>
            <Text style={[styles.streakNum, { color: colors.navy }]}>{store.bestStreak}</Text>
            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>Best streak</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>📋</Text>
            <Text style={[styles.streakNum, { color: colors.navy }]}>{todayRecord.logs.length}</Text>
            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>Logs today</Text>
          </View>
        </View>

        {/* Today's log */}
        {todayRecord.logs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>Today's sips</Text>
            {[...todayRecord.logs].reverse().map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={log.id} style={[styles.logRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.logEmoji}>💧</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logML, { color: colors.navy }]}>{log.ml} ml</Text>
                    <Text style={[styles.logTime, { color: colors.textMuted }]}>{time}</Text>
                  </View>
                  <Text style={[styles.logGlass, { color: '#7EC8E3' }]}>
                    +{mlToGlasses(log.ml, store.glassML).toFixed(1)}g
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {todayRecord.logs.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <NimbusBird size={72} />
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>Your cloud is waiting</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              "Even small sips can change your whole day."
            </Text>
            <TouchableOpacity
              onPress={() => addWater(250, 'glass')}
              style={[styles.emptyBtn, { backgroundColor: '#7EC8E3' }]}
            >
              <Text style={styles.emptyBtnText}>💧 Log First Sip</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Custom ml modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.navy }]}>Custom amount</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: '#7EC8E3', color: colors.navy }]}
              placeholder="e.g. 350"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={customML}
              onChangeText={setCustomML}
              autoFocus
            />
            <Text style={[styles.modalUnit, { color: colors.textMuted }]}>ml</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                onPress={() => { setCustomML(''); setCustomModalVisible(false); }}
                style={[styles.modalBtn, { backgroundColor: colors.borderLight }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCustomLog}
                style={[styles.modalBtn, { backgroundColor: '#7EC8E3' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Log it 💧</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 1 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1,
  },
  undoBtnText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  heroCard: {
    borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', gap: 10,
    paddingVertical: 20, paddingHorizontal: 20,
  },
  progressTrack: {
    width: '100%', height: 8, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  intakeRow: { flexDirection: 'row', alignItems: 'baseline' },
  intakeNum: { fontSize: 36, fontFamily: 'Nunito_800ExtraBold' },
  intakeSep: { fontSize: 22, fontFamily: 'Nunito_400Regular' },
  intakeGoal: { fontSize: 28, fontFamily: 'Nunito_700Bold' },
  intakeUnit: { fontSize: 14, fontFamily: 'Nunito_400Regular' },
  intakeML: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  goalBadge: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 4,
  },
  goalBadgeText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },

  nimbusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, padding: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 2,
  },
  nimbusNote: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 20 },

  sectionLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold', paddingTop: 4 },

  quickRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickBtn: {
    flex: 1, minWidth: 72, alignItems: 'center', gap: 4,
    paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 18, borderWidth: 1.5,
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  quickML: { fontSize: 10, fontFamily: 'Nunito_400Regular' },

  streakCard: {
    flexDirection: 'row', borderRadius: 20, padding: 18,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 2,
  },
  streakItem: { flex: 1, alignItems: 'center', gap: 4 },
  streakEmoji: { fontSize: 24 },
  streakNum: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  streakLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  streakDivider: { width: 1, marginHorizontal: 8 },

  section: { gap: 8 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 12, borderWidth: 1,
  },
  logEmoji: { fontSize: 18 },
  logML: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  logTime: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  logGlass: { fontSize: 12, fontFamily: 'Nunito_700Bold' },

  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 3,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold' },

  modalOverlay: {
    flex: 1, backgroundColor: '#00000055',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: 280, borderRadius: 24, padding: 24, gap: 12, alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  modalInput: {
    width: '100%', borderWidth: 2, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 28, fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  modalUnit: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: -4 },
  modalRow: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
});
