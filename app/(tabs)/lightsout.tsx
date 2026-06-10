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
  loadLightsOut, saveLightsOut, todayLOStr, calcDurationMinutes,
  formatDuration, formatTime12, getQualityMeta, getAverageSleep,
  updateLoStreak, getNimbusNightNote,
  type LightsOutStore, type SleepLog, type SleepQuality,
} from '@/lib/lightsOutData';

const QUALITY_OPTIONS: { key: SleepQuality; emoji: string; label: string }[] = [
  { key: 'poor',      emoji: '😴', label: 'Poor'      },
  { key: 'okay',      emoji: '🌙', label: 'Okay'      },
  { key: 'good',      emoji: '✨', label: 'Good'      },
  { key: 'excellent', emoji: '💫', label: 'Excellent' },
];

function NightSky({ logs }: { logs: SleepLog[] }) {
  const recentLogs = logs.slice(-7);
  const starCount = recentLogs.reduce((s, l) => s + getQualityMeta(l.quality).stars, 0);
  const maxStars = 28;
  const brightness = Math.min(1, starCount / maxStars);

  const starPositions = [
    { top: '8%',  left: '15%' }, { top: '12%', left: '60%' }, { top: '5%',  left: '80%' },
    { top: '20%', left: '35%' }, { top: '15%', left: '88%' }, { top: '30%', left: '10%' },
    { top: '25%', left: '70%' }, { top: '35%', left: '50%' }, { top: '10%', left: '45%' },
    { top: '40%', left: '22%' }, { top: '18%', left: '5%'  }, { top: '45%', left: '75%' },
  ];

  return (
    <View style={skyStyles.container}>
      {/* Sky gradient */}
      <LinearGradient
        colors={['#0D1B3E', '#1A2F5E', '#2A4080']}
        style={StyleSheet.absoluteFill}
      />
      {/* Stars */}
      {starPositions.map((pos, i) => {
        const active = i < Math.round(brightness * starPositions.length);
        return (
          <Text
            key={i}
            style={[skyStyles.star, pos as any, { opacity: active ? 0.6 + Math.random() * 0.4 : 0.08 }]}
          >
            ✦
          </Text>
        );
      })}
      {/* Moon */}
      <Text style={skyStyles.moon}>🌙</Text>
      {/* Nimbus on cloud */}
      <View style={skyStyles.nimbusWrap}>
        <NimbusBird size={54} />
      </View>
    </View>
  );
}

const skyStyles = StyleSheet.create({
  container: { height: 180, borderRadius: 24, overflow: 'hidden', marginBottom: 0, justifyContent: 'center' },
  star: { position: 'absolute', fontSize: 12, color: '#FFE4A0' },
  moon: { position: 'absolute', top: 18, right: 28, fontSize: 40 },
  nimbusWrap: { position: 'absolute', bottom: 14, left: '50%', transform: [{ translateX: -27 }] },
});

