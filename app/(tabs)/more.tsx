import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { NimbusMessage } from '@/components/NimbusMessage';

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { diary, habits, memorySlips } = useAppStore();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const items = [
    {
      icon: 'chatbubble-ellipses-outline' as const,
      label: "Nimbus' Nest",
      subtitle: 'Your AI companion & chat',
      count: null,
      color: '#B48DE8',
      route: '/(tabs)/nest' as const,
    },
    {
      icon: 'moon-outline' as const,
      label: 'Cycle & Error',
      subtitle: 'Mood, cycle & pattern tracking',
      count: null,
      color: '#7EC8E3',
      route: '/(tabs)/cycle' as const,
    },
    {
      icon: 'partly-sunny-outline' as const,
      label: 'Cloud Corner',
      subtitle: 'Your emotional weather & insights',
      count: null,
      color: '#5BB8D4',
      route: '/(tabs)/cloud' as const,
    },
    {
      icon: 'leaf-outline' as const,
      label: 'Mood Garden',
      subtitle: 'Your emotional garden in bloom',
      count: diary.filter((e) => e.mood).length,
      color: '#5DBB63',
      route: '/(tabs)/garden' as const,
    },
    {
      icon: 'archive-outline' as const,
      label: 'Memory Jar',
      subtitle: 'Your digital keepsake box',
      count: memorySlips.length,
      color: '#A78BFA',
      route: '/(tabs)/memoryjar' as const,
    },
    {
      icon: 'shield-outline' as const,
      label: 'Secret Vault',
      subtitle: 'Your hidden sanctuary',
      count: null,
      color: '#7A6AB0',
      route: '/(tabs)/vault' as const,
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      subtitle: 'Preferences & security',
      count: null,
      color: colors.lavenderDeep,
      route: '/settings' as const,
    },
  ];

  const shortcuts = [
    { emoji: '✍️', label: 'New Entry',   color: '#5BB8D4', route: '/(tabs)/diary'     as const },
    { emoji: '📸', label: 'Memory',      color: '#A78BFA', route: '/(tabs)/memories'  as const },
    { emoji: '💬', label: 'Unsent',      color: '#F4A261', route: '/(tabs)/unsent'    as const },
    { emoji: '📚', label: 'Study',       color: '#5DB87A', route: '/(tabs)/study'     as const },
    { emoji: '🌸', label: 'Garden',      color: '#F9A8D4', route: '/(tabs)/garden'    as const },
    { emoji: '👤', label: 'My Profile',  color: '#B48DE8', route: '/profile'          as const },
  ];

  const stats = [
    { label: 'Diary Entries', value: diary.length,       icon: 'book-outline' as const,           color: colors.primary },
    { label: 'Habits',        value: habits.length,      icon: 'checkmark-circle-outline' as const, color: colors.accentDeep },
    { label: 'Memory Slips',  value: memorySlips.length, icon: 'archive-outline' as const,        color: '#A78BFA' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.navy }]}>More</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your private world</Text>

        {/* Quick shortcuts */}
        <Text style={[styles.sectionTitle, { color: colors.navy, marginBottom: 10 }]}>Quick Access</Text>
        <View style={styles.shortcutsGrid}>
          {shortcuts.map((s) => (
            <TouchableOpacity
              key={s.label}
              onPress={() => router.push(s.route)}
              activeOpacity={0.82}
              style={[styles.shortcutCard, { backgroundColor: s.color + '18', borderColor: s.color + '35' }]}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: s.color + '28' }]}>
                <Text style={styles.shortcutEmoji}>{s.emoji}</Text>
              </View>
              <Text style={[styles.shortcutLabel, { color: colors.navy }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.navy }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Nimbus */}
        <NimbusMessage style={{ marginBottom: 20 }} />

        {/* Navigation items */}
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Explore</Text>
        <View style={styles.navList}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route)}
              activeOpacity={0.8}
              style={[styles.navItem, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
            >
              <View style={[styles.navIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.navInfo}>
                <Text style={[styles.navLabel, { color: colors.navy }]}>{item.label}</Text>
                <Text style={[styles.navSub, { color: colors.textMuted }]}>{item.subtitle}</Text>
              </View>
              <View style={styles.navRight}>
                {item.count !== null && item.count > 0 ? (
                  <View style={[styles.badge, { backgroundColor: item.color + '25' }]}>
                    <Text style={[styles.badgeText, { color: item.color }]}>{item.count}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Brand phrase */}
        <View style={styles.brandSection}>
          <Text style={[styles.brandPhrase, { color: colors.textLight }]}>The Archive of Becoming</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  subtitle: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '44%', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', marginBottom: 12 },
  shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  shortcutCard: {
    flex: 1, minWidth: '28%', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 18, borderWidth: 1,
  },
  shortcutIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shortcutEmoji: { fontSize: 22 },
  shortcutLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  navList: { gap: 10, marginBottom: 32 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  navIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navInfo: { flex: 1, gap: 2 },
  navLabel: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  navSub: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  brandSection: { alignItems: 'center', paddingVertical: 16 },
  brandPhrase: { fontSize: 13, fontFamily: 'Nunito_400Regular', letterSpacing: 1, fontStyle: 'italic' },
});
