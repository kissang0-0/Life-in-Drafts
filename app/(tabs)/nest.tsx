import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import NimbusBird from '@/components/NimbusBird';
import { buildNimbusContext, getRandomMemory } from '@/lib/nimbusContext';
import { sendToNimbus, type ChatMsg } from '@/lib/nimbusApi';
import {
  subscribeNimbusChats, addNimbusChatMsg, toggleFavoriteMsg,
  deleteAllNimbusChats, getLastCheckinDate, type NimbusChatMsg,
} from '@/lib/nimbusFirestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayMsg = {
  id: string;
  role: 'user' | 'nimbus';
  content: string;
  mode: string | null;
  isFavorite: boolean;
  isOptimistic?: boolean;
};

type QuickAction = {
  emoji: string;
  label: string;
  mode: string;
  starter: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { emoji: '💭', label: 'Reflect',        mode: 'reflect',    starter: "I'd like to reflect on how I've been feeling." },
  { emoji: '📖', label: 'Journal',        mode: 'journal',    starter: "Can you help me journal today?" },
  { emoji: '📚', label: 'Study Buddy',    mode: 'study',      starter: "I could use some study support." },
  { emoji: '🌱', label: 'Motivation',     mode: 'motivation', starter: "I need a little encouragement right now." },
  { emoji: '🫂', label: 'Vent',           mode: 'vent',       starter: "I just need to get something off my chest." },
  { emoji: '⭐', label: 'Show A Memory',  mode: 'memory',     starter: '__memory__' },
  { emoji: '🎯', label: 'Help Me Decide', mode: 'decide',     starter: "I'm trying to decide something and could use your help." },
];

// ─── Stars ────────────────────────────────────────────────────────────────────

const STAR_POSITIONS = [
  { x: '8%', y: 60 }, { x: '22%', y: 30 }, { x: '40%', y: 50 },
  { x: '58%', y: 20 }, { x: '72%', y: 55 }, { x: '88%', y: 35 },
  { x: '15%', y: 90 }, { x: '50%', y: 80 }, { x: '80%', y: 85 },
  { x: '33%', y: 110 }, { x: '65%', y: 105 }, { x: '92%', y: 70 },
];

function StarField({ topOffset }: { topOffset: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {STAR_POSITIONS.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: s.x as any,
            top: topOffset + s.y,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: 2,
            backgroundColor: '#FFFFFF',
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2 + (i % 4) * 0.1, 0.7 + (i % 3) * 0.1] }),
          }}
        />
      ))}
    </View>
  );
}

// ─── Floating cloud ───────────────────────────────────────────────────────────

function FloatCloud({ x, y, size, delay }: { x: number | string; y: number; size: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 5000 + delay * 400, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration: 5000 + delay * 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const tY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const tX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject as any,
        { left: x, top: y, fontSize: size, position: 'absolute', opacity: 0.15, transform: [{ translateY: tY }, { translateX: tX }] },
      ]}
    >
      ☁️
    </Animated.Text>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  const colors = useColors();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={styles.typingRow}>
      <View style={styles.nimbusAvatarSm}>
        <NimbusBird size={20} />
      </View>
      <View style={[styles.nimbusBubble, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.dotsRow}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: colors.primary, transform: [{ translateY: d }] }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

type BubbleProps = {
  msg: DisplayMsg;
  onFavorite: (id: string, isFav: boolean) => void;
  colors: ReturnType<typeof useColors>;
};