function TimeInput({
  label, value, onChange, colors,
}: { label: string; value: string; onChange: (v: string) => void; colors: any }) {
  const [h, m] = value.split(':');
  return (
    <View style={tiStyles.wrap}>
      <Text style={[tiStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={[tiStyles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[tiStyles.seg, { color: colors.navy }]}
          value={h}
          onChangeText={v => onChange(`${v.slice(-2).padStart(2,'0')}:${m}`)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
        <Text style={[tiStyles.colon, { color: colors.textMuted }]}>:</Text>
        <TextInput
          style={[tiStyles.seg, { color: colors.navy }]}
          value={m}
          onChangeText={v => onChange(`${h}:${v.slice(-2).padStart(2,'0')}`)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
      </View>
      <Text style={[tiStyles.sub, { color: colors.textMuted }]}>{formatTime12(value)}</Text>
    </View>
  );
}

const tiStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, flex: 1 },
  label: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  seg: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', width: 38, textAlign: 'center' },
  colon: { fontSize: 22, fontFamily: 'Nunito_700Bold', marginHorizontal: 2 },
  sub: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
});

export default function LightsOutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [store, setStore] = useState<LightsOutStore | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);

  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [quality, setQuality] = useState<SleepQuality>('good');
  const [notes, setNotes] = useState('');
  const [dreams, setDreams] = useState('');

  const loadData = useCallback(async () => {
    const s = await loadLightsOut();
    setStore(s);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleLogSleep = async () => {
    if (!store) return;
    const date = todayLOStr();
    const durationMinutes = calcDurationMinutes(bedtime, wakeTime);
    const newLog: SleepLog = {
      id: Date.now().toString(),
      date,
      bedtime,
      wakeTime,
      durationMinutes,
      quality,
      notes: notes.trim(),
      dreams: dreams.trim(),
      timestamp: new Date().toISOString(),
    };
    let updated: LightsOutStore = {
      ...store,
      logs: [newLog, ...store.logs],
    };
    updated = updateLoStreak(updated, date);
    await saveLightsOut(updated);
    setStore(updated);
    setLogModalVisible(false);
    setNotes('');
    setDreams('');
  };

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: '#0D1B3E' }]}>
        <View style={[styles.loadingCenter, { paddingTop: topPad + 60 }]}>
          <NimbusBird size={80} />
          <Text style={[styles.loadingText, { color: '#C9AEED' }]}>Loading your night sky…</Text>
        </View>
      </View>
    );
  }

  const recentLogs = store.logs.slice(0, 7);
  const todayLog = store.logs.find(l => l.date === todayLOStr());
  const avgMins = getAverageSleep(store.logs.slice(0, 30));
  const lastLog = store.logs[0];
  const lastQualityMeta = lastLog ? getQualityMeta(lastLog.quality) : null;
  const nimbusNote = getNimbusNightNote(lastLog?.quality);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>Lights Out</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your nightly rest archive</Text>
        </View>
        <TouchableOpacity
          onPress={() => setLogModalVisible(true)}
          style={[styles.logBtn, { backgroundColor: '#1A2F5E' }]}
        >
          <Ionicons name="moon-outline" size={15} color="#C9AEED" />
          <Text style={[styles.logBtnText, { color: '#C9AEED' }]}>Log Sleep</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Night sky visual */}
        <NightSky logs={recentLogs} />

        {/* Last sleep summary */}
        {lastLog ? (
          <LinearGradient
            colors={['#1A2F5E18', '#C9AEED14']}
            style={[styles.summaryCard, { borderColor: '#C9AEED40' }]}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: colors.navy }]}>
                  {formatDuration(lastLog.durationMinutes)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Duration</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: lastQualityMeta?.color ?? colors.navy }]}>
                  {lastQualityMeta?.emoji} {lastQualityMeta?.label}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Quality</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: colors.navy }]}>
                  {formatTime12(lastLog.bedtime)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bedtime</Text>
              </View>
            </View>
            <View style={[styles.summaryRowB, { borderTopColor: colors.border }]}>
              <Ionicons name="alarm-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.summaryWake, { color: colors.textMuted }]}>
                Woke at {formatTime12(lastLog.wakeTime)}
              </Text>
            </View>
          </LinearGradient>
        ) : null}

        {/* Nimbus note */}
        <View style={[styles.nimbusRow, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <NimbusBird size={44} />
          <Text style={[styles.nimbusNote, { color: colors.navy }]}>{nimbusNote}</Text>
        </View>

        {/* Streak + stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🌙</Text>
            <Text style={[styles.statNum, { color: colors.navy }]}>{store.streakDays}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Day streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={[styles.statNum, { color: colors.navy }]}>{store.bestStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={[styles.statNum, { color: colors.navy }]}>
              {avgMins > 0 ? formatDuration(avgMins) : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg sleep</Text>
          </View>
        </View>

        {/* Quality bar (last 7 nights) */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>Last 7 nights</Text>
            <View style={[styles.qualityBar, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
              {Array.from({ length: 7 }).map((_, i) => {
                const log = recentLogs[6 - i];
                const meta = log ? getQualityMeta(log.quality) : null;
                return (
                  <View key={i} style={styles.qualityDay}>
                    <View style={[
                      styles.qualityDot,
                      { backgroundColor: meta ? meta.color + 'CC' : colors.borderLight },
                    ]} />
                    <Text style={[styles.qualityEmoji, { opacity: meta ? 1 : 0.2 }]}>
                      {meta ? meta.emoji : '○'}
                    </Text>
                    <Text style={[styles.qualityDuration, { color: colors.textMuted }]}>
                      {log ? formatDuration(log.durationMinutes).replace(' ', '') : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent logs */}
        {store.logs.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.navy }]}>Sleep history</Text>
            {store.logs.slice(0, 10).map((log) => {
              const meta = getQualityMeta(log.quality);
              return (
                <View
                  key={log.id}
                  style={[styles.logRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.logDot, { backgroundColor: meta.color + '55' }]}>
                    <Text style={styles.logEmoji}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.logTop}>
                      <Text style={[styles.logDuration, { color: colors.navy }]}>
                        {formatDuration(log.durationMinutes)}
                      </Text>
                      <Text style={[styles.logQuality, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={[styles.logTimes, { color: colors.textMuted }]}>
                      {formatTime12(log.bedtime)} → {formatTime12(log.wakeTime)}
                    </Text>
                    {log.notes ? (
                      <Text style={[styles.logNotes, { color: colors.textMuted }]} numberOfLines={1}>
                        📝 {log.notes}
                      </Text>
                    ) : null}
                    {log.dreams ? (
                      <Text style={[styles.logNotes, { color: colors.textMuted }]} numberOfLines={1}>
                        🌀 {log.dreams}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.logDate, { color: colors.textMuted }]}>{log.date}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          /* Empty state */
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <NimbusBird size={72} />
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>A quiet night sky</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              "Rest is also part of becoming."
            </Text>
            <TouchableOpacity
              onPress={() => setLogModalVisible(true)}
              style={[styles.emptyBtn, { backgroundColor: '#1A2F5E' }]}
            >
              <Text style={[styles.emptyBtnText, { color: '#C9AEED' }]}>🌙 Log First Sleep</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Log sleep modal */}
      <Modal
        visible={logModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.navy }]}>🌙 Log Sleep</Text>
                <TouchableOpacity onPress={() => setLogModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Time pickers */}
                <View style={styles.timeRow}>
                  <TimeInput label="Bedtime" value={bedtime} onChange={setBedtime} colors={colors} />
                  <Ionicons name="arrow-forward" size={18} color={colors.textMuted} style={{ marginTop: 24 }} />
                  <TimeInput label="Wake time" value={wakeTime} onChange={setWakeTime} colors={colors} />
                </View>

                {/* Duration preview */}
                <View style={[styles.durationPreview, { backgroundColor: '#1A2F5E10', borderColor: '#C9AEED40' }]}>
                  <Text style={[styles.durationNum, { color: '#1A2F5E' }]}>
                    {formatDuration(calcDurationMinutes(bedtime, wakeTime))}
                  </Text>
                  <Text style={[styles.durationLabel, { color: colors.textMuted }]}>total sleep</Text>
                </View>

                {/* Quality */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>How did you sleep?</Text>
                <View style={styles.qualityRow}>
                  {QUALITY_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setQuality(opt.key)}
                      style={[
                        styles.qualityBtn,
                        { borderColor: quality === opt.key ? getQualityMeta(opt.key).color : colors.border },
                        quality === opt.key && { backgroundColor: getQualityMeta(opt.key).color + '22' },
                      ]}
                    >
                      <Text style={styles.qualityBtnEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.qualityBtnLabel, { color: quality === opt.key ? getQualityMeta(opt.key).color : colors.textMuted }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Night notes (optional)</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: colors.border, color: colors.navy }]}
                  placeholder="How was your night? Any thoughts…"
                  placeholderTextColor={colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                {/* Dreams */}
                <Text style={[styles.fieldLabel, { color: colors.navy }]}>Dreams (optional)</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: colors.border, color: colors.navy }]}
                  placeholder="What did you dream about? 🌀"
                  placeholderTextColor={colors.textMuted}
                  value={dreams}
                  onChangeText={setDreams}
                  multiline
                  numberOfLines={2}
                />
              </ScrollView>

              <TouchableOpacity
                onPress={handleLogSleep}
                style={[styles.saveBtn, { backgroundColor: '#1A2F5E' }]}
              >
                <Text style={[styles.saveBtnText, { color: '#C9AEED' }]}>Save sleep log 🌙</Text>
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
  loadingCenter: { flex: 1, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 1 },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
  },
  logBtnText: { fontSize: 12, fontFamily: 'Nunito_700Bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  summaryCard: {
    borderRadius: 20, borderWidth: 1.5, overflow: 'hidden',
  },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 4 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryNum: { fontSize: 15, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  summaryLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryDivider: { width: 1, marginVertical: 4 },
  summaryRowB: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
  },
  summaryWake: { fontSize: 12, fontFamily: 'Nunito_400Regular' },

  nimbusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, padding: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 2,
  },
  nimbusNote: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 20 },

  statsCard: {
    flexDirection: 'row', borderRadius: 20, padding: 18,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },
  statNum: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 8 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold' },

  qualityBar: {
    flexDirection: 'row', borderRadius: 16, padding: 12, gap: 4,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2,
  },
  qualityDay: { flex: 1, alignItems: 'center', gap: 6 },
  qualityDot: { width: 6, height: 6, borderRadius: 3 },
  qualityEmoji: { fontSize: 14 },
  qualityDuration: { fontSize: 9, fontFamily: 'Nunito_600SemiBold' },

  logRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 16, padding: 12, borderWidth: 1,
  },
  logDot: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logEmoji: { fontSize: 18 },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logDuration: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  logQuality: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  logTimes: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  logNotes: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  logDate: { fontSize: 10, fontFamily: 'Nunito_400Regular', marginTop: 2 },

  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 3,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 19, fontStyle: 'italic' },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },

  modalOverlay: {
    flex: 1, backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 16,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  durationPreview: {
    borderRadius: 14, borderWidth: 1, padding: 12,
    alignItems: 'center', marginBottom: 16,
  },
  durationNum: { fontSize: 28, fontFamily: 'Nunito_800ExtraBold' },
  durationLabel: { fontSize: 11, fontFamily: 'Nunito_400Regular' },

  fieldLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', marginBottom: 8 },
  qualityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  qualityBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5,
  },
  qualityBtnEmoji: { fontSize: 20 },
  qualityBtnLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  textArea: {
    borderWidth: 1.5, borderRadius: 14, padding: 12,
    fontSize: 14, fontFamily: 'Nunito_400Regular',
    textAlignVertical: 'top', minHeight: 72, marginBottom: 16,
  },
  saveBtn: { borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
});
