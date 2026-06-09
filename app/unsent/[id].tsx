import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import NimbusBird from '@/components/NimbusBird';
import {
  subscribeUnsentMessages,
  addUnsentChatMessage,
  deleteUnsentChatMessage,
  toggleUnsentMessagePin,
  addUnsentMessageReaction,
  UnsentChatMessage,
  RELATIONSHIP_OPTIONS,
} from '@/lib/firestore';

const THEME_COLORS: Record<string, string> = {
  blue:     '#5BB8D4',
  purple:   '#B48DE8',
  pink:     '#F5A0B5',
  green:    '#5DB87A',
  orange:   '#F5A555',
  yellow:   '#F5D130',
  midnight: '#3A4A6B',
  teal:     '#3DBFB8',
};

const REACTIONS = ['❤️', '😂', '😭', '😔', '✨', '📌'];

const EMOTIONAL_TAGS = [
  'Gratitude', 'Closure', 'Love', 'Anger',
  'Forgiveness', 'Regret', 'Missing Someone',
];

function formatMsgTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (today.getTime() - d.getTime()) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const conversations = useAppStore((s) => s.unsentConversations);
  const conv = conversations.find((c) => c.id === id);

  const [messages, setMessages] = useState<UnsentChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<UnsentChatMessage | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [msgTags, setMsgTags] = useState<string[]>([]);
  const [isReflection, setIsReflection] = useState(false);
  const listRef = useRef<FlatList>(null);

  const themeColor = THEME_COLORS[conv?.theme ?? 'blue'] ?? THEME_COLORS.blue;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (!user || !id) return;
    const unsub = subscribeUnsentMessages(user.uid, id, (msgs) => {
      setMessages(msgs);
      setLoaded(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [user, id]);

  const handleSend = async () => {
    if (!text.trim() || !user || !id) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await addUnsentChatMessage(user.uid, id, {
        content: text.trim(),
        type: isReflection ? 'reflection' : 'text',
        tags: msgTags,
      });
      setText('');
      setMsgTags([]);
      setIsReflection(false);
    } catch {
      Alert.alert('Error', 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleLongPress = (msg: UnsentChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMsg(msg);
  };

  const handleReaction = async (reaction: string) => {
    if (!user || !id || !selectedMsg) return;
    const current = selectedMsg.reactions ?? [];
    const next = current.includes(reaction)
      ? current.filter((r) => r !== reaction)
      : [...current, reaction];
    await addUnsentMessageReaction(user.uid, id, selectedMsg.id, next);
    setSelectedMsg(null);
  };

  const handlePin = async () => {
    if (!user || !id || !selectedMsg) return;
    await toggleUnsentMessagePin(user.uid, id, selectedMsg.id, !selectedMsg.isPinned);
    setSelectedMsg(null);
  };

  const handleDelete = () => {
    if (!user || !id || !selectedMsg) return;
    Alert.alert('Delete Message', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel', onPress: () => setSelectedMsg(null) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteUnsentChatMessage(user.uid, id, selectedMsg.id);
          setSelectedMsg(null);
        },
      },
    ]);
  };

  const renderMessage = useCallback(({ item, index }: { item: UnsentChatMessage; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const showDateSep = !prev || !isSameDay(prev.createdAt, item.createdAt);
    const isReflectionMsg = item.type === 'reflection';

    return (
      <>
        {showDateSep && (
          <View style={styles.dateSep}>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dateText, { color: colors.textLight }]}>
              {formatDateSep(item.createdAt)}
            </Text>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        {item.isPinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={10} color={colors.textLight} />
          </View>
        )}
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.85}
          style={styles.msgWrapper}
        >
          {isReflectionMsg ? (
            <View style={[styles.reflectionBubble, { borderColor: themeColor + '60', backgroundColor: themeColor + '15' }]}>
              <View style={styles.reflectionHeader}>
                <Ionicons name="sparkles" size={12} color={themeColor} />
                <Text style={[styles.reflectionLabel, { color: themeColor }]}>Reflection</Text>
              </View>
              <Text style={[styles.reflectionText, { color: colors.navy }]}>{item.content}</Text>
              <Text style={[styles.msgTime, { color: colors.textLight, textAlign: 'right' }]}>
                {formatMsgTime(item.createdAt)}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.bubble,
                { backgroundColor: themeColor, shadowColor: themeColor },
              ]}
            >
              <Text style={styles.bubbleText}>{item.content}</Text>
              <Text style={styles.bubbleTime}>{formatMsgTime(item.createdAt)}</Text>
            </View>
          )}
          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {item.reactions.map((r, i) => (
                <Text key={i} style={styles.reactionEmoji}>{r}</Text>
              ))}
            </View>
          )}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.map((tag, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: themeColor + '20', borderColor: themeColor + '40' }]}>
                  <Text style={[styles.tagText, { color: themeColor }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </>
    );
  }, [messages, themeColor, colors]);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/unsent' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: themeColor + '30', borderColor: themeColor }]}>
          <Text style={styles.headerAvatarEmoji}>
            {RELATIONSHIP_OPTIONS.find((r) => r.key === conv?.relationshipType)?.emoji ?? '✨'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.navy }]}>
            {conv?.recipientName ?? '…'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textLight }]}>
            {RELATIONSHIP_OPTIONS.find((r) => r.key === conv?.relationshipType)?.label ?? ''}
            {' · '}private
          </Text>
        </View>
      </View>

      {pinnedMessages.length > 0 && (
        <View style={[styles.pinnedBar, { backgroundColor: themeColor + '18', borderBottomColor: themeColor + '30' }]}>
          <Ionicons name="pin" size={12} color={themeColor} />
          <Text style={[styles.pinnedBarText, { color: themeColor }]} numberOfLines={1}>
            📌 {pinnedMessages[pinnedMessages.length - 1].content}
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.msgList,
          messages.length === 0 && styles.msgListEmpty,
          { paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.emptyChatContainer}>
              <NimbusBird size={90} />
              <Text style={[styles.emptyChatText, { color: colors.navy }]}>
                Ready to release your thoughts?
              </Text>
              <Text style={[styles.emptyChatSub, { color: colors.textMuted }]}>
                Send an unsent message — it stays safe here, just for you.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyChatContainer}>
              <ActivityIndicator size="large" color={themeColor} />
            </View>
          )
        }
        onContentSizeChange={() => messages.length > 0 && listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={[styles.composer, {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        paddingBottom: Platform.OS === 'web' ? 16 : insets.bottom + 8,
      }]}>
        {isReflection && (
          <View style={[styles.reflectionIndicator, { backgroundColor: themeColor + '18' }]}>
            <Ionicons name="sparkles" size={12} color={themeColor} />
            <Text style={[styles.reflectionIndicatorText, { color: themeColor }]}>
              Adding a reflection
            </Text>
            <TouchableOpacity onPress={() => setIsReflection(false)}>
              <Ionicons name="close" size={14} color={themeColor} />
            </TouchableOpacity>
          </View>
        )}
        {msgTags.length > 0 && (
          <View style={styles.composerTags}>
            {msgTags.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.composerTag, { backgroundColor: themeColor + '20' }]}
                onPress={() => setMsgTags(msgTags.filter((_, j) => j !== i))}
              >
                <Text style={[styles.composerTagText, { color: themeColor }]}>{t} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.composerRow}>
          <TouchableOpacity
            style={[styles.composerIconBtn, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => setShowTagPicker(true)}
          >
            <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.composerIconBtn, { backgroundColor: isReflection ? themeColor + '30' : colors.surfaceAlt }]}
            onPress={() => setIsReflection(!isReflection)}
          >
            <Ionicons name="sparkles-outline" size={18} color={isReflection ? themeColor : colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={[styles.composerInput, { color: colors.navy, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            placeholder={isReflection ? 'Add a reflection…' : 'Type a message…'}
            placeholderTextColor={colors.textLight}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? themeColor : colors.surfaceAlt },
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color={text.trim() ? '#fff' : colors.textLight} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {selectedMsg && (
        <Modal transparent animationType="fade" onRequestClose={() => setSelectedMsg(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedMsg(null)}>
            <View style={[styles.actionSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.reactionBar}>
                {REACTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reactionBtn,
                      selectedMsg.reactions?.includes(r) && { backgroundColor: themeColor + '30' },
                    ]}
                    onPress={() => handleReaction(r)}
                  >
                    <Text style={styles.reactionBtnEmoji}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.actionRow} onPress={handlePin}>
                <Ionicons name={selectedMsg.isPinned ? 'pin' : 'pin-outline'} size={20} color={colors.navy} />
                <Text style={[styles.actionLabel, { color: colors.navy }]}>
                  {selectedMsg.isPinned ? 'Unpin Message' : 'Pin Message'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.actionLabel, { color: colors.error }]}>Delete Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionRow, styles.actionCancel, { borderTopColor: colors.border }]}
                onPress={() => setSelectedMsg(null)}
              >
                <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      <Modal visible={showTagPicker} transparent animationType="slide" onRequestClose={() => setShowTagPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTagPicker(false)}>
          <View style={[styles.tagSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tagSheetTitle, { color: colors.navy }]}>Add Emotional Tag</Text>
            {EMOTIONAL_TAGS.map((tag) => {
              const selected = msgTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagOption,
                    { borderColor: selected ? themeColor : colors.border },
                    selected && { backgroundColor: themeColor + '18' },
                  ]}
                  onPress={() => {
                    setMsgTags(selected ? msgTags.filter((t) => t !== tag) : [...msgTags, tag]);
                  }}
                >
                  <Text style={[styles.tagOptionText, { color: selected ? themeColor : colors.text }]}>
                    {tag}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={16} color={themeColor} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.tagDone, { backgroundColor: themeColor }]}
              onPress={() => setShowTagPicker(false)}
            >
              <Text style={styles.tagDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  headerAvatarEmoji: { fontSize: 20 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_400Regular' },

  pinnedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  pinnedBarText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', flex: 1 },

  msgList: { paddingHorizontal: 16, paddingTop: 12 },
  msgListEmpty: { flex: 1 },

  dateSep: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  dateLine: { flex: 1, height: 1 },
  dateText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  msgWrapper: { alignItems: 'flex-end', marginBottom: 6 },
  pinnedBadge: { alignSelf: 'flex-end', marginBottom: 2 },

  bubble: {
    maxWidth: '78%', borderRadius: 20, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  bubbleText: { fontSize: 15, fontFamily: 'Nunito_400Regular', color: '#fff', lineHeight: 22 },
  bubbleTime: { fontSize: 10, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 4, textAlign: 'right' },

  reflectionBubble: {
    maxWidth: '85%', borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  reflectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  reflectionLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 0.5 },
  reflectionText: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 20, fontStyle: 'italic' },
  msgTime: { fontSize: 10, fontFamily: 'Nunito_400Regular', marginTop: 4 },

  reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 3 },
  reactionEmoji: { fontSize: 14 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 3 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  emptyChatContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  emptyChatSub: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center' },

  composer: {
    paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1,
  },
  reflectionIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 6,
  },
  reflectionIndicatorText: { flex: 1, fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  composerTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  composerTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  composerTagText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  composerInput: {
    flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, fontFamily: 'Nunito_400Regular', maxHeight: 120, borderWidth: 1,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16,
  },
  reactionBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  reactionBtn: { padding: 8, borderRadius: 20 },
  reactionBtnEmoji: { fontSize: 24 },
  actionDivider: { height: 1, marginVertical: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  actionLabel: { fontSize: 16, fontFamily: 'Nunito_600SemiBold' },
  actionCancel: { borderTopWidth: 1, marginTop: 4 },

  tagSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20, gap: 8,
  },
  tagSheetTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', marginBottom: 4 },
  tagOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  tagOptionText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  tagDone: {
    paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginTop: 8,
  },
  tagDoneText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 15 },
});
