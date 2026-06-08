import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/EmptyState';
import { FloatingButton } from '@/components/FloatingButton';
import { deleteUnsentMessage, UnsentMessage } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { format } from '@/lib/dateUtils';

export default function UnsentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unsent = useAppStore((s) => s.unsent);
  const user = useAuthStore((s) => s.user);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleDelete = (msg: UnsentMessage) => {
    Alert.alert('Delete Letter', `Remove this letter to "${msg.to}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => user && deleteUnsentMessage(user.uid, msg.id),
      },
    ]);
  };

  const renderItem = ({ item }: { item: UnsentMessage }) => {
    const mood = MOOD_OPTIONS.find((m) => m.key === item.mood);
    const moodColor = item.mood ? colors.moodColors[item.mood] ?? colors.surfaceAlt : colors.surfaceAlt;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
        <View style={[styles.envelope, { backgroundColor: moodColor }]}>
          <Ionicons name="mail" size={22} color={colors.navy} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.to, { color: colors.navy }]}>Dear {item.to || 'you'},</Text>
          <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={[styles.date, { color: colors.textLight }]}>{format(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.navy }]}>Unsent Messages</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Letters never delivered, but always felt
          </Text>
        </View>
      </View>

      <FlatList
        data={unsent}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="mail-outline"
            title="No letters yet"
            subtitle="Write the things you never got to say"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FloatingButton onPress={() => router.push('/unsent/new')} icon="pencil" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  subtitle: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 18,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  envelope: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, gap: 4 },
  to: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  preview: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  date: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  deleteBtn: { padding: 4 },
});