function MsgBubble({ msg, onFavorite, colors }: BubbleProps) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowNimbus]}>
      {!isUser && (
        <View style={styles.nimbusAvatarSm}>
          <NimbusBird size={20} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: colors.primary }]
          : [styles.nimbusBubble, { backgroundColor: colors.surface, borderColor: colors.borderLight }],
        msg.isOptimistic && { opacity: 0.7 },
      ]}>
        {!isUser && msg.mode && (
          <Text style={[styles.modeTag, { color: colors.textLight }]}>
            {QUICK_ACTIONS.find((q) => q.mode === msg.mode)?.emoji ?? '✨'} {msg.mode}
          </Text>
        )}
        <Text style={[styles.bubbleText, { color: isUser ? '#FFFFFF' : colors.text }]}>
          {msg.content}
        </Text>
        {!msg.isOptimistic && !isUser && (
          <TouchableOpacity
            onPress={() => onFavorite(msg.id, !msg.isFavorite)}
            style={styles.favBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={msg.isFavorite ? 'star' : 'star-outline'}
              size={12}
              color={msg.isFavorite ? colors.accentDeep : colors.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyNest({ onStart, colors }: { onStart: () => void; colors: ReturnType<typeof useColors> }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 1800, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.emptyState}>
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <NimbusBird size={90} />
      </Animated.View>
      <Text style={[styles.emptyHi, { color: colors.navy }]}>Hi. I'm Nimbus.</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        I'm here whenever you need a place for your thoughts.
      </Text>
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: colors.primary }]}
        onPress={onStart}
        activeOpacity={0.85}
      >
        <Text style={styles.startBtnText}>Start Conversation</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { user } = useAuthStore();
  const appStore = useAppStore();

  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const listRef = useRef<FlatList<DisplayMsg>>(null);
  const inputRef = useRef<TextInput>(null);
  const historyRef = useRef<ChatMsg[]>([]);

  // ── Load chat history from Firestore ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeNimbusChats(user.uid, (msgs) => {
      setMessages(msgs.map((m) => ({ ...m, isOptimistic: false })));
      historyRef.current = msgs.map((m) => ({
        role: m.role === 'nimbus' ? 'assistant' : 'user',
        content: m.content,
      }));
      setHasLoaded(true);
    });
    return unsub;
  }, [user?.uid]);

  // ── Daily check-in ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !hasLoaded) return;
    const today = new Date().toISOString().split('T')[0];
    getLastCheckinDate(user.uid).then((lastDate) => {
      if (lastDate !== today && messages.length === 0) {
        setTimeout(() => handleSend('__checkin__', 'checkin'), 800);
      }
    });
  }, [hasLoaded, user?.uid]);

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isTyping]);

  // ── Build context ──────────────────────────────────────────────────────
  const context = useMemo(() =>
    buildNimbusContext({
      diary: appStore.diary,
      habits: appStore.habits,
      todos: appStore.todos,
      studySessions: appStore.studySessions,
      memorySlips: appStore.memorySlips,
      socialPosts: appStore.socialPosts,
      todayMood: appStore.todayMood,
    }),
    [appStore.diary, appStore.habits, appStore.todos, appStore.studySessions, appStore.todayMood]
  );

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string, mode?: string) => {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed && mode !== '__checkin__') return;

    const currentMode = mode ?? activeMode;

    // Handle memory mode
    let userContent = trimmed;
    let contextAddition = context;
    if (trimmed === '__memory__' || (currentMode === 'memory' && trimmed === '__memory__')) {
      const mem = getRandomMemory(appStore.memorySlips);
      if (mem) {
        userContent = `Show me a memory.`;
        contextAddition = `${context}\n\nMemory to share: "${mem.title}" — ${mem.content?.slice(0, 150) ?? ''}${mem.mood ? ` (Mood: ${mem.mood})` : ''}`;
      } else {
        userContent = `Show me a memory from my archive.`;
      }
    }

    // Handle daily check-in silently
    if (mode === 'checkin') {
      const checkinPrompt = "Give a warm daily greeting check-in (don't mention it's a daily check-in explicitly). Ask how they're feeling today in a natural, friendly way.";
      setIsTyping(true);
      try {
        const reply = await sendToNimbus({ messages: [], context: contextAddition, mode: 'checkin' });
        const nimbusId = `nimbus-${Date.now()}`;
        const nimbusMsg: DisplayMsg = { id: nimbusId, role: 'nimbus', content: reply, mode: 'checkin', isFavorite: false };
        setMessages((prev) => [...prev, nimbusMsg]);
        historyRef.current.push({ role: 'assistant', content: reply });
        await addNimbusChatMsg(user.uid, { role: 'nimbus', content: reply, mode: 'checkin', isFavorite: false });
      } catch {
        // Silent fail for check-in
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMsg: DisplayMsg = { id: tempId, role: 'user', content: userContent, mode: currentMode, isFavorite: false, isOptimistic: true };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setShowQuickPanel(false);
    setIsTyping(true);

    // Save user message to Firestore
    let savedId = tempId;
    try {
      const ref = await addNimbusChatMsg(user.uid, { role: 'user', content: userContent, mode: currentMode, isFavorite: false });
      savedId = ref.id;
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: savedId, isOptimistic: false } : m));
    } catch { /* keep optimistic */ }

    // Build API message history
    const apiMessages: ChatMsg[] = [
      ...historyRef.current.slice(-12),
      { role: 'user', content: userContent },
    ];
    historyRef.current.push({ role: 'user', content: userContent });

    try {
      const reply = await sendToNimbus({ messages: apiMessages, context: contextAddition, mode: currentMode });
      const nimbusId = `nimbus-${Date.now()}`;
      const nimbusMsg: DisplayMsg = { id: nimbusId, role: 'nimbus', content: reply, mode: currentMode, isFavorite: false };
      setMessages((prev) => [...prev, nimbusMsg]);
      historyRef.current.push({ role: 'assistant', content: reply });
      await addNimbusChatMsg(user.uid, { role: 'nimbus', content: reply, mode: currentMode, isFavorite: false });
    } catch (err: any) {
      const errMsg = err?.message ?? 'Something went quiet for a moment. Try again?';
      const errDisplay: DisplayMsg = { id: `err-${Date.now()}`, role: 'nimbus', content: errMsg, mode: null, isFavorite: false };
      setMessages((prev) => [...prev, errDisplay]);
    } finally {
      setIsTyping(false);
    }
  }, [user, activeMode, context, appStore.memorySlips]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    setActiveMode(action.mode);
    handleSend(action.starter, action.mode);
  }, [handleSend]);

  const handleFavorite = useCallback((id: string, isFav: boolean) => {
    if (!user) return;
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, isFavorite: isFav } : m));
    toggleFavoriteMsg(user.uid, id, isFav).catch(() => {});
  }, [user]);

  const handleDeleteConversation = useCallback(() => {
    if (!user || messages.length === 0) return;
    Alert.alert(
      'Clear conversation?',
      'This will permanently delete all messages with Nimbus. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            historyRef.current = [];
            setActiveMode(null);
            try {
              await deleteAllNimbusChats(user.uid);
            } catch {
              // Already cleared locally
            }
          },
        },
      ]
    );
  }, [user, messages.length]);

  const showEmpty = hasLoaded && messages.length === 0 && !isTyping;

  const renderItem = useCallback(({ item }: { item: DisplayMsg }) => (
    <MsgBubble msg={item} onFavorite={handleFavorite} colors={colors} />
  ), [handleFavorite, colors]);

  const keyExtractor = useCallback((item: DisplayMsg) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#C4D9F5', '#D8C8F0', '#C0D0F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Stars */}
      <StarField topOffset={topPad} />

      {/* Floating clouds */}
      <FloatCloud x={10}  y={topPad + 40}  size={30} delay={0} />
      <FloatCloud x={220} y={topPad + 20}  size={22} delay={2} />
      <FloatCloud x={130} y={topPad + 80}  size={18} delay={1} />
      <FloatCloud x={290} y={topPad + 60}  size={26} delay={3} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrap}>
              <NimbusBird size={38} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: '#0F2744' }]}>Nimbus' Nest</Text>
              <Text style={[styles.headerSub, { color: '#4A6A85' }]}>A place to think out loud.</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {messages.length > 0 && (
              <TouchableOpacity
                onPress={handleDeleteConversation}
                style={[styles.sparkBtn, { backgroundColor: '#FFFFFF50' }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color="#0F2744" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowQuickPanel((v) => !v)}
              style={[styles.sparkBtn, { backgroundColor: showQuickPanel ? '#5BB8D430' : '#FFFFFF50' }]}
            >
              <Ionicons name="sparkles-outline" size={18} color="#0F2744" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.messageList,
            showEmpty && styles.messageListEmpty,
          ]}
          ListEmptyComponent={
            showEmpty ? (
              <EmptyNest onStart={() => setShowQuickPanel(true)} colors={colors} />
            ) : null
          }
          ListFooterComponent={isTyping ? <TypingDots /> : null}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Quick actions panel */}
        {showQuickPanel && (
          <View style={styles.quickPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickScroll}
            >
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.mode}
                  onPress={() => {
                    setShowQuickPanel(false);
                    handleQuickAction(action);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: activeMode === action.mode ? '#5BB8D4' : '#FFFFFF90',
                      borderColor: activeMode === action.mode ? '#5BB8D4' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text style={styles.quickEmoji}>{action.emoji}</Text>
                  <Text style={[styles.quickLabel, { color: activeMode === action.mode ? '#FFFFFF' : '#0F2744' }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Mode indicator */}
        {activeMode && !showQuickPanel && (
          <View style={styles.modeBar}>
            <Text style={styles.modeBarText}>
              {QUICK_ACTIONS.find((q) => q.mode === activeMode)?.emoji ?? '✨'}{' '}
              {QUICK_ACTIONS.find((q) => q.mode === activeMode)?.label ?? activeMode} mode
            </Text>
            <TouchableOpacity onPress={() => setActiveMode(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#FFFFFF80" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 12 }]}>
          <View style={[styles.inputWrap, { backgroundColor: '#FFFFFF', shadowColor: '#0F274420' }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: '#1A3350' }]}
              placeholder="What's on your mind today?"
              placeholderTextColor="#6E92AB"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              onSubmitEditing={() => handleSend(inputText)}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() ? '#5BB8D4' : '#C2DFEE' },
              ]}
              onPress={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFFFFF50',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sparkBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  messageList: { paddingHorizontal: 16, paddingBottom: 8 },
  messageListEmpty: { flexGrow: 1, justifyContent: 'center' },

  // Bubbles
  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowNimbus: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 20, padding: 12, paddingHorizontal: 14 },
  userBubble: { borderBottomRightRadius: 6 },
  nimbusBubble: { borderBottomLeftRadius: 6, borderWidth: 1 },
  bubbleText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 22 },
  modeTag: { fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 0.5, textTransform: 'capitalize', marginBottom: 4 },
  favBtn: { alignSelf: 'flex-end', marginTop: 4 },
  nimbusAvatarSm: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF60',
    alignItems: 'center', justifyContent: 'center',
  },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  dotsRow: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Quick actions
  quickPanel: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#FFFFFF30' },
  quickScroll: { paddingHorizontal: 16, gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  quickEmoji: { fontSize: 15 },
  quickLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  // Mode bar
  modeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 16,
  },
  modeBarText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Nunito_700Bold', opacity: 0.85 },

  // Input
  inputBar: { paddingHorizontal: 16, paddingTop: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 24, paddingLeft: 16, paddingRight: 8, paddingVertical: 8,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', maxHeight: 100, paddingTop: 4 },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyHi: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', marginTop: 8 },
  emptySub: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22 },
  startBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  startBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Nunito_700Bold' },
});
