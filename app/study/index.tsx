import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Platform, Pressable, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import NimbusBird from '@/components/NimbusBird';
import {
  addSubject, deleteSubject, Subject,
  addStudySession, StudySession, SessionType, CompletionStatus,
  addStudyDeadline, updateStudyDeadline, deleteStudyDeadline, StudyDeadline, DeadlineType, DeadlinePriority,
  addStudyNote, deleteStudyNote, StudyNote,
} from '@/lib/firestore';

const STUDY_MSGS = [
  "One page at a time.",
  "Progress counts, even when it's slow.",
  "Future you is grateful.",
  "Every expert was once a beginner.",
  "Consistency is your superpower.",
  "Small steps, big results.",
  "Your effort is already paying off.",
  "Keep going — you're doing great.",
];

const SUBJECT_COLORS = ['#5BB8D4','#B48DE8','#5DB87A','#F5A0B5','#F5A555','#3DBFB8','#FF8B8B','#7B68EE','#E8C96D','#FF7F50'];
const SUBJECT_ICONS  = ['📚','➗','🔬','💻','🎨','📖','🏛️','🌍','🎵','⚗️','📐','✏️','🧪','🏃','🎭','💡','📝','🔭'];
const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'reading',  label: 'Reading'   },
  { key: 'homework', label: 'Homework'  },
  { key: 'revision', label: 'Revision'  },
  { key: 'practice', label: 'Practice'  },
  { key: 'essay',    label: 'Essay'     },
  { key: 'other',    label: 'Other'     },
];
const DEADLINE_TYPES: { key: DeadlineType; label: string; emoji: string }[] = [
  { key: 'exam',         label: 'Exam',         emoji: '📅' },
  { key: 'assignment',   label: 'Assignment',   emoji: '📋' },
  { key: 'project',      label: 'Project',      emoji: '🗂️' },
  { key: 'essay',        label: 'Essay',        emoji: '✍️' },
  { key: 'presentation', label: 'Presentation', emoji: '🎤' },
];
const TIMER_DURATIONS = [
  { label: '15 min', seconds: 900  },
  { label: '25 min', seconds: 1500 },
  { label: '45 min', seconds: 2700 },
  { label: '60 min', seconds: 3600 },
];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysUntil(d: Date) {
  const now = new Date(); now.setHours(0,0,0,0);
  const t = new Date(d);  t.setHours(0,0,0,0);
  return Math.round((t.getTime()-now.getTime())/86400000);
}
function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60 > 0 ? `${m%60}m` : ''}`.trim();
}
function fmtTimer(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

export default function StudyScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const subjects = useAppStore((s) => s.subjects);
  const sessions = useAppStore((s) => s.studySessions);
  const deadlines= useAppStore((s) => s.studyDeadlines);
  const notes    = useAppStore((s) => s.studyNotes);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const today  = toYMD(new Date());
  const nimbusMsg = useMemo(() => STUDY_MSGS[new Date().getDate() % STUDY_MSGS.length], []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const todayMins = useMemo(
    () => sessions.filter(s => s.date === today).reduce((a,s) => a+s.durationMinutes, 0),
    [sessions, today]
  );
  const weekMins = useMemo(() => {
    const cut = new Date(); cut.setDate(cut.getDate()-6); cut.setHours(0,0,0,0);
    return sessions.filter(s => s.createdAt >= cut).reduce((a,s) => a+s.durationMinutes, 0);
  }, [sessions]);
  const streak = useMemo(() => {
    const days = new Set(sessions.map(s => s.date));
    let cnt = 0; const d = new Date();
    while (days.has(toYMD(d))) { cnt++; d.setDate(d.getDate()-1); }
    return cnt;
  }, [sessions]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'home'|'subjects'|'deadlines'|'notes'>('home');

  // ── Timer state ───────────────────────────────────────────────────────────
  const [showTimer, setShowTimer] = useState(false);
  const [timerPhase, setTimerPhase] = useState<'setup'|'active'|'done'>('setup');
  const [selectedSubject, setSelectedSubject] = useState<Subject|null>(null);
  const [goalText, setGoalText] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('revision');
  const [timerDuration, setTimerDuration] = useState(1500);
  const [timerSecs, setTimerSecs] = useState(1500);
  const [timerPaused, setTimerPaused] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('yes');
  const [reflection, setReflection] = useState('');
  const [actualMinutes, setActualMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const startTimeRef = useRef<Date|null>(null);

  useEffect(() => {
    if (timerPhase === 'active' && !timerPaused) {
      intervalRef.current = setInterval(() => {
        setTimerSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const elapsed = startTimeRef.current
              ? Math.round((Date.now() - startTimeRef.current.getTime()) / 60000)
              : Math.round(timerDuration / 60);
            setActualMinutes(elapsed);
            setTimerPhase('done');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerPhase, timerPaused]);

  const startTimer = () => {
    setTimerSecs(timerDuration);
    setTimerPaused(false);
    startTimeRef.current = new Date();
    setTimerPhase('active');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const endEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current.getTime()) / 60000)
      : Math.round((timerDuration - timerSecs) / 60);
    setActualMinutes(Math.max(1, elapsed));
    setTimerPhase('done');
  };

  const saveSession = async () => {
    if (!user || actualMinutes < 1) { closeTimer(); return; }
    try {
      await addStudySession(user.uid, {
        subjectId:        selectedSubject?.id ?? '',
        subjectName:      selectedSubject?.name ?? 'General',
        subjectColor:     selectedSubject?.color ?? colors.primary,
        durationMinutes:  actualMinutes,
        goalText,
        sessionType,
        completionStatus,
        reflection,
        mood: '',
        date: today,
      });
    } catch { /* silent */ }
    closeTimer();
  };

  const closeTimer = () => {
    setShowTimer(false);
    setTimerPhase('setup');
    setGoalText('');
    setReflection('');
    setTimerSecs(timerDuration);
    setTimerPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // ── Subjects modal ────────────────────────────────────────────────────────
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName]   = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [newSubjectIcon, setNewSubjectIcon]   = useState(SUBJECT_ICONS[0]);
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');

  const saveSubject = async () => {
    if (!newSubjectName.trim() || !user) return;
    await addSubject(user.uid, {
      name: newSubjectName.trim(), color: newSubjectColor,
      icon: newSubjectIcon, teacher: newSubjectTeacher.trim(),
      totalMinutes: 0,
    });
    setShowSubjectModal(false);
    setNewSubjectName(''); setNewSubjectTeacher('');
    setNewSubjectColor(SUBJECT_COLORS[0]); setNewSubjectIcon(SUBJECT_ICONS[0]);
  };

  const deleteSubjectConfirm = (s: Subject) => {
    Alert.alert('Delete Subject', `Delete "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => user && deleteSubject(user.uid, s.id) },
    ]);
  };

  // ── Deadlines modal ───────────────────────────────────────────────────────
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [dlTitle, setDlTitle]     = useState('');
  const [dlType, setDlType]       = useState<DeadlineType>('assignment');
  const [dlSubject, setDlSubject] = useState<Subject|null>(null);
  const [dlDueDate, setDlDueDate] = useState('');
  const [dlPriority, setDlPriority] = useState<DeadlinePriority>('medium');

  const saveDeadline = async () => {
    if (!dlTitle.trim() || !dlDueDate || !user) return;
    const [y,m,d] = dlDueDate.split('-').map(Number);
    await addStudyDeadline(user.uid, {
      title: dlTitle.trim(), type: dlType,
      subjectId: dlSubject?.id ?? '', subjectName: dlSubject?.name ?? '',
      dueDate: new Date(y, m-1, d),
      priority: dlPriority, status: 'pending',
    });
    setShowDeadlineModal(false);
    setDlTitle(''); setDlDueDate(''); setDlSubject(null);
  };

  const toggleDeadlineDone = async (dl: StudyDeadline) => {
    if (!user) return;
    await updateStudyDeadline(user.uid, dl.id, {
      status: dl.status === 'done' ? 'pending' : 'done',
    });
  };

  const deleteDeadlineConfirm = (dl: StudyDeadline) => {
    Alert.alert('Delete', `Remove "${dl.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => user && deleteStudyDeadline(user.uid, dl.id) },
    ]);
  };

  // ── Notes modal ───────────────────────────────────────────────────────────
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle]     = useState('');
  const [noteContent, setNoteContent] = useState('');

  const saveNote = async () => {
    if (!noteTitle.trim() || !user) return;
    await addStudyNote(user.uid, { title: noteTitle.trim(), content: noteContent.trim(), tags: [] });
    setShowNoteModal(false); setNoteTitle(''); setNoteContent('');
  };

  // ── Upcoming deadlines ────────────────────────────────────────────────────
  const pendingDeadlines = useMemo(
    () => deadlines.filter(d => d.status === 'pending').slice(0, 5),
    [deadlines]
  );

  // ── Priority color helper ─────────────────────────────────────────────────
  const priorityColor = (p: DeadlinePriority) =>
    p === 'high' ? '#FF6B6B' : p === 'medium' ? '#F5A555' : '#5DB87A';

  const deadlineDaysColor = (days: number) =>
    days < 0 ? '#FF6B6B' : days < 3 ? '#F5A555' : colors.primary;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Study Sanctuary</Text>
        <TouchableOpacity
          onPress={() => {
            if (tab === 'subjects') setShowSubjectModal(true);
            else if (tab === 'deadlines') setShowDeadlineModal(true);
            else if (tab === 'notes') setShowNoteModal(true);
            else setShowTimer(true);
          }}
          style={[styles.headerAction, { backgroundColor: colors.primary }]}
        >
          <Ionicons name={tab === 'home' ? 'play' : 'add'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['home','subjects','deadlines','notes'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, { color: tab===t ? colors.primary : colors.textMuted }]}>
              {t === 'home' ? 'Dashboard' : t.charAt(0).toUpperCase()+t.slice(1)}
            </Text>
            {tab === t && <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === 'web' ? 100 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── DASHBOARD ── */}
        {tab === 'home' && (
          <>
            {/* Nimbus Card */}
            <LinearGradient colors={['#3A7FC1','#5BB8D4']} style={styles.nimbusCard}>
              <View style={styles.nimbusRow}>
                <NimbusBird size={72} />
                <View style={styles.nimbusText}>
                  <Text style={styles.nimbusName}>✦ Nimbus</Text>
                  <Text style={styles.nimbusMsg}>{nimbusMsg}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{fmtMins(todayMins)}</Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{fmtMins(weekMins)}</Text>
                  <Text style={styles.statLabel}>This Week</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{streak}🔥</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Start Focus */}
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowTimer(true)}
            >
              <Ionicons name="play-circle" size={22} color="#fff" />
              <Text style={styles.startBtnText}>Start Focus Session</Text>
            </TouchableOpacity>

            {/* Upcoming Deadlines preview */}
            {pendingDeadlines.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.navy }]}>Upcoming</Text>
                  <TouchableOpacity onPress={() => setTab('deadlines')}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                  </TouchableOpacity>
                </View>
                {pendingDeadlines.slice(0,3).map(dl => {
                  const days = daysUntil(dl.dueDate);
                  const emoji = DEADLINE_TYPES.find(t=>t.key===dl.type)?.emoji ?? '📋';
                  return (
                    <View key={dl.id} style={[styles.dlCard, { backgroundColor: colors.surface }]}>
                      <Text style={styles.dlEmoji}>{emoji}</Text>
                      <View style={styles.dlInfo}>
                        <Text style={[styles.dlTitle, { color: colors.navy }]} numberOfLines={1}>{dl.title}</Text>
                        {dl.subjectName ? <Text style={[styles.dlSub, { color: colors.textMuted }]}>{dl.subjectName}</Text> : null}
                      </View>
                      <Text style={[styles.dlDays, { color: deadlineDaysColor(days) }]}>
                        {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            {/* Recent Sessions */}
            {sessions.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.navy, marginTop: 20 }]}>Recent Sessions</Text>
                {sessions.slice(0,3).map(s => (
                  <View key={s.id} style={[styles.sessionCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.sessionDot, { backgroundColor: s.subjectColor }]} />
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionSubject, { color: colors.navy }]}>{s.subjectName}</Text>
                      <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
                        {fmtMins(s.durationMinutes)} · {SESSION_TYPES.find(t=>t.key===s.sessionType)?.label}
                      </Text>
                    </View>
                    <View style={[styles.sessionBadge, {
                      backgroundColor: s.completionStatus === 'yes' ? '#5DB87A20' : s.completionStatus === 'partial' ? '#F5A55520' : '#FF6B6B20',
                    }]}>
                      <Text style={[styles.sessionBadgeText, {
                        color: s.completionStatus === 'yes' ? '#5DB87A' : s.completionStatus === 'partial' ? '#F5A555' : '#FF6B6B',
                      }]}>
                        {s.completionStatus === 'yes' ? '✓' : s.completionStatus === 'partial' ? '~' : '✗'}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Empty dashboard */}
            {sessions.length === 0 && pendingDeadlines.length === 0 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                <NimbusBird size={88} />
                <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
                <Text style={[styles.emptyTitle, { color: colors.navy }]}>Every expert started as a beginner.</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add your first subject and start your first session.</Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => { setTab('subjects'); setShowSubjectModal(true); }}>
                  <Text style={styles.emptyBtnText}>Create First Subject</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── SUBJECTS ── */}
        {tab === 'subjects' && (
          <>
            {subjects.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                <NimbusBird size={88} />
                <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
                <Text style={[styles.emptyTitle, { color: colors.navy }]}>No subjects yet.</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add your subjects to start tracking progress.</Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSubjectModal(true)}>
                  <Text style={styles.emptyBtnText}>Add First Subject</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.subjectGrid}>
                {subjects.map(s => {
                  const subSessions = sessions.filter(ss => ss.subjectId === s.id);
                  const subMins = subSessions.reduce((a,ss) => a+ss.durationMinutes, 0);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.subjectCard, { backgroundColor: colors.surface, borderTopColor: s.color, borderTopWidth: 4 }]}
                      onLongPress={() => deleteSubjectConfirm(s)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.subjectIcon}>{s.icon}</Text>
                      <Text style={[styles.subjectName, { color: colors.navy }]} numberOfLines={1}>{s.name}</Text>
                      <Text style={[styles.subjectHours, { color: s.color }]}>{fmtMins(subMins)}</Text>
                      {s.teacher ? <Text style={[styles.subjectTeacher, { color: colors.textMuted }]} numberOfLines={1}>{s.teacher}</Text> : null}
                      <TouchableOpacity
                        style={[styles.subjectStartBtn, { backgroundColor: s.color }]}
                        onPress={() => { setSelectedSubject(s); setShowTimer(true); }}
                      >
                        <Ionicons name="play" size={12} color="#fff" />
                        <Text style={styles.subjectStartText}>Study</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.subjectCard, styles.subjectAddCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  onPress={() => setShowSubjectModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={32} color={colors.textLight} />
                  <Text style={[styles.subjectName, { color: colors.textMuted }]}>Add Subject</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── DEADLINES ── */}
        {tab === 'deadlines' && (
          <>
            {deadlines.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                <NimbusBird size={88} />
                <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
                <Text style={[styles.emptyTitle, { color: colors.navy }]}>No deadlines yet.</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add exams and assignments to stay on top of your schedule.</Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowDeadlineModal(true)}>
                  <Text style={styles.emptyBtnText}>Add First Deadline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              deadlines.map(dl => {
                const days = daysUntil(dl.dueDate);
                const emoji = DEADLINE_TYPES.find(t=>t.key===dl.type)?.emoji ?? '📋';
                return (
                  <View key={dl.id} style={[styles.dlFullCard, { backgroundColor: colors.surface, opacity: dl.status === 'done' ? 0.55 : 1 }]}>
                    <TouchableOpacity onPress={() => toggleDeadlineDone(dl)} style={[styles.dlCheck, { borderColor: dl.status === 'done' ? '#5DB87A' : colors.border, backgroundColor: dl.status === 'done' ? '#5DB87A' : 'transparent' }]}>
                      {dl.status === 'done' && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                    <Text style={styles.dlEmoji}>{emoji}</Text>
                    <View style={styles.dlInfo}>
                      <Text style={[styles.dlTitle, { color: colors.navy, textDecorationLine: dl.status === 'done' ? 'line-through' : 'none' }]} numberOfLines={1}>{dl.title}</Text>
                      <View style={styles.dlMeta}>
                        {dl.subjectName ? <Text style={[styles.dlSub, { color: colors.textMuted }]}>{dl.subjectName}</Text> : null}
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor(dl.priority) + '25' }]}>
                          <Text style={[styles.priorityText, { color: priorityColor(dl.priority) }]}>{dl.priority}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.dlRight}>
                      <Text style={[styles.dlDays, { color: deadlineDaysColor(days) }]}>
                        {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
                      </Text>
                      <TouchableOpacity onPress={() => deleteDeadlineConfirm(dl)}>
                        <Ionicons name="trash-outline" size={16} color={colors.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── NOTES ── */}
        {tab === 'notes' && (
          <>
            {notes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                <NimbusBird size={88} />
                <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
                <Text style={[styles.emptyTitle, { color: colors.navy }]}>No study notes yet.</Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowNoteModal(true)}>
                  <Text style={styles.emptyBtnText}>Add First Note</Text>
                </TouchableOpacity>
              </View>
            ) : (
              notes.map(note => (
                <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.noteContent}>
                    <Text style={[styles.noteTitle, { color: colors.navy }]} numberOfLines={1}>{note.title}</Text>
                    {note.content ? <Text style={[styles.notePreview, { color: colors.textMuted }]} numberOfLines={2}>{note.content}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => user && Alert.alert('Delete Note', `Remove "${note.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteStudyNote(user.uid, note.id) },
                  ])}>
                    <Ionicons name="trash-outline" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ── TIMER MODAL ─────────────────────────────────────────────────────── */}
      <Modal visible={showTimer} animationType="slide" onRequestClose={closeTimer}>
        <View style={[styles.timerRoot, { backgroundColor: colors.background, paddingTop: topPad }]}>

          {/* Setup phase */}
          {timerPhase === 'setup' && (
            <ScrollView contentContainerStyle={styles.timerScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.timerSetupHeader}>
                <TouchableOpacity onPress={closeTimer}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={[styles.timerSetupTitle, { color: colors.navy }]}>Focus Session</Text>
                <View style={{ width: 24 }} />
              </View>

              <Text style={[styles.setupLabel, { color: colors.textMuted }]}>SUBJECT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
                <TouchableOpacity
                  style={[styles.subjectChip, { backgroundColor: selectedSubject===null ? colors.navy : colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => setSelectedSubject(null)}
                >
                  <Text style={[styles.subjectChipText, { color: selectedSubject===null ? '#fff' : colors.text }]}>General</Text>
                </TouchableOpacity>
                {subjects.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.subjectChip, { backgroundColor: selectedSubject?.id===s.id ? s.color : colors.surfaceAlt, borderColor: s.color }]}
                    onPress={() => setSelectedSubject(s)}
                  >
                    <Text style={styles.subjectChipEmoji}>{s.icon}</Text>
                    <Text style={[styles.subjectChipText, { color: selectedSubject?.id===s.id ? '#fff' : colors.text }]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.setupLabel, { color: colors.textMuted }]}>SESSION GOAL</Text>
              <TextInput
                style={[styles.goalInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.navy }]}
                placeholder="What do you want to accomplish?"
                placeholderTextColor={colors.textLight}
                value={goalText}
                onChangeText={setGoalText}
              />

              <Text style={[styles.setupLabel, { color: colors.textMuted }]}>SESSION TYPE</Text>
              <View style={styles.typeGrid}>
                {SESSION_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setSessionType(t.key)}
                    style={[styles.typeChip, { backgroundColor: sessionType===t.key ? colors.primary : colors.surfaceAlt, borderColor: sessionType===t.key ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.typeChipText, { color: sessionType===t.key ? '#fff' : colors.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.setupLabel, { color: colors.textMuted }]}>DURATION</Text>
              <View style={styles.durationRow}>
                {TIMER_DURATIONS.map(d => (
                  <TouchableOpacity
                    key={d.seconds}
                    onPress={() => { setTimerDuration(d.seconds); setTimerSecs(d.seconds); }}
                    style={[styles.durationChip, { backgroundColor: timerDuration===d.seconds ? colors.primary : colors.surfaceAlt, borderColor: timerDuration===d.seconds ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.durationChipText, { color: timerDuration===d.seconds ? '#fff' : colors.text }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.startBigBtn, { backgroundColor: colors.primary }]} onPress={startTimer}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startBigBtnText}>Start Session</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Active phase */}
          {timerPhase === 'active' && (
            <View style={styles.timerActive}>
              <TouchableOpacity onPress={() => Alert.alert('End Session?', 'End the session early?', [
                { text: 'Keep Going', style: 'cancel' },
                { text: 'End Now', style: 'destructive', onPress: endEarly },
              ])} style={styles.timerCloseBtn}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>

              <NimbusBird size={80} />
              <Text style={styles.timerSubjectLabel}>
                {selectedSubject ? `${selectedSubject.icon} ${selectedSubject.name}` : '📚 General'}
              </Text>
              {goalText ? <Text style={styles.timerGoalLabel} numberOfLines={2}>{goalText}</Text> : null}

              <Text style={styles.timerBigClock}>{fmtTimer(timerSecs)}</Text>
              <Text style={styles.timerType}>{SESSION_TYPES.find(t=>t.key===sessionType)?.label}</Text>

              <View style={styles.timerControls}>
                <TouchableOpacity
                  style={styles.timerControlBtn}
                  onPress={() => setTimerPaused(p => !p)}
                >
                  <Ionicons name={timerPaused ? 'play' : 'pause'} size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.timerControlBtn, styles.timerEndBtn]} onPress={endEarly}>
                  <Ionicons name="stop" size={24} color="#fff" />
                  <Text style={styles.timerEndText}>End</Text>
                </TouchableOpacity>
              </View>
              {timerPaused && <Text style={styles.pausedLabel}>Paused</Text>}
            </View>
          )}

          {/* Done phase */}
          {timerPhase === 'done' && (
            <ScrollView contentContainerStyle={styles.timerScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.doneHeader}>
                <NimbusBird size={80} />
                <Text style={styles.doneTitleText}>Session Complete!</Text>
                <Text style={styles.doneTime}>You studied for {fmtMins(actualMinutes)}</Text>
              </View>

              <Text style={[styles.setupLabel, { color: colors.textMuted }]}>DID YOU COMPLETE YOUR GOAL?</Text>
              <View style={styles.completionRow}>
                {(['yes','partial','no'] as CompletionStatus[]).map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCompletionStatus(c)}
                    style={[styles.completionBtn, {
                      backgroundColor: completionStatus===c
                        ? (c==='yes' ? '#5DB87A' : c==='partial' ? '#F5A555' : '#FF6B6B')
                        : colors.surfaceAlt,
                      borderColor: c==='yes' ? '#5DB87A' : c==='partial' ? '#F5A555' : '#FF6B6B',
                    }]}
                  >
                    <Text style={[styles.completionText, { color: completionStatus===c ? '#fff' : colors.text }]}>
                      {c === 'yes' ? '✓ Yes' : c === 'partial' ? '~ Partly' : '✗ Not yet'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.setupLabel, { color: colors.textMuted }]}>REFLECTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.reflectionInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.navy }]}
                placeholder="What did you learn? What was hard?"
                placeholderTextColor={colors.textLight}
                value={reflection}
                onChangeText={setReflection}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity style={[styles.startBigBtn, { backgroundColor: '#5DB87A' }]} onPress={saveSession}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.startBigBtnText}>Save Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={closeTimer}>
                <Text style={[styles.skipText, { color: colors.textMuted }]}>Discard</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── ADD SUBJECT MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showSubjectModal} transparent animationType="slide" onRequestClose={() => setShowSubjectModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSubjectModal(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.navy }]}>New Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.navy }]}
              placeholder="Subject name"
              placeholderTextColor={colors.textLight}
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              autoFocus
            />
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.navy }]}
              placeholder="Teacher (optional)"
              placeholderTextColor={colors.textLight}
              value={newSubjectTeacher}
              onChangeText={setNewSubjectTeacher}
            />
            <Text style={[styles.setupLabel, { color: colors.textMuted }]}>ICON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {SUBJECT_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setNewSubjectIcon(ic)}
                  style={[styles.iconBtn, newSubjectIcon===ic && { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}
                >
                  <Text style={styles.iconBtnText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.setupLabel, { color: colors.textMuted }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {SUBJECT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewSubjectColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, newSubjectColor===c && styles.colorDotSelected]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: colors.primary, opacity: !newSubjectName.trim() ? 0.4 : 1 }]}
              onPress={saveSubject}
              disabled={!newSubjectName.trim()}
            >
              <Text style={styles.sheetBtnText}>Add Subject</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── ADD DEADLINE MODAL ────────────────────────────────────────────── */}
      <Modal visible={showDeadlineModal} transparent animationType="slide" onRequestClose={() => setShowDeadlineModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeadlineModal(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.navy }]}>Add Deadline</Text>
              <TouchableOpacity onPress={() => setShowDeadlineModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.navy }]}
              placeholder="Title (e.g. Final Exam, Science Essay)"
              placeholderTextColor={colors.textLight}
              value={dlTitle}
              onChangeText={setDlTitle}
              autoFocus
            />
            <Text style={[styles.setupLabel, { color: colors.textMuted }]}>TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {DEADLINE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setDlType(t.key)}
                  style={[styles.typeChip, { marginRight: 8, backgroundColor: dlType===t.key ? colors.primary : colors.surfaceAlt, borderColor: dlType===t.key ? colors.primary : colors.border }]}
                >
                  <Text>{t.emoji}</Text>
                  <Text style={[styles.typeChipText, { color: dlType===t.key ? '#fff' : colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.setupLabel, { color: colors.textMuted }]}>SUBJECT (OPTIONAL)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setDlSubject(null)}
                style={[styles.subjectChip, { backgroundColor: dlSubject===null ? colors.navy : colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Text style={[styles.subjectChipText, { color: dlSubject===null ? '#fff' : colors.text }]}>None</Text>
              </TouchableOpacity>
              {subjects.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setDlSubject(s)}
                  style={[styles.subjectChip, { backgroundColor: dlSubject?.id===s.id ? s.color : colors.surfaceAlt, borderColor: s.color }]}
                >
                  <Text>{s.icon}</Text>
                  <Text style={[styles.subjectChipText, { color: dlSubject?.id===s.id ? '#fff' : colors.text }]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.setupLabel, { color: colors.textMuted }]}>DUE DATE</Text>
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.navy }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textLight}
              value={dlDueDate}
              onChangeText={setDlDueDate}
            />
            <Text style={[styles.setupLabel, { color: colors.textMuted }]}>PRIORITY</Text>
            <View style={styles.durationRow}>
              {(['low','medium','high'] as DeadlinePriority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setDlPriority(p)}
                  style={[styles.durationChip, { flex: 1, backgroundColor: dlPriority===p ? priorityColor(p) : colors.surfaceAlt, borderColor: priorityColor(p) }]}
                >
                  <Text style={[styles.durationChipText, { color: dlPriority===p ? '#fff' : colors.text }]}>{p.charAt(0).toUpperCase()+p.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: colors.primary, opacity: (!dlTitle.trim() || !dlDueDate) ? 0.4 : 1 }]}
              onPress={saveDeadline}
              disabled={!dlTitle.trim() || !dlDueDate}
            >
              <Text style={styles.sheetBtnText}>Add Deadline</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── ADD NOTE MODAL ────────────────────────────────────────────────── */}
      <Modal visible={showNoteModal} transparent animationType="slide" onRequestClose={() => setShowNoteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNoteModal(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.navy }]}>New Note</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.navy }]}
              placeholder="Title"
              placeholderTextColor={colors.textLight}
              value={noteTitle}
              onChangeText={setNoteTitle}
              autoFocus
            />
            <TextInput
              style={[styles.sheetTextarea, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.navy }]}
              placeholder="Write your notes…"
              placeholderTextColor={colors.textLight}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: colors.primary, opacity: !noteTitle.trim() ? 0.4 : 1 }]}
              onPress={saveNote}
              disabled={!noteTitle.trim()}
            >
              <Text style={styles.sheetBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  headerAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 2 },
  scroll: { padding: 16 },

  nimbusCard: { borderRadius: 22, padding: 18, gap: 14, marginBottom: 16 },
  nimbusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nimbusText: { flex: 1, gap: 4 },
  nimbusName: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  nimbusMsg: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { color: '#fff', fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 20, paddingVertical: 14, marginBottom: 24 },
  startBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  seeAll: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  dlCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width:0,height:1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dlEmoji: { fontSize: 20 },
  dlInfo: { flex: 1 },
  dlTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  dlSub: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  dlDays: { fontSize: 13, fontFamily: 'Nunito_700Bold', minWidth: 44, textAlign: 'right' },

  dlFullCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width:0,height:1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dlCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dlMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dlRight: { alignItems: 'flex-end', gap: 6 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontFamily: 'Nunito_700Bold' },

  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width:0,height:1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionInfo: { flex: 1, gap: 2 },
  sessionSubject: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  sessionMeta: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  sessionBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sessionBadgeText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subjectCard: { width: '47%', borderRadius: 18, padding: 16, gap: 6, shadowColor: '#000', shadowOffset: { width:0,height:2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  subjectAddCard: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  subjectIcon: { fontSize: 28 },
  subjectName: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  subjectHours: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  subjectTeacher: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  subjectStartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4, alignSelf: 'flex-start' },
  subjectStartText: { color: '#fff', fontSize: 12, fontFamily: 'Nunito_700Bold' },

  noteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width:0,height:1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  noteContent: { flex: 1, gap: 4 },
  noteTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  notePreview: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },

  emptyCard: { borderRadius: 24, padding: 32, alignItems: 'center', gap: 10, marginTop: 20 },
  nimbusLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  emptyTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 6 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },

  // Timer
  timerRoot: { flex: 1 },
  timerScroll: { padding: 20, paddingBottom: 60 },
  timerSetupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  timerSetupTitle: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  setupLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  subjectPicker: { marginBottom: 16 },
  subjectChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  subjectChipEmoji: { fontSize: 14 },
  subjectChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  goalInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Nunito_400Regular', marginBottom: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  typeChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  durationChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  durationChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  startBigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 22, paddingVertical: 16, marginTop: 8 },
  startBigBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },

  timerActive: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#0F2744', paddingHorizontal: 32 },
  timerCloseBtn: { position: 'absolute', top: 16, right: 16 },
  timerSubjectLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontFamily: 'Nunito_700Bold', marginTop: 8 },
  timerGoalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  timerBigClock: { color: '#fff', fontSize: 72, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 2, marginVertical: 8 },
  timerType: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'Nunito_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' },
  timerControls: { flexDirection: 'row', gap: 16, marginTop: 24 },
  timerControlBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  timerEndBtn: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, width: 'auto', borderRadius: 32 },
  timerEndText: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold' },
  pausedLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  doneHeader: { alignItems: 'center', gap: 8, marginBottom: 28 },
  doneTitleText: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', color: '#5DB87A' },
  doneTime: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#666' },
  completionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  completionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  completionText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  reflectionInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 90, marginBottom: 16 },
  skipBtn: { alignItems: 'center', marginTop: 12 },
  skipText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 12, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  sheetInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  sheetTextarea: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100 },
  sheetBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  sheetBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6, borderWidth: 1.5, borderColor: 'transparent' },
  iconBtnText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width:0,height:2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
});
