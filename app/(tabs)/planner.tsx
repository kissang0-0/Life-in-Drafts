import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { TodoCard } from '@/components/TodoCard';
import {
  addTodo,
  updateTodo,
  deleteTodo,
  Todo,
  TodoPriority,
  TodoRepeat,
  TodoType,
} from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';
import { todayString, formatDate } from '@/lib/dateUtils';

const CATEGORIES = [
  { label: '📚 School', value: 'School' },
  { label: '💪 Health', value: 'Health' },
  { label: '🏠 Personal', value: 'Personal' },
  { label: '💰 Finance', value: 'Finance' },
  { label: '🧠 Mental Health', value: 'Mental Health' },
  { label: '🎨 Hobby', value: 'Hobby' },
  { label: '🌱 Growth', value: 'Growth' },
  { label: '✨ Custom', value: 'Custom' },
];

const PRIORITIES: { label: string; value: TodoPriority; color: string }[] = [
  { label: 'Low', value: 'low', color: '#5DB87A' },
  { label: 'Medium', value: 'medium', color: '#F5B731' },
  { label: 'High', value: 'high', color: '#F5922F' },
  { label: 'Urgent', value: 'urgent', color: '#E8706A' },
];

const REPEATS: { label: string; value: TodoRepeat }[] = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const NIMBUS_MESSAGES_TODO = [
  'One step closer. 🌟',
  'Small wins become big victories.',
  'Every check mark is proof of progress.',
  "You're building the future version of you.",
  'Show up. That\'s all it takes today.',
];

const NIMBUS_MESSAGES_TODONT = [
  'Discipline is a form of self-love. 💙',
  'Saying no is saying yes to yourself.',
  'Every temptation resisted is a strength gained.',
  'You\'re stronger than the habit.',
  'The hardest part is the first choice.',
];

const todayDayOfWeek = new Date().getDay();

function isActiveToday(todo: Todo, today: string): boolean {
  if (todo.repeat === 'daily') return true;
  if (todo.repeat === 'weekdays') return todayDayOfWeek >= 1 && todayDayOfWeek <= 5;
  if (todo.repeat === 'none' || todo.repeat === 'weekly' || todo.repeat === 'monthly') return true;
  return true;
}

