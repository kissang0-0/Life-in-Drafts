import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { NimbusMessage } from '@/components/NimbusMessage';
import {
  addCycleLog, updateCycleLog, deleteCycleLog, upsertCycleCheckin,
  CycleLog, CycleCheckin, FlowIntensity, CycleMood, CycleEnergy,
} from '@/lib/firestore';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

interface CycleInfo {
  cycleDay: number;
  phase: CyclePhase;
  daysUntilNextPeriod: number;
  nextPeriodDate: string;
  ovulationDate: string;
  fertileStart: string;
  fertileEnd: string;
  pmsStart: string;
  avgCycleLength: number;
  avgPeriodLength: number;
  confidence: 'High' | 'Medium' | 'Low';
}

function computeCycleInfo(logs: CycleLog[]): CycleInfo | null {
  if (!logs.length) return null;

  const sorted = [...logs].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const latest = sorted[0];

  let avgCycleLength = 28;
  let avgPeriodLength = 5;

  if (sorted.length >= 2) {
    const lengths: number[] = [];
    for (let i = 0; i < Math.min(sorted.length - 1, 6); i++) {
      const diff = daysBetween(sorted[i + 1].startDate, sorted[i].startDate);
      if (diff > 15 && diff < 50) lengths.push(diff);
    }
    if (lengths.length) avgCycleLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  }

  const periodLengths = sorted
    .filter((l) => l.endDate)
    .map((l) => daysBetween(l.startDate, l.endDate!) + 1)
    .filter((n) => n > 0 && n < 15);
  if (periodLengths.length) avgPeriodLength = Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length);

  const lastStart = new Date(latest.startDate);
  const today = new Date(TODAY);
  const cycleDay = daysBetween(dateStr(lastStart), TODAY) + 1;

  let phase: CyclePhase;
  if (cycleDay <= avgPeriodLength) phase = 'menstrual';
  else if (cycleDay <= 13) phase = 'follicular';
  else if (cycleDay <= 15) phase = 'ovulation';
  else phase = 'luteal';

  const nextPeriod = addDays(lastStart, avgCycleLength);
  const daysUntilNextPeriod = daysBetween(TODAY, dateStr(nextPeriod));
  const ovulation = addDays(lastStart, avgCycleLength - 14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const pmsStart = addDays(nextPeriod, -7);

  const confidence: 'High' | 'Medium' | 'Low' =
    sorted.length >= 4 ? 'High' : sorted.length >= 2 ? 'Medium' : 'Low';

  return {
    cycleDay: Math.max(1, cycleDay),
    phase,
    daysUntilNextPeriod,
    nextPeriodDate: dateStr(nextPeriod),
    ovulationDate: dateStr(ovulation),
    fertileStart: dateStr(fertileStart),
    fertileEnd: dateStr(fertileEnd),
    pmsStart: dateStr(pmsStart),
    avgCycleLength,
    avgPeriodLength,
    confidence,
  };
}

const PHASE_INFO: Record<CyclePhase, { emoji: string; name: string; energy: string; mood: string; color: string; desc: string }> = {
  menstrual: {
    emoji: '🌙',
    name: 'Menstrual Phase',
    energy: 'Lower than usual',
    mood: 'Introspective, tender',
    color: '#DEC8F8',
    desc: 'Your body is releasing the uterine lining. Rest is your superpower right now.',
  },
  follicular: {
    emoji: '🌱',
    name: 'Follicular Phase',
    energy: 'Rising — great for new ideas',
    mood: 'Optimistic, curious',
    color: '#A8E0BC',
    desc: 'Estrogen rises and energy builds. A beautiful time to begin things.',
  },
  ovulation: {
    emoji: '☀️',
    name: 'Ovulation Phase',
    energy: 'Peak energy',
    mood: 'Social, confident',
    color: '#FFD97D',
    desc: 'Your most vibrant window. Connection and creativity flow naturally.',
  },
  luteal: {
    emoji: '☁️',
    name: 'Luteal Phase',
    energy: 'Gradually decreasing',
    mood: 'Reflective, sometimes sensitive',
    color: '#B8C8D8',
    desc: 'Progesterone rises. Be gentle with yourself as your body prepares.',
  },
};

const MOODS: { key: CycleMood; emoji: string; label: string }[] = [
  { key: 'happy', emoji: '😀', label: 'Happy' },
  { key: 'calm', emoji: '😌', label: 'Calm' },
  { key: 'sad', emoji: '😔', label: 'Sad' },
  { key: 'irritable', emoji: '😡', label: 'Irritable' },
  { key: 'anxious', emoji: '😰', label: 'Anxious' },
  { key: 'tired', emoji: '😴', label: 'Tired' },
  { key: 'energized', emoji: '🤩', label: 'Energized' },
  { key: 'neutral', emoji: '😶', label: 'Neutral' },
];

const ENERGIES: { key: CycleEnergy; label: string; fill: number }[] = [
  { key: 'very_low', label: 'Very Low', fill: 1 },
  { key: 'low', label: 'Low', fill: 2 },
  { key: 'medium', label: 'Medium', fill: 3 },
  { key: 'high', label: 'High', fill: 4 },
  { key: 'very_high', label: 'Very High', fill: 5 },
];

