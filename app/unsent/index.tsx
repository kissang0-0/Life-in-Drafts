import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import {
  subscribeUnsentConversations,
  deleteUnsentConversation,
  UnsentConversation,
  RELATIONSHIP_OPTIONS,
} from '@/lib/firestore';
import { format } from '@/lib/dateUtils';

function formatPreview(msg: string) {
  if (!msg) return 'No messages yet';
  return msg.length > 50 ? msg.slice(0, 50) + '…' : msg;
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

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

function getRelEmoji(type: string) {
  return RELATIONSHIP_OPTIONS.find((r) => r.key === type)?.emoji ?? '✨';
}

export default function UnsentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const conversations = useAppStore((s) => s.unsentConversations);
  const setUnsentConversations = useAppStore((s) => s.setUnsentConversations);
  const user = useAuthStore((s) => s.user);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUnsentConversations(user.uid, setUnsentConversations);
    return unsub;
  }, [user]);

  const handleDelete = (conv: UnsentConversation) => {
    Alert.alert(
      'Delete Conversation',
      `Delete your conversation with "${conv.recipientName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => user && deleteUnsentConversation(user.uid, conv.id),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: UnsentConversation }) => {
    const themeColor = THEME_COLORS[item.theme] ?? THEME_COLORS.blue;
    const emoji = getRelEmoji(item.relationshipType);
    const initials = item.recipientName.slice(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
        onPress={() => router.push(`/unsent/${item.id}`)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.avatar, { backgroundColor: themeColor + '30', borderColor: themeColor + '60' }]}>
          <Text style={styles.avatarEmoji}>{emoji}</Text>
          <View style={[styles.avatarBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.recipientName, { color: colors.navy }]} numberOfLines={1}>
              {item.recipientName}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textLight }]}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={1}>
              {formatPreview(item.lastMessage)}
            </Text>
            {item.messageCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.countText}>{item.messageCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.navy }]}>Unsent Messages</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {conversations.length > 0
              ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
              : 'Private. Safe. Just yours.'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/unsent/new')}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          conversations.length === 0 && styles.listEmpty,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        ListEmptyComponent={<EmptyConversations colors={colors} onNew={() => router.push('/unsent/new')} />}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
        )}
      />
    </View>
  );
}

function EmptyConversations({ colors, onNew }: { colors: any; onNew: () => void }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      <Animated.Text style={[styles.emptyBird, { transform: [{ translateY: bounce }] }]}>🐦</Animated.Text>
      <Text style={[styles.emptyTitle, { color: colors.navy }]}>
        Some conversations only need a place to exist.
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Say the things you never got to say, in a space that's completely yours.
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
        onPress={onNew}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.emptyBtnText}>Start a Conversation</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  subtitle: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 1 },
  newBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  list: { paddingTop: 4 },
  listEmpty: { flex: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, position: 'relative',
  },
  avatarEmoji: { fontSize: 24 },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  avatarInitials: { fontSize: 8, fontFamily: 'Nunito_800ExtraBold', color: '#fff' },

  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recipientName: { fontSize: 16, fontFamily: 'Nunito_700Bold', flex: 1, marginRight: 8 },
  timestamp: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { fontSize: 14, fontFamily: 'Nunito_400Regular', flex: 1, marginRight: 8 },
  countBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#fff' },
  separator: { height: 1, marginLeft: 80 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  emptyBird: { fontSize: 64, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', textAlign: 'center', lineHeight: 26 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 15 },
});