export default function PlannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const todos = useAppStore((s) => s.todos);
  const today = todayString();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80;

  const [activeTab, setActiveTab] = useState<TodoType>('todo');
  const [showCreate, setShowCreate] = useState(false);
  const [showReflect, setShowReflect] = useState(false);
  const [reflectTodo, setReflectTodo] = useState<Todo | null>(null);
  const [reflectText, setReflectText] = useState('');
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    type: 'todo' as TodoType,
    category: 'Personal',
    priority: 'medium' as TodoPriority,
    description: '',
    repeat: 'none' as TodoRepeat,
    requiresProof: false,
  });
  const [saving, setSaving] = useState(false);

  const nimbusMsg = useMemo(() => {
    const msgs = activeTab === 'todo' ? NIMBUS_MESSAGES_TODO : NIMBUS_MESSAGES_TODONT;
    return msgs[new Date().getDay() % msgs.length];
  }, [activeTab]);

  const activeTodos = useMemo(() =>
    todos.filter((t) => !t.isArchived && t.type === 'todo' && isActiveToday(t, today)),
    [todos, today]
  );

  const activeTodont = useMemo(() =>
    todos.filter((t) => !t.isArchived && t.type === 'todont' && isActiveToday(t, today)),
    [todos, today]
  );

  const completedTodayCount = useMemo(() =>
    todos.filter((t) => !t.isArchived && t.completedDates.includes(today)).length,
    [todos, today]
  );

  const totalActive = activeTodos.length + activeTodont.length;
  const remaining = totalActive - completedTodayCount;

  const longestStreak = useMemo(() =>
    todos.reduce((max, t) => Math.max(max, t.streak), 0),
    [todos]
  );

  const productivityScore = totalActive > 0
    ? Math.round((completedTodayCount / totalActive) * 100)
    : 0;

  const focusedTodos = useMemo(() =>
    todos.filter((t) => !t.isArchived && t.isFocused),
    [todos]
  );

  const displayed = activeTab === 'todo' ? activeTodos : activeTodont;

  const resetForm = () => {
    setForm({
      title: '',
      type: activeTab,
      category: 'Personal',
      priority: 'medium',
      description: '',
      repeat: 'none',
      requiresProof: false,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    try {
      await addTodo(user.uid, {
        title: form.title.trim(),
        type: form.type,
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        repeat: form.repeat,
        requiresProof: form.requiresProof,
        proofImageUri: '',
        completedDates: [],
        streak: 0,
        reflection: '',
        isArchived: false,
        isFocused: false,
      });
      setShowCreate(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    if (!user) return;
    const alreadyDone = todo.completedDates.includes(today);
    let newDates: string[];
    let newStreak = todo.streak;

    if (alreadyDone) {
      newDates = todo.completedDates.filter((d) => d !== today);
      newStreak = Math.max(0, todo.streak - 1);
    } else {
      if (todo.requiresProof && !todo.proofImageUri) {
        Alert.alert('Proof Required', 'This task requires proof before marking complete. Upload proof first.');
        return;
      }
      newDates = [...todo.completedDates, today];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yd = yesterday.toISOString().split('T')[0];
      newStreak = todo.completedDates.includes(yd) ? todo.streak + 1 : 1;
    }

    await updateTodo(user.uid, todo.id, { completedDates: newDates, streak: newStreak });
  };

  const handleDelete = async (todo: Todo) => {
    if (!user) return;
    await deleteTodo(user.uid, todo.id);
  };

  const handleUploadProof = async (todo: Todo) => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingProof(todo.id);
    try {
      const url = await uploadPhoto(user.uid, result.assets[0].uri);
      await updateTodo(user.uid, todo.id, { proofImageUri: url });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Upload failed', 'Could not upload proof image. Try again.');
    } finally {
      setUploadingProof(null);
    }
  };

  const handleOpenReflect = (todo: Todo) => {
    setReflectTodo(todo);
    setReflectText(todo.reflection || '');
    setShowReflect(true);
  };

  const handleSaveReflection = async () => {
    if (!reflectTodo || !user) return;
    await updateTodo(user.uid, reflectTodo.id, { reflection: reflectText.trim() });
    setShowReflect(false);
  };

  const handleFocusToggle = async (todo: Todo) => {
    if (!user) return;
    await updateTodo(user.uid, todo.id, { isFocused: !todo.isFocused });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.navy }]}>To Do/n't</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(new Date())}</Text>

        {/* Nimbus Dashboard Card */}
        <LinearGradient
          colors={activeTab === 'todo' ? ['#5BB8D4', '#3A9DBB'] : ['#B48DE8', '#8A62C8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nimbusCard}
        >
          <View style={styles.nimbusTop}>
            <View style={styles.nimbusLeft}>
              <Text style={styles.nimbusMsg}>{nimbusMsg}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{completedTodayCount}</Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{remaining}</Text>
                  <Text style={styles.statLabel}>Left</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{longestStreak}🔥</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNum}>{productivityScore}%</Text>
              <Text style={styles.scoreLabel}>Today</Text>
            </View>
          </View>
          {totalActive > 0 && (
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${productivityScore}%` as any },
                ]}
              />
            </View>
          )}
        </LinearGradient>

        {/* Daily Focus */}
        {focusedTodos.length > 0 && (
          <View style={styles.focusSection}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>⭐ Daily Focus</Text>
            {focusedTodos.slice(0, 3).map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                isCompletedToday={todo.completedDates.includes(today)}
                today={today}
                onToggle={() => handleToggle(todo)}
                onDelete={() => handleDelete(todo)}
                onUploadProof={() => handleUploadProof(todo)}
                onReflect={() => handleOpenReflect(todo)}
                onFocusToggle={() => handleFocusToggle(todo)}
              />
            ))}
          </View>
        )}

        {/* Tab Switcher */}
        <View style={[styles.tabSwitcher, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('todo')}
            style={[
              styles.tabBtn,
              activeTab === 'todo' && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={15}
              color={activeTab === 'todo' ? '#fff' : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: activeTab === 'todo' ? '#fff' : colors.textMuted }]}>
              To Do {activeTodos.length > 0 ? `(${activeTodos.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('todont')}
            style={[
              styles.tabBtn,
              activeTab === 'todont' && { backgroundColor: '#B48DE8' },
            ]}
          >
            <Ionicons
              name="ban-outline"
              size={15}
              color={activeTab === 'todont' ? '#fff' : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: activeTab === 'todont' ? '#fff' : colors.textMuted }]}>
              To Don't {activeTodont.length > 0 ? `(${activeTodont.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>
              {activeTab === 'todo' ? 'Tasks' : 'Avoidances'}
            </Text>
            <TouchableOpacity
              onPress={handleOpenCreate}
              style={[styles.addBtn, { backgroundColor: activeTab === 'todo' ? colors.primary + '20' : '#B48DE820' }]}
            >
              <Ionicons name="add" size={18} color={activeTab === 'todo' ? colors.primary : '#B48DE8'} />
            </TouchableOpacity>
          </View>

          {displayed.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.emptyBird}>🐦</Text>
              <Text style={[styles.emptyTitle, { color: colors.navy }]}>
                {activeTab === 'todo' ? 'Big goals begin with small checkboxes.' : 'Nothing to avoid yet.'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {activeTab === 'todo'
                  ? 'Add your first task and start making progress.'
                  : 'Add a habit you want to avoid and track your discipline.'}
              </Text>
              <TouchableOpacity
                onPress={handleOpenCreate}
                style={[styles.emptyBtn, { backgroundColor: activeTab === 'todo' ? colors.primary : '#B48DE8' }]}
              >
                <Text style={styles.emptyBtnText}>
                  {activeTab === 'todo' ? 'Create First Task' : 'Add Avoidance'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayed.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                isCompletedToday={todo.completedDates.includes(today)}
                today={today}
                onToggle={() => handleToggle(todo)}
                onDelete={() => handleDelete(todo)}
                onUploadProof={() => handleUploadProof(todo)}
                onReflect={() => handleOpenReflect(todo)}
                onFocusToggle={() => handleFocusToggle(todo)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={handleOpenCreate}
        style={[
          styles.fab,
          { backgroundColor: activeTab === 'todo' ? colors.primary : '#B48DE8', shadowColor: colors.primary },
        ]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Task Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.navy }]}>New Task</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Type toggle */}
            <View style={[styles.typeToggle, { backgroundColor: colors.surfaceAlt }]}>
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, type: 'todo' }))}
                style={[styles.typeBtn, form.type === 'todo' && { backgroundColor: colors.primary }]}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={form.type === 'todo' ? '#fff' : colors.textMuted} />
                <Text style={[styles.typeBtnText, { color: form.type === 'todo' ? '#fff' : colors.textMuted }]}>To Do</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, type: 'todont' }))}
                style={[styles.typeBtn, form.type === 'todont' && { backgroundColor: '#B48DE8' }]}
              >
                <Ionicons name="ban-outline" size={14} color={form.type === 'todont' ? '#fff' : colors.textMuted} />
                <Text style={[styles.typeBtnText, { color: form.type === 'todont' ? '#fff' : colors.textMuted }]}>To Don't</Text>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
              placeholder={form.type === 'todo' ? 'What do you want to do?' : 'What do you want to avoid?'}
              placeholderTextColor={colors.textLight}
              value={form.title}
              onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              autoFocus
              returnKeyType="next"
            />

            {/* Description */}
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textLight}
              value={form.description}
              onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              multiline
              numberOfLines={2}
            />

            {/* Category */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setForm((f) => ({ ...f, category: c.value }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: form.category === c.value ? colors.primary + '25' : colors.surfaceAlt,
                        borderColor: form.category === c.value ? colors.primary : 'transparent',
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: form.category === c.value ? colors.primary : colors.textMuted }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Priority */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setForm((f) => ({ ...f, priority: p.value }))}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: form.priority === p.value ? p.color : p.color + '18',
                    },
                  ]}
                >
                  <Text style={[styles.priorityChipText, { color: form.priority === p.value ? '#fff' : p.color }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Repeat */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Repeat</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chips}>
                {REPEATS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setForm((f) => ({ ...f, repeat: r.value }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: form.repeat === r.value ? colors.primary + '25' : colors.surfaceAlt,
                        borderColor: form.repeat === r.value ? colors.primary : 'transparent',
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: form.repeat === r.value ? colors.primary : colors.textMuted }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Requires Proof */}
            <View style={[styles.switchRow, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.switchLeft}>
                <Ionicons name="camera-outline" size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Require Proof</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Must upload photo to complete
                  </Text>
                </View>
              </View>
              <Switch
                value={form.requiresProof}
                onValueChange={(v) => setForm((f) => ({ ...f, requiresProof: v }))}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={form.requiresProof ? colors.primary : colors.textLight}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={!form.title.trim() || saving}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: form.type === 'todo' ? colors.primary : '#B48DE8',
                  opacity: !form.title.trim() ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : form.type === 'todo' ? '✓ Add Task' : '🚫 Add Avoidance'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Reflection Modal */}
      <Modal visible={showReflect} transparent animationType="slide" onRequestClose={() => setShowReflect(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReflect(false)} />
        <View style={[styles.reflectSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.navy, marginBottom: 6 }]}>Reflection</Text>
          <Text style={[styles.reflectPrompt, { color: colors.textMuted }]}>
            How did it go? What did you learn? How do you feel?
          </Text>
          <TextInput
            style={[styles.reflectInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
            placeholder="Write a short reflection..."
            placeholderTextColor={colors.textLight}
            value={reflectText}
            onChangeText={setReflectText}
            multiline
            numberOfLines={4}
            autoFocus
          />
          <TouchableOpacity
            onPress={handleSaveReflection}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.saveBtnText}>Save Reflection</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  date: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginBottom: 18 },

  nimbusCard: {
    borderRadius: 22, padding: 20, marginBottom: 20, gap: 14,
  },
  nimbusTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nimbusLeft: { flex: 1, gap: 12 },
  nimbusMsg: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem: { alignItems: 'center', gap: 1 },
  statNum: { color: '#fff', fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  scoreCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  scoreLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontFamily: 'Nunito_600SemiBold' },
  progressBarBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },

  focusSection: { marginBottom: 18 },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', marginBottom: 10 },

  tabSwitcher: {
    flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 18, gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 11,
  },
  tabText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  listSection: { marginBottom: 20 },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  addBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  emptyCard: {
    borderRadius: 20, padding: 28, alignItems: 'center', gap: 10,
  },
  emptyBird: { fontSize: 42 },
  emptyTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 18, maxWidth: 240 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold' },

  fab: {
    position: 'absolute', right: 20, bottom: 90,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '85%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },

  typeToggle: {
    flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 14, gap: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 9,
  },
  typeBtnText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  input: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 11, fontSize: 15, fontFamily: 'Nunito_400Regular',
    marginBottom: 12,
  },
  inputMulti: { minHeight: 60, textAlignVertical: 'top' },

  fieldLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsScroll: { marginBottom: 14 },
  chips: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  priorityChip: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', minWidth: 60 },
  priorityChipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 14, marginBottom: 18,
  },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  switchSub: { fontSize: 11, fontFamily: 'Nunito_400Regular' },

  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },

  reflectSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, gap: 12,
  },
  reflectPrompt: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  reflectInput: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 11, fontSize: 14, fontFamily: 'Nunito_400Regular',
    minHeight: 100, textAlignVertical: 'top',
  },
});