const PHYSICAL_SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Back Pain', 'Acne', 'Breast Tenderness', 'Nausea'];
const EMOTIONAL_SYMPTOMS = ['Irritable', 'Emotional', 'Sensitive', 'Overwhelmed', 'Unmotivated', 'Relaxed', 'Motivated'];

const FLOWS: { key: FlowIntensity; emoji: string; label: string }[] = [
  { key: 'light', emoji: '🩸', label: 'Light' },
  { key: 'medium', emoji: '🩸🩸', label: 'Medium' },
  { key: 'heavy', emoji: '🩸🩸🩸', label: 'Heavy' },
];

const SELF_CARE = [
  { emoji: '💧', label: 'Hydrate', tip: 'Drink an extra glass of water today.' },
  { emoji: '🧘', label: 'Stretch', tip: 'Five minutes of gentle movement helps so much.' },
  { emoji: '🚶', label: 'Take a Walk', tip: 'Even a short walk shifts your energy.' },
  { emoji: '📖', label: 'Journal', tip: 'Write freely — no agenda needed.' },
  { emoji: '🛌', label: 'Rest', tip: 'Rest is not laziness. It\'s wisdom.' },
  { emoji: '☕', label: 'Slow Down', tip: 'You don\'t have to earn your peace today.' },
];

const NIMBUS_CYCLE = [
  'Your body is doing important work.',
  'Be extra kind to yourself today.',
  'Rest is productive too.',
  'Listen to your body — it knows.',
  'It\'s okay to move a little slower.',
  'Take care of yourself today.',
  'You don\'t have to be productive every day.',
  'Understanding your patterns takes time. Be patient.',
  'Your feelings make sense. They really do.',
  'Small moments of self-care add up beautifully.',
];

function getTodayNimbusMessage() {
  const idx = Math.floor(new Date().getTime() / 86400000);
  return NIMBUS_CYCLE[idx % NIMBUS_CYCLE.length];
}

