import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import NimbusBird from '@/components/NimbusBird';
import { loadProfile, saveProfile, type ProfileData, DEFAULT_PROFILE } from '@/lib/profileData';

const { width: SW } = Dimensions.get('window');

const CHAPTERS = [
  'Senior Year', 'Healing Era', 'Main Character Season',
  'Building My Future', 'Learning To Let Go', 'The Rebuild',
  'Gap Year', 'First Job', 'New Beginnings',
];

const ACHIEVEMENTS = [
  { emoji: '🌱', label: 'First Bloom',     desc: 'Wrote your first entry' },
  { emoji: '📸', label: 'Memory Keeper',   desc: 'Saved your first memory' },
  { emoji: '📚', label: 'Study Warrior',   desc: 'Logged a study session' },
  { emoji: '🌙', label: 'Midnight Writer', desc: 'Wrote after midnight' },
  { emoji: '⭐', label: 'Streak Starter',  desc: '3-day journaling streak' },
  { emoji: '💬', label: 'Unsent Soul',     desc: 'Wrote an unsent message' },
];

// ── Small field editor ─────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  icon?: string;
  iconColor?: string;
};

function EditableField({ label, value, placeholder, onSave, multiline, icon, iconColor }: FieldProps) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => { setEditing(false); onSave(draft.trim()); };

  if (editing) {
    return (
      <View style={[efStyles.wrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary + '60' }]}>
        <TextInput
          style={[efStyles.input, { color: colors.navy }, multiline && efStyles.multiInput]}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          multiline={multiline}
          autoFocus
          onBlur={commit}
        />
        <TouchableOpacity onPress={commit} style={[efStyles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={efStyles.saveTxt}>Save</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => setEditing(true)}
      activeOpacity={0.75}
      style={[efStyles.row, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      {icon && (
        <Ionicons name={icon as any} size={16} color={iconColor ?? colors.textMuted} style={{ marginRight: 4 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[efStyles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[efStyles.fieldValue, { color: value ? colors.navy : colors.textLight }]}>
          {value || placeholder}
        </Text>
      </View>
      <Ionicons name="pencil-outline" size={14} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const efStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, marginBottom: 8,
  },
  fieldLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  wrap: {
    borderRadius: 14, padding: 12, borderWidth: 1.5, marginBottom: 8, gap: 8,
  },
  input: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', minHeight: 36 },
  multiInput: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 12 },
  saveTxt: { color: '#fff', fontSize: 13, fontFamily: 'Nunito_700Bold' },
});

// ── Bucket list item ───────────────────────────────────────────────────────

function BucketItem({
  item, onToggle, onDelete,
}: { item: { text: string; done: boolean }; onToggle: () => void; onDelete: () => void }) {
  const colors = useColors();
  return (
    <View style={[biStyles.row, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <TouchableOpacity onPress={onToggle} style={[biStyles.check, item.done && { backgroundColor: colors.success }]}>
        {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
      </TouchableOpacity>
      <Text style={[biStyles.text, { color: item.done ? colors.textLight : colors.navy }, item.done && biStyles.done]}>
        {item.text}
      </Text>
      <TouchableOpacity onPress={onDelete}>
        <Ionicons name="close-circle-outline" size={18} color={colors.textLight} />
      </TouchableOpacity>
    </View>
  );
}

const biStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, marginBottom: 6,
  },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#5DB87A',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1, fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  done: { textDecorationLine: 'line-through' },
});

// ── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { diary, memories, habits, memorySlips } = useAppStore();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [profile, setProfile] = useState<ProfileData>({ ...DEFAULT_PROFILE });
  const [loaded, setLoaded] = useState(false);
  const [newBucket, setNewBucket] = useState('');
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  useEffect(() => {
    loadProfile().then(p => { setProfile(p); setLoaded(true); });
  }, []);

  const update = useCallback(async (patch: Partial<ProfileData>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    await saveProfile(next);
  }, [profile]);

  const addBucket = async () => {
    const text = newBucket.trim();
    if (!text) return;
    const bucketList = [...profile.bucketList, { text, done: false }];
    setNewBucket('');
    await update({ bucketList });
  };

  const toggleBucket = async (i: number) => {
    const bucketList = profile.bucketList.map((b, idx) =>
      idx === i ? { ...b, done: !b.done } : b
    );
    await update({ bucketList });
  };

  const deleteBucket = async (i: number) => {
    const bucketList = profile.bucketList.filter((_, idx) => idx !== i);
    await update({ bucketList });
  };

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // ── Archive score (0–100) ──
  const totalActions = diary.length + memories.length + habits.length + memorySlips.length;
  const archiveScore = Math.min(100, Math.round((totalActions / 50) * 100));

  // ── Life dashboard stats ──
  const dashStats = [
    { emoji: '📖', label: 'Diary Entries',     value: diary.length,       color: colors.primary },
    { emoji: '📸', label: 'Memories Saved',    value: memories.length,    color: '#C9AEED' },
    { emoji: '✅', label: 'Habits Tracked',    value: habits.length,      color: '#5DB87A' },
    { emoji: '💬', label: 'Memory Slips',      value: memorySlips.length, color: '#A78BFA' },
  ];

  // ── Join date display ──
  const joinDateStr = profile.joinDate
    ? new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Just now';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 8, paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>THE ARCHIVE OF BECOMING</Text>
            <Text style={[styles.pageTitle, { color: colors.navy }]}>Me, Myself & I</Text>
          </View>
        </View>

        {/* ── Hero card ── */}
        <LinearGradient
          colors={[colors.primary, colors.lavenderDeep]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Avatar */}
          <View style={styles.avatarRing}>
            <NimbusBird size={64} />
          </View>

          {/* Name row */}
          <View style={styles.heroText}>
            <Text style={styles.heroName}>
              {profile.name || user?.email?.split('@')[0] || 'Your Archive'}
            </Text>
            {profile.nickname ? (
              <Text style={styles.heroNick}>"{profile.nickname}"</Text>
            ) : null}
            {profile.motto ? (
              <Text style={styles.heroMotto}>✦ {profile.motto}</Text>
            ) : (
              <Text style={styles.heroMottoPH}>Add your motto below ↓</Text>
            )}
          </View>

          {/* Chapter badge */}
          {profile.currentChapter ? (
            <View style={styles.chapterBadge}>
              <Text style={styles.chapterBadgeText}>✦ {profile.currentChapter}</Text>
            </View>
          ) : null}

          {/* Join date */}
          <Text style={styles.joinDate}>Life in Drafts Member Since {joinDateStr}</Text>
        </LinearGradient>

        {/* ── Current chapter ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>✦ CURRENT CHAPTER</Text>
          <TouchableOpacity
            onPress={() => setShowChapterPicker(!showChapterPicker)}
            style={[styles.chapterRow, { borderColor: colors.border }]}
          >
            <Ionicons name="book-outline" size={18} color={colors.lavenderDeep} />
            <Text style={[styles.chapterText, { color: profile.currentChapter ? colors.navy : colors.textLight }]}>
              {profile.currentChapter || 'Name your current chapter…'}
            </Text>
            <Ionicons name={showChapterPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
          </TouchableOpacity>
          {showChapterPicker && (
            <View style={{ gap: 6, marginTop: 8 }}>
              {CHAPTERS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { update({ currentChapter: c }); setShowChapterPicker(false); }}
                  style={[styles.chapterOption, {
                    backgroundColor: profile.currentChapter === c ? colors.lavender + '60' : colors.surfaceAlt,
                    borderColor: profile.currentChapter === c ? colors.lavenderDeep : colors.borderLight,
                  }]}
                >
                  <Text style={[styles.chapterOptionText, { color: colors.navy }]}>{c}</Text>
                  {profile.currentChapter === c && <Ionicons name="checkmark" size={14} color={colors.lavenderDeep} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Letter to self ── */}
        <View style={[styles.card, { backgroundColor: colors.lavender + '30', shadowColor: colors.shadowDeep, borderColor: colors.lavenderDeep + '30', borderWidth: 1 }]}>
          <Text style={[styles.cardLabel, { color: colors.lavenderDeep }]}>💌 LETTER TO SELF</Text>
          <EditableField
            label="Your letter to your future self"
            value={profile.letterToSelf}
            placeholder={"\"Dear future me, I hope you're proud of how far we've come.\""}
            onSave={(v) => update({ letterToSelf: v })}
            multiline
          />
        </View>

        {/* ── Identity ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>👤 IDENTITY</Text>
          <EditableField label="Your Name" value={profile.name} placeholder="What do you call yourself?" onSave={(v) => update({ name: v })} icon="person-outline" iconColor={colors.primary} />
          <EditableField label="Nickname" value={profile.nickname} placeholder="What do your people call you?" onSave={(v) => update({ nickname: v })} icon="heart-outline" iconColor="#F4A261" />
          <EditableField label="Personal Motto" value={profile.motto} placeholder='"Still figuring it out."' onSave={(v) => update({ motto: v })} icon="sparkles-outline" iconColor={colors.lavenderDeep} />
        </View>

        {/* ── Life Dashboard ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>📊 LIFE DASHBOARD</Text>
          <View style={styles.dashGrid}>
            {dashStats.map(s => (
              <View key={s.label} style={[styles.dashCard, { backgroundColor: s.color + '12', borderColor: s.color + '30' }]}>
                <Text style={styles.dashEmoji}>{s.emoji}</Text>
                <Text style={[styles.dashValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.dashLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Archive score */}
          <View style={[styles.scoreWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <View style={styles.scoreTop}>
              <Text style={[styles.scoreTitle, { color: colors.navy }]}>✦ Archive Score</Text>
              <Text style={[styles.scoreNum, { color: colors.primary }]}>{archiveScore}%</Text>
            </View>
            <View style={[styles.scoreBar, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.scoreFill, { width: `${archiveScore}%` as any, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.scoreHint, { color: colors.textMuted }]}>
              {archiveScore < 30
                ? 'Your archive is just beginning to bloom. 🌱'
                : archiveScore < 70
                ? 'Your story is growing beautifully. ✦'
                : 'The Archive of Becoming is thriving. 🌟'}
            </Text>
          </View>
        </View>

        {/* ── About Me ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>🎨 ABOUT ME</Text>
          <EditableField label="Favorite Color" value={profile.favoriteColor} placeholder="e.g. Lavender blue" onSave={(v) => update({ favoriteColor: v })} icon="color-palette-outline" iconColor="#C9AEED" />
          <EditableField label="Favorite Song" value={profile.favoriteSong} placeholder="The one always on repeat" onSave={(v) => update({ favoriteSong: v })} icon="musical-notes-outline" iconColor="#FFCA6B" />
          <EditableField label="Favorite Book" value={profile.favoriteBook} placeholder="The one that changed you" onSave={(v) => update({ favoriteBook: v })} icon="library-outline" iconColor="#5BB8D4" />
          <EditableField label="Favorite Movie" value={profile.favoriteMovie} placeholder="Your comfort watch" onSave={(v) => update({ favoriteMovie: v })} icon="film-outline" iconColor="#F4A261" />
          <EditableField label="Dream Career" value={profile.dreamCareer} placeholder="What you're building toward" onSave={(v) => update({ dreamCareer: v })} icon="rocket-outline" iconColor="#5DB87A" />
          <EditableField label="Fun Fact About Me" value={profile.funFact} placeholder="Something surprising about you" onSave={(v) => update({ funFact: v })} icon="sparkles-outline" iconColor={colors.lavenderDeep} />
        </View>

        {/* ── Who I'm Becoming ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>🌟 WHO I'M BECOMING</Text>
          <EditableField
            label="My Dreams & Goals"
            value={profile.goals.join('\n')}
            placeholder={"Graduate\nTravel the world\nBecome someone I'm proud of"}
            onSave={(v) => update({ goals: v.split('\n').map(s => s.trim()).filter(Boolean) })}
            multiline
          />
        </View>

        {/* ── Bucket List ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>🪣 BUCKET LIST</Text>
          {profile.bucketList.map((b, i) => (
            <BucketItem
              key={i}
              item={b}
              onToggle={() => toggleBucket(i)}
              onDelete={() => deleteBucket(i)}
            />
          ))}
          <View style={[styles.bucketInputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <TextInput
              style={[styles.bucketInput, { color: colors.navy }]}
              value={newBucket}
              onChangeText={setNewBucket}
              placeholder="Add a dream…"
              placeholderTextColor={colors.textLight}
              onSubmitEditing={addBucket}
            />
            <TouchableOpacity onPress={addBucket} style={[styles.bucketAdd, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Achievements ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>🏅 ACHIEVEMENTS</Text>
          <View style={styles.achieveGrid}>
            {ACHIEVEMENTS.map((a) => {
              const earned =
                (a.label === 'First Bloom'    && diary.length >= 1) ||
                (a.label === 'Memory Keeper'  && memories.length >= 1) ||
                (a.label === 'Study Warrior'  && true) ||
                (a.label === 'Midnight Writer' && diary.some(e => new Date(e.createdAt?.seconds ? e.createdAt.seconds * 1000 : e.createdAt).getHours() >= 0 && new Date(e.createdAt?.seconds ? e.createdAt.seconds * 1000 : e.createdAt).getHours() < 5)) ||
                (a.label === 'Streak Starter' && diary.length >= 3) ||
                (a.label === 'Unsent Soul'    && memorySlips.length >= 1);
              return (
                <View
                  key={a.label}
                  style={[
                    styles.achieveCard,
                    {
                      backgroundColor: earned ? colors.accent + '20' : colors.surfaceAlt,
                      borderColor: earned ? colors.accentDeep + '50' : colors.borderLight,
                      opacity: earned ? 1 : 0.5,
                    },
                  ]}
                >
                  <Text style={styles.achieveEmoji}>{a.emoji}</Text>
                  <Text style={[styles.achieveLabel, { color: colors.navy }]}>{a.label}</Text>
                  <Text style={[styles.achieveDesc, { color: colors.textMuted }]}>{a.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Nimbus message ── */}
        <View style={[styles.nimbusWrap, { backgroundColor: colors.lavender + '30', borderColor: colors.lavenderDeep + '30' }]}>
          <NimbusBird size={44} />
          <Text style={[styles.nimbusMsg, { color: colors.navy }]}>
            {diary.length === 0
              ? '"You are the first page of this story."'
              : diary.length < 10
              ? '"Your story is still being written. Keep going."'
              : '"Look how far you\'ve come. This archive is proof."'}
          </Text>
        </View>

        <Text style={[styles.brand, { color: colors.textLight }]}>The Archive of Becoming</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 18 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  eyebrow: { fontSize: 9, fontFamily: 'Nunito_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
  pageTitle: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold' },

  heroCard: {
    borderRadius: 24, padding: 22, marginBottom: 16, gap: 10,
    alignItems: 'center',
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroText: { alignItems: 'center', gap: 4 },
  heroName: { color: '#fff', fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  heroNick: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: 'Nunito_400Regular', fontStyle: 'italic' },
  heroMotto: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  heroMottoPH: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Nunito_400Regular', fontStyle: 'italic' },
  chapterBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  chapterBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Nunito_700Bold' },
  joinDate: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Nunito_400Regular' },

  card: {
    borderRadius: 20, padding: 18, marginBottom: 14, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  cardLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },

  chapterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
  },
  chapterText: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  chapterOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  chapterOptionText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  dashGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dashCard: {
    width: (SW - 36 - 10 * 3) / 2 - 10,
    flex: 1, minWidth: '44%',
    borderRadius: 16, borderWidth: 1,
    padding: 14, alignItems: 'center', gap: 4,
  },
  dashEmoji: { fontSize: 24 },
  dashValue: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  dashLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },

  scoreWrap: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8, marginTop: 6 },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  scoreNum: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  scoreBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 4 },
  scoreHint: { fontSize: 12, fontFamily: 'Nunito_400Regular' },

  bucketInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, paddingLeft: 12, overflow: 'hidden', marginTop: 4,
  },
  bucketInput: { flex: 1, fontSize: 13, fontFamily: 'Nunito_600SemiBold', paddingVertical: 10 },
  bucketAdd: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achieveCard: {
    width: (SW - 36 - 10) / 3 - 7,
    flex: 1, minWidth: 90,
    borderRadius: 16, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 4,
  },
  achieveEmoji: { fontSize: 26 },
  achieveLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  achieveDesc: { fontSize: 10, fontFamily: 'Nunito_400Regular', textAlign: 'center' },

  nimbusWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  nimbusMsg: { flex: 1, fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 20, fontStyle: 'italic' },

  brand: { fontSize: 12, fontFamily: 'Nunito_400Regular', textAlign: 'center', letterSpacing: 0.5, marginTop: 8 },
});
