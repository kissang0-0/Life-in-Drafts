import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/EmptyState';
import { MemoryCard } from '@/components/MemoryCard';
import { FloatingButton } from '@/components/FloatingButton';
import { deleteMemory } from '@/lib/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 48) / 2;

export default function MemoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const memories = useAppStore((s) => s.memories);
  const user = useAuthStore((s) => s.user);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleLongPress = (id: string) => {
    Alert.alert('Delete Memory', 'Are you sure you want to remove this memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => user && deleteMemory(user.uid, id),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.navy }]}>Memories</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {memories.length} {memories.length === 1 ? 'photo' : 'photos'} in your scrapbook
        </Text>
      </View>

      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onLongPress={() => handleLongPress(item.id)}
            delayLongPress={500}
            activeOpacity={0.95}
            style={[
              styles.cardWrapper,
              { transform: [{ rotate: index % 2 === 0 ? '-1.5deg' : '1.5deg' }] },
            ]}
          >
            <MemoryCard
              memory={item}
              onPress={() => {}}
              width={CARD_W}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            title="No memories yet"
            subtitle="Capture your first moment and it will live here forever"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FloatingButton onPress={() => router.push('/memories/new')} icon="camera" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold' },
  subtitle: { fontSize: 13, fontFamily: 'Nunito_400Regular' },
  grid: { paddingHorizontal: 16, paddingTop: 8 },
  row: { justifyContent: 'space-between', marginBottom: 0 },
  cardWrapper: { flex: 1, maxWidth: CARD_W, marginHorizontal: 4 },
});