// ─── Tab types ───────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'log' | 'calendar' | 'checkin' | 'insights' | 'selfcare';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CycleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { cycleLogs, cycleCheckins } = useAppStore();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>('dashboard');

  const cycleInfo = useMemo(() => computeCycleInfo(cycleLogs), [cycleLogs]);
  const todayCheckin = useMemo(
    () => cycleCheckins.find((c) => c.date === TODAY),
    [cycleCheckins]
  );

  // ── Log period modal ──
  const [showLogModal, setShowLogModal] = useState(false);
  const [logStart, setLogStart] = useState('');
  const [logEnd, setLogEnd] = useState('');
  const [logFlow, setLogFlow] = useState<FlowIntensity>('medium');
  const [logNotes, setLogNotes] = useState('');
  const [editingLog, setEditingLog] = useState<CycleLog | null>(null);
  const [logSaving, setLogSaving] = useState(false);

  // ── Daily check-in state ──
  const [checkinMood, setCheckinMood] = useState<CycleMood | undefined>(todayCheckin?.mood);
  const [checkinEnergy, setCheckinEnergy] = useState<CycleEnergy | undefined>(todayCheckin?.energy);
  const [checkinSymptoms, setCheckinSymptoms] = useState<string[]>(todayCheckin?.symptoms ?? []);
  const [checkinPain, setCheckinPain] = useState<number | undefined>(todayCheckin?.painLevel);
  const [checkinSaving, setCheckinSaving] = useState(false);

  // ── Calendar state ──
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const openLogModal = (log?: CycleLog) => {
    if (log) {
      setEditingLog(log);
      setLogStart(log.startDate);
      setLogEnd(log.endDate ?? '');
      setLogFlow(log.flowIntensity);
      setLogNotes(log.notes ?? '');
    } else {
      setEditingLog(null);
      setLogStart(TODAY);
      setLogEnd('');
      setLogFlow('medium');
      setLogNotes('');
    }
    setShowLogModal(true);
  };

  const saveLog = async () => {
    if (!user || !logStart) return;
    setLogSaving(true);
    try {
      const payload = {
        startDate: logStart,
        endDate: logEnd || undefined,
        flowIntensity: logFlow,
        notes: logNotes || undefined,
      };
      if (editingLog) {
        await updateCycleLog(user.uid, editingLog.id, payload);
      } else {
        await addCycleLog(user.uid, payload);
      }
      setShowLogModal(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setLogSaving(false);
    }
  };

  const deleteLog = async (id: string) => {
    if (!user) return;
    Alert.alert('Delete Entry', 'Remove this period log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteCycleLog(user.uid, id); },
      },
    ]);
  };

  const saveCheckin = useCallback(async (updates: Partial<{ mood: CycleMood; energy: CycleEnergy; symptoms: string[]; painLevel: number }>) => {
    if (!user) return;
    setCheckinSaving(true);
    try {
      await upsertCycleCheckin(user.uid, TODAY, updates);
    } catch {}
    finally { setCheckinSaving(false); }
  }, [user]);

  const toggleSymptom = (s: string) => {
    const next = checkinSymptoms.includes(s)
      ? checkinSymptoms.filter((x) => x !== s)
      : [...checkinSymptoms, s];
    setCheckinSymptoms(next);
    saveCheckin({ symptoms: next });
  };

  // ── Calendar helpers ──
  const calendarData = useMemo(() => {
    if (!cycleInfo) return {};
    const map: Record<string, 'period' | 'ovulation' | 'fertile' | 'pms'> = {};
    cycleLogs.forEach((log) => {
      let d = new Date(log.startDate);
      const end = log.endDate ? new Date(log.endDate) : addDays(d, cycleInfo.avgPeriodLength - 1);
      while (d <= end) { map[dateStr(d)] = 'period'; d = addDays(d, 1); }
    });
    map[cycleInfo.ovulationDate] = 'ovulation';
    let fd = new Date(cycleInfo.fertileStart);
    const fend = new Date(cycleInfo.fertileEnd);
    while (fd <= fend) { if (!map[dateStr(fd)]) map[dateStr(fd)] = 'fertile'; fd = addDays(fd, 1); }
    let pd = new Date(cycleInfo.pmsStart);
    const nextP = new Date(cycleInfo.nextPeriodDate);
    while (pd < nextP) { if (!map[dateStr(pd)]) map[dateStr(pd)] = 'pms'; pd = addDays(pd, 1); }
    return map;
  }, [cycleInfo, cycleLogs]);

  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const days: (null | string)[] = Array(startPad).fill(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(dateStr(new Date(year, month, d)));
    }
    return days;
  }, [calMonth]);

  const monthLabel = useMemo(() => {
    const d = new Date(calMonth.year, calMonth.month, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calMonth]);

  const phaseInfo = cycleInfo ? PHASE_INFO[cycleInfo.phase] : null;

  // ── Average stats for insights ──
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cycleCheckins.forEach((c) => { if (c.mood) counts[c.mood] = (counts[c.mood] ?? 0) + 1; });
    return counts;
  }, [cycleCheckins]);

  const topMood = useMemo(() => {
    const entries = Object.entries(moodCounts);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0] as CycleMood;
  }, [moodCounts]);

  const symptomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cycleCheckins.forEach((c) => c.symptoms.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [cycleCheckins]);

  // ── Styles (dynamic) ──
  const s = makeStyles(colors);

  // ─── EMPTY STATE ────────────────────────────────────────────────────────────
  if (!cycleLogs.length && tab === 'dashboard') {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#DEC8F8', '#EBF5FF', colors.background]} style={s.headerGradient}>
          <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text style={s.headerTitle}>Cycle & Error</Text>
            <Text style={s.headerSub}>Your wellness companion</Text>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🌙</Text>
          <Text style={[s.emptyTitle, { color: colors.navy }]}>Your Cycle Journal</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>
            Understanding your patterns starts with a single entry.
          </Text>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.lavenderDeep }]} onPress={() => { setTab('log'); openLogModal(); }}>
            <Text style={s.primaryBtnText}>Log First Cycle</Text>
          </TouchableOpacity>
          <NimbusMessage message="I'm here whenever you're ready. No pressure." style={{ marginTop: 24, width: '100%' }} />
        </ScrollView>
        <LogModal
          visible={showLogModal}
          onClose={() => setShowLogModal(false)}
          start={logStart} onStart={setLogStart}
          end={logEnd} onEnd={setLogEnd}
          flow={logFlow} onFlow={setLogFlow}
          notes={logNotes} onNotes={setLogNotes}
          saving={logSaving} onSave={saveLog}
          isEdit={!!editingLog}
          colors={colors} s={s}
        />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#DEC8F8', '#EBF5FF', colors.background]} style={s.headerGradient}>
        <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.headerTitle}>Cycle & Error</Text>
              <Text style={s.headerSub}>Your wellness companion</Text>
            </View>
            <TouchableOpacity onPress={() => { setTab('log'); openLogModal(); }} style={[s.addBtn, { backgroundColor: colors.lavenderDeep }]}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={s.addBtnText}>Log Period</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
          {([
            { key: 'dashboard', label: 'Overview', icon: 'moon-outline' },
            { key: 'checkin', label: 'Check-In', icon: 'heart-outline' },
            { key: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
            { key: 'log', label: 'History', icon: 'list-outline' },
            { key: 'insights', label: 'Insights', icon: 'sparkles-outline' },
            { key: 'selfcare', label: 'Self-Care', icon: 'flower-outline' },
          ] as { key: Tab; label: string; icon: any }[]).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[s.tabItem, tab === t.key && { backgroundColor: colors.lavenderDeep }]}
            >
              <Ionicons name={t.icon} size={14} color={tab === t.key ? '#fff' : colors.textMuted} />
              <Text style={[s.tabLabel, { color: tab === t.key ? '#fff' : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Phase card */}
          {cycleInfo && phaseInfo && (
            <View style={[s.phaseCard, { backgroundColor: phaseInfo.color + '40', borderColor: phaseInfo.color }]}>
              <Text style={s.phaseEmoji}>{phaseInfo.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.phaseName, { color: colors.navy }]}>{phaseInfo.name}</Text>
                <Text style={[s.phaseDesc, { color: colors.text }]}>{phaseInfo.desc}</Text>
                <View style={s.phaseRow}>
                  <View style={s.phaseStat}>
                    <Text style={[s.phaseStatVal, { color: colors.navy }]}>Day {cycleInfo.cycleDay}</Text>
                    <Text style={[s.phaseStatLabel, { color: colors.textMuted }]}>Cycle Day</Text>
                  </View>
                  <View style={[s.phaseDivider, { backgroundColor: colors.border }]} />
                  <View style={s.phaseStat}>
                    <Text style={[s.phaseStatVal, { color: colors.navy }]}>
                      {cycleInfo.daysUntilNextPeriod > 0 ? `${cycleInfo.daysUntilNextPeriod}d` : 'Soon'}
                    </Text>
                    <Text style={[s.phaseStatLabel, { color: colors.textMuted }]}>Until Next Period</Text>
                  </View>
                  <View style={[s.phaseDivider, { backgroundColor: colors.border }]} />
                  <View style={s.phaseStat}>
                    <Text style={[s.phaseStatVal, { color: colors.navy }]}>Day {cycleInfo.avgCycleLength}</Text>
                    <Text style={[s.phaseStatLabel, { color: colors.textMuted }]}>Avg. Cycle</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Prediction card */}
          {cycleInfo && (
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.navy }]}>🔮 Predictions</Text>
              <View style={s.predRow}>
                <View style={s.predItem}>
                  <Text style={[s.predLabel, { color: colors.textMuted }]}>Next Period</Text>
                  <Text style={[s.predVal, { color: colors.navy }]}>
                    {new Date(cycleInfo.nextPeriodDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={s.predItem}>
                  <Text style={[s.predLabel, { color: colors.textMuted }]}>Ovulation</Text>
                  <Text style={[s.predVal, { color: colors.navy }]}>
                    {new Date(cycleInfo.ovulationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={s.predItem}>
                  <Text style={[s.predLabel, { color: colors.textMuted }]}>Confidence</Text>
                  <Text style={[s.predVal, { color: cycleInfo.confidence === 'High' ? colors.success : cycleInfo.confidence === 'Medium' ? colors.accentDeep : colors.textMuted }]}>
                    {cycleInfo.confidence}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Today's check-in summary */}
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>💙 Today</Text>
            {todayCheckin?.mood || todayCheckin?.energy ? (
              <View style={s.todayRow}>
                {todayCheckin.mood ? (
                  <View style={[s.todayChip, { backgroundColor: colors.lavender + '60' }]}>
                    <Text style={s.todayChipEmoji}>{MOODS.find((m) => m.key === todayCheckin.mood)?.emoji}</Text>
                    <Text style={[s.todayChipLabel, { color: colors.navy }]}>{todayCheckin.mood}</Text>
                  </View>
                ) : null}
                {todayCheckin.energy ? (
                  <View style={[s.todayChip, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={s.todayChipEmoji}>⚡</Text>
                    <Text style={[s.todayChipLabel, { color: colors.navy }]}>{todayCheckin.energy.replace('_', ' ')}</Text>
                  </View>
                ) : null}
                {todayCheckin.symptoms.length > 0 && (
                  <View style={[s.todayChip, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[s.todayChipLabel, { color: colors.textMuted }]}>{todayCheckin.symptoms.length} symptom{todayCheckin.symptoms.length !== 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={() => setTab('checkin')} style={[s.checkinPrompt, { backgroundColor: colors.lavender + '30' }]}>
                <Text style={[s.checkinPromptText, { color: colors.lavenderDeep }]}>How are you feeling today? →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Phase details */}
          {phaseInfo && (
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.navy }]}>About This Phase</Text>
              <View style={s.phaseDetail}>
                <Text style={[s.phaseDetailLabel, { color: colors.textMuted }]}>Energy</Text>
                <Text style={[s.phaseDetailVal, { color: colors.text }]}>{phaseInfo.energy}</Text>
              </View>
              <View style={s.phaseDetail}>
                <Text style={[s.phaseDetailLabel, { color: colors.textMuted }]}>Mood tendencies</Text>
                <Text style={[s.phaseDetailVal, { color: colors.text }]}>{phaseInfo.mood}</Text>
              </View>
            </View>
          )}

          {/* All phases overview */}
          <Text style={[s.sectionTitle, { color: colors.navy }]}>Cycle Phases</Text>
          {(Object.entries(PHASE_INFO) as [CyclePhase, typeof PHASE_INFO['menstrual']][]).map(([key, info]) => (
            <View key={key} style={[s.phaseOverviewCard, { backgroundColor: info.color + '30', borderColor: info.color + '80' }]}>
              <Text style={s.phaseOverviewEmoji}>{info.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.phaseOverviewName, { color: colors.navy }]}>{info.name}</Text>
                <Text style={[s.phaseOverviewDesc, { color: colors.textMuted }]}>{info.desc}</Text>
              </View>
              {cycleInfo?.phase === key && (
                <View style={[s.currentBadge, { backgroundColor: colors.lavenderDeep }]}>
                  <Text style={s.currentBadgeText}>Now</Text>
                </View>
              )}
            </View>
          ))}

          <NimbusMessage message={getTodayNimbusMessage()} style={{ marginTop: 8 }} />
        </ScrollView>
      )}

      {/* ── DAILY CHECK-IN ────────────────────────────────────────────────── */}
      {tab === 'checkin' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.sectionTitle, { color: colors.navy }]}>How are you feeling today?</Text>
          <Text style={[s.sectionSub, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>

          {/* Mood */}
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>😊 Mood</Text>
            <View style={s.moodGrid}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => { setCheckinMood(m.key); saveCheckin({ mood: m.key }); }}
                  style={[s.moodChip, checkinMood === m.key && { backgroundColor: colors.lavenderDeep, borderColor: colors.lavenderDeep }]}
                >
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel, { color: checkinMood === m.key ? '#fff' : colors.textMuted }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Energy */}
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>⚡ Energy</Text>
            <View style={s.energyRow}>
              {ENERGIES.map((e) => (
                <TouchableOpacity
                  key={e.key}
                  onPress={() => { setCheckinEnergy(e.key); saveCheckin({ energy: e.key }); }}
                  style={[s.energyChip, checkinEnergy === e.key && { backgroundColor: colors.accentDeep + '30', borderColor: colors.accentDeep }]}
                >
                  <Text style={s.energyBars}>{'🔋'.repeat(e.fill)}</Text>
                  <Text style={[s.energyLabel, { color: checkinEnergy === e.key ? colors.accentDeep : colors.textMuted }]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Symptoms */}
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>Physical</Text>
            <View style={s.symptomGrid}>
              {PHYSICAL_SYMPTOMS.map((sym) => (
                <TouchableOpacity
                  key={sym}
                  onPress={() => toggleSymptom(sym)}
                  style={[s.symptomChip, checkinSymptoms.includes(sym) && { backgroundColor: colors.primary + '25', borderColor: colors.primary }]}
                >
                  <Text style={[s.symptomLabel, { color: checkinSymptoms.includes(sym) ? colors.primary : colors.textMuted }]}>{sym}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>Emotional</Text>
            <View style={s.symptomGrid}>
              {EMOTIONAL_SYMPTOMS.map((sym) => (
                <TouchableOpacity
                  key={sym}
                  onPress={() => toggleSymptom(sym)}
                  style={[s.symptomChip, checkinSymptoms.includes(sym) && { backgroundColor: colors.lavender + '60', borderColor: colors.lavenderDeep }]}
                >
                  <Text style={[s.symptomLabel, { color: checkinSymptoms.includes(sym) ? colors.lavenderDeep : colors.textMuted }]}>{sym}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pain level */}
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>🩹 Pain Level (optional)</Text>
            <View style={s.painRow}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => { setCheckinPain(n); saveCheckin({ painLevel: n }); }}
                  style={[s.painChip, checkinPain === n && { backgroundColor: colors.lavenderDeep }]}
                >
                  <Text style={[s.painNum, { color: checkinPain === n ? '#fff' : colors.textMuted }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.painHint, { color: colors.textLight }]}>0 = no pain  ·  10 = severe</Text>
          </View>

          {checkinSaving && (
            <Text style={[s.savingText, { color: colors.textLight }]}>Saving…</Text>
          )}
          {(checkinMood || checkinEnergy || checkinSymptoms.length > 0) && !checkinSaving && (
            <Text style={[s.savedText, { color: colors.success }]}>✓ Check-in saved automatically</Text>
          )}

          <NimbusMessage message="Every check-in is a small act of self-awareness. That matters." style={{ marginTop: 8 }} />
        </ScrollView>
      )}

      {/* ── CALENDAR ──────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Month nav */}
          <View style={s.calNav}>
            <TouchableOpacity onPress={() => setCalMonth((m) => {
              const d = new Date(m.year, m.month - 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })} style={s.calNavBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.navy} />
            </TouchableOpacity>
            <Text style={[s.calMonthLabel, { color: colors.navy }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setCalMonth((m) => {
              const d = new Date(m.year, m.month + 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })} style={s.calNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.navy} />
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {[
              { label: '🩸 Period', color: '#DEC8F880' },
              { label: '⭐ Ovulation', color: '#FFD97D80' },
              { label: '🌼 Fertile', color: '#A8E0BC80' },
              { label: '☁️ PMS', color: '#B8C8D880' },
            ].map((l) => (
              <View key={l.label} style={[s.legendItem, { backgroundColor: l.color }]}>
                <Text style={[s.legendLabel, { color: colors.navy }]}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* Day headers */}
          <View style={s.calDayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <Text key={d} style={[s.calDayHeader, { color: colors.textMuted }]}>{d}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={s.calGrid}>
            {calDays.map((day, i) => {
              if (!day) return <View key={`pad-${i}`} style={s.calCell} />;
              const type = calendarData[day];
              const isToday = day === TODAY;
              const checkin = cycleCheckins.find((c) => c.date === day);
              let bg = 'transparent';
              let emoji = '';
              if (type === 'period') { bg = '#DEC8F860'; emoji = '🩸'; }
              else if (type === 'ovulation') { bg = '#FFD97D60'; emoji = '⭐'; }
              else if (type === 'fertile') { bg = '#A8E0BC60'; emoji = '🌼'; }
              else if (type === 'pms') { bg = '#B8C8D860'; emoji = '☁️'; }
              return (
                <View key={day} style={[s.calCell, { backgroundColor: bg, borderColor: isToday ? colors.lavenderDeep : 'transparent', borderWidth: isToday ? 2 : 0, borderRadius: 10 }]}>
                  <Text style={[s.calDayNum, { color: isToday ? colors.lavenderDeep : colors.navy }]}>{new Date(day + 'T12:00:00').getDate()}</Text>
                  {emoji ? <Text style={s.calDayEmoji}>{emoji}</Text> : null}
                  {checkin?.mood ? <Text style={s.calDayMood}>{MOODS.find((m) => m.key === checkin.mood)?.emoji ?? ''}</Text> : null}
                </View>
              );
            })}
          </View>

          {!cycleInfo && (
            <Text style={[s.emptyHint, { color: colors.textMuted }]}>Log your first period to see predictions on the calendar.</Text>
          )}
        </ScrollView>
      )}

      {/* ── HISTORY / LOG ─────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logHeaderRow}>
            <Text style={[s.sectionTitle, { color: colors.navy }]}>Period History</Text>
            <TouchableOpacity onPress={() => openLogModal()} style={[s.smallBtn, { backgroundColor: colors.lavenderDeep }]}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.smallBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {cycleLogs.length === 0 && (
            <Text style={[s.emptyHint, { color: colors.textMuted }]}>No periods logged yet.</Text>
          )}

          {[...cycleLogs].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((log) => {
            const flow = FLOWS.find((f) => f.key === log.flowIntensity)!;
            const dur = log.endDate ? daysBetween(log.startDate, log.endDate) + 1 : null;
            return (
              <View key={log.id} style={[s.logCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
                <View style={[s.logLeft, { backgroundColor: '#DEC8F840' }]}>
                  <Text style={s.logEmoji}>🌙</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.logDate, { color: colors.navy }]}>
                    {new Date(log.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={[s.logMeta, { color: colors.textMuted }]}>
                    {flow.emoji} {flow.label}{dur ? `  ·  ${dur} day${dur !== 1 ? 's' : ''}` : '  ·  ongoing'}
                  </Text>
                  {log.endDate ? (
                    <Text style={[s.logMeta, { color: colors.textLight }]}>
                      Ended {new Date(log.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  ) : null}
                  {log.notes ? <Text style={[s.logNotes, { color: colors.textMuted }]}>{log.notes}</Text> : null}
                </View>
                <View style={s.logActions}>
                  <TouchableOpacity onPress={() => openLogModal(log)}>
                    <Ionicons name="pencil-outline" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteLog(log.id)} style={{ marginTop: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── INSIGHTS ──────────────────────────────────────────────────────── */}
      {tab === 'insights' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.sectionTitle, { color: colors.navy }]}>Your Patterns</Text>

          {/* Cycle stats */}
          {cycleInfo && (
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.navy }]}>📊 Cycle Overview</Text>
              <View style={s.statsGrid}>
                {[
                  { label: 'Avg. Cycle', value: `${cycleInfo.avgCycleLength} days` },
                  { label: 'Avg. Period', value: `${cycleInfo.avgPeriodLength} days` },
                  { label: 'Cycles Logged', value: `${cycleLogs.length}` },
                  { label: 'Check-ins', value: `${cycleCheckins.length}` },
                ].map((stat) => (
                  <View key={stat.label} style={[s.statBox, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[s.statVal, { color: colors.navy }]}>{stat.value}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Mood insights */}
          {Object.keys(moodCounts).length > 0 && (
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.navy }]}>😊 Mood Patterns</Text>
              {topMood ? (
                <Text style={[s.insightLine, { color: colors.text }]}>
                  Your most common mood is <Text style={{ fontFamily: 'Nunito_700Bold', color: colors.lavenderDeep }}>{topMood}</Text>.
                </Text>
              ) : null}
              <View style={s.moodBarChart}>
                {Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([mood, count]) => {
                  const m = MOODS.find((x) => x.key === mood);
                  const max = Math.max(...Object.values(moodCounts));
                  return (
                    <View key={mood} style={s.moodBarRow}>
                      <Text style={s.moodBarEmoji}>{m?.emoji ?? '😶'}</Text>
                      <View style={[s.moodBarTrack, { backgroundColor: colors.surfaceAlt }]}>
                        <View style={[s.moodBarFill, { width: `${(count / max) * 100}%`, backgroundColor: colors.lavenderDeep + 'BB' }]} />
                      </View>
                      <Text style={[s.moodBarCount, { color: colors.textMuted }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Symptom insights */}
          {symptomCounts.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.navy }]}>🩹 Most Common Symptoms</Text>
              {symptomCounts.map(([sym, count]) => (
                <View key={sym} style={s.symptomInsightRow}>
                  <Text style={[s.symptomInsightName, { color: colors.text }]}>{sym}</Text>
                  <View style={[s.symptomInsightBadge, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={[s.symptomInsightCount, { color: colors.primary }]}>{count}×</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Phase insights */}
          {cycleInfo && (
            <View style={[s.card, { backgroundColor: '#DEC8F825' }]}>
              <Text style={[s.cardTitle, { color: colors.navy }]}>✨ Gentle Reminders</Text>
              <Text style={[s.insightLine, { color: colors.text }]}>
                You often have more energy around ovulation. Use that window for things that matter to you.
              </Text>
              <Text style={[s.insightLine, { color: colors.text, marginTop: 8 }]}>
                The luteal phase can feel heavier. That's completely normal — not a sign that something is wrong.
              </Text>
              <Text style={[s.insightLine, { color: colors.text, marginTop: 8 }]}>
                More data over time will reveal your personal patterns. Keep checking in.
              </Text>
            </View>
          )}

          {!cycleInfo && !cycleCheckins.length && (
            <Text style={[s.emptyHint, { color: colors.textMuted }]}>Log cycles and check-ins to see your insights here.</Text>
          )}

          <NimbusMessage message="Your patterns are uniquely yours. Understanding them is an act of self-love." style={{ marginTop: 8 }} />
        </ScrollView>
      )}

      {/* ── SELF-CARE ─────────────────────────────────────────────────────── */}
      {tab === 'selfcare' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.sectionTitle, { color: colors.navy }]}>Self-Care Hub</Text>
          <Text style={[s.sectionSub, { color: colors.textMuted }]}>Gentle suggestions, not prescriptions. Take what serves you.</Text>

          <View style={s.selfCareGrid}>
            {SELF_CARE.map((item) => (
              <View key={item.label} style={[s.selfCareCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
                <Text style={s.selfCareEmoji}>{item.emoji}</Text>
                <Text style={[s.selfCareLabel, { color: colors.navy }]}>{item.label}</Text>
                <Text style={[s.selfCareTip, { color: colors.textMuted }]}>{item.tip}</Text>
              </View>
            ))}
          </View>

          {/* Period kit */}
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.navy }]}>🎒 Period Kit Essentials</Text>
            {[
              { emoji: '🩹', label: 'Pads or Tampons' },
              { emoji: '💊', label: 'Pain Relief' },
              { emoji: '🔥', label: 'Heating Pad' },
              { emoji: '💧', label: 'Water Bottle' },
              { emoji: '🍫', label: 'Comfort Snacks' },
              { emoji: '🧸', label: 'Something Cozy' },
            ].map((kit) => (
              <View key={kit.label} style={[s.kitRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={s.kitEmoji}>{kit.emoji}</Text>
                <Text style={[s.kitLabel, { color: colors.text }]}>{kit.label}</Text>
              </View>
            ))}
          </View>

          <NimbusMessage message="Rest is not the absence of productivity. It is its foundation." style={{ marginTop: 8 }} />
        </ScrollView>
      )}

      {/* ── LOG MODAL ─────────────────────────────────────────────────────── */}
      <LogModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        start={logStart} onStart={setLogStart}
        end={logEnd} onEnd={setLogEnd}
        flow={logFlow} onFlow={setLogFlow}
        notes={logNotes} onNotes={setLogNotes}
        saving={logSaving} onSave={saveLog}
        isEdit={!!editingLog}
        colors={colors} s={s}
      />
    </View>
  );
}

// ─── Log Modal ───────────────────────────────────────────────────────────────

function LogModal({ visible, onClose, start, onStart, end, onEnd, flow, onFlow, notes, onNotes, saving, onSave, isEdit, colors, s }: any) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modal, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.navy }]}>{isEdit ? 'Edit Period' : 'Log Period'}</Text>
          <TouchableOpacity onPress={onSave} disabled={saving || !start}>
            <Text style={[s.modalSave, { color: saving || !start ? colors.textLight : colors.lavenderDeep }]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.modalBody}>
          <Text style={[s.modalLabel, { color: colors.navy }]}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            value={start} onChangeText={onStart}
            style={[s.input, { backgroundColor: colors.surfaceAlt, color: colors.navy, borderColor: colors.border }]}
            placeholder="e.g. 2025-06-01" placeholderTextColor={colors.textLight}
          />

          <Text style={[s.modalLabel, { color: colors.navy }]}>End Date (optional)</Text>
          <TextInput
            value={end} onChangeText={onEnd}
            style={[s.input, { backgroundColor: colors.surfaceAlt, color: colors.navy, borderColor: colors.border }]}
            placeholder="e.g. 2025-06-05" placeholderTextColor={colors.textLight}
          />

          <Text style={[s.modalLabel, { color: colors.navy }]}>Flow Intensity</Text>
          <View style={s.flowRow}>
            {FLOWS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => onFlow(f.key)}
                style={[s.flowChip, flow === f.key && { backgroundColor: '#DEC8F8', borderColor: colors.lavenderDeep }]}
              >
                <Text style={s.flowEmoji}>{f.emoji}</Text>
                <Text style={[s.flowLabel, { color: flow === f.key ? colors.lavenderDeep : colors.textMuted }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.modalLabel, { color: colors.navy }]}>Notes (optional)</Text>
          <TextInput
            value={notes} onChangeText={onNotes}
            multiline numberOfLines={3}
            style={[s.input, s.textArea, { backgroundColor: colors.surfaceAlt, color: colors.navy, borderColor: colors.border }]}
            placeholder="How are you feeling?" placeholderTextColor={colors.textLight}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    headerGradient: { paddingBottom: 0 },
    headerTitle: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A3A' },
    headerSub: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: '#6E5A8A', marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    addBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 13 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, gap: 8 },
    tabItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)' },
    tabLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 0 },

    emptyTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center', marginBottom: 8 },
    emptySub: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emptyHint: { textAlign: 'center', fontFamily: 'Nunito_400Regular', fontSize: 14, marginVertical: 24 },
    primaryBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24 },
    primaryBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 15 },

    card: { borderRadius: 18, padding: 16, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
    cardTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', marginBottom: 4, marginTop: 4 },
    sectionSub: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginBottom: 16 },

    phaseCard: { flexDirection: 'row', gap: 12, borderRadius: 20, padding: 16, borderWidth: 1.5, marginBottom: 12 },
    phaseEmoji: { fontSize: 36, alignSelf: 'flex-start' },
    phaseName: { fontSize: 16, fontFamily: 'Nunito_700Bold', marginBottom: 4 },
    phaseDesc: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 20, marginBottom: 12 },
    phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    phaseStat: { alignItems: 'center' },
    phaseStatVal: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
    phaseStatLabel: { fontSize: 10, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginTop: 2 },
    phaseDivider: { width: 1, height: 32 },
    phaseDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0002' },
    phaseDetailLabel: { fontSize: 13, fontFamily: 'Nunito_400Regular' },
    phaseDetailVal: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1, textAlign: 'right' },
    phaseOverviewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 8 },
    phaseOverviewEmoji: { fontSize: 26 },
    phaseOverviewName: { fontSize: 14, fontFamily: 'Nunito_700Bold', marginBottom: 2 },
    phaseOverviewDesc: { fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
    currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    currentBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Nunito_700Bold' },

    predRow: { flexDirection: 'row', justifyContent: 'space-around' },
    predItem: { alignItems: 'center', gap: 4 },
    predLabel: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
    predVal: { fontSize: 15, fontFamily: 'Nunito_700Bold' },

    todayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    todayChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
    todayChipEmoji: { fontSize: 16 },
    todayChipLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', textTransform: 'capitalize' },
    checkinPrompt: { padding: 14, borderRadius: 14, alignItems: 'center' },
    checkinPromptText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },

    moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    moodChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: '#0001', backgroundColor: '#0001' },
    moodEmoji: { fontSize: 22 },
    moodLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },

    energyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    energyChip: { flex: 1, minWidth: '30%', alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#0001', backgroundColor: '#0001' },
    energyBars: { fontSize: 13 },
    energyLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', marginTop: 2, textAlign: 'center' },

    symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    symptomChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1.5, borderColor: '#0001', backgroundColor: '#0001' },
    symptomLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

    painRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    painChip: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0001' },
    painNum: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
    painHint: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 8, textAlign: 'center' },

    savingText: { textAlign: 'center', fontFamily: 'Nunito_400Regular', fontSize: 13, marginBottom: 8 },
    savedText: { textAlign: 'center', fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginBottom: 8 },

    calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    calNavBtn: { padding: 8 },
    calMonthLabel: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    legendItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    legendLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
    calDayHeaders: { flexDirection: 'row', marginBottom: 4 },
    calDayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
    calDayNum: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
    calDayEmoji: { fontSize: 10 },
    calDayMood: { fontSize: 10 },

    logHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
    smallBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 13 },
    logCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
    logLeft: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    logEmoji: { fontSize: 22 },
    logDate: { fontSize: 14, fontFamily: 'Nunito_700Bold', marginBottom: 2 },
    logMeta: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
    logNotes: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 4, fontStyle: 'italic' },
    logActions: { alignItems: 'center', justifyContent: 'center' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBox: { flex: 1, minWidth: '44%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
    statVal: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
    statLabel: { fontSize: 11, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
    insightLine: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 22 },
    moodBarChart: { gap: 8, marginTop: 4 },
    moodBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    moodBarEmoji: { fontSize: 18, width: 24 },
    moodBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    moodBarFill: { height: '100%', borderRadius: 4 },
    moodBarCount: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', width: 24, textAlign: 'right' },
    symptomInsightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0001' },
    symptomInsightName: { fontSize: 14, fontFamily: 'Nunito_400Regular' },
    symptomInsightBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    symptomInsightCount: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

    selfCareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    selfCareCard: { width: '47%', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
    selfCareEmoji: { fontSize: 32 },
    selfCareLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
    selfCareTip: { fontSize: 12, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 18 },
    kitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
    kitEmoji: { fontSize: 20, width: 28 },
    kitLabel: { fontSize: 14, fontFamily: 'Nunito_400Regular' },

    modal: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24 },
    modalTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
    modalSave: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
    modalBody: { padding: 20, gap: 4 },
    modalLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'Nunito_400Regular' },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    flowRow: { flexDirection: 'row', gap: 10 },
    flowChip: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#0001', backgroundColor: '#0001', gap: 4 },
    flowEmoji: { fontSize: 18 },
    flowLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  });
}
