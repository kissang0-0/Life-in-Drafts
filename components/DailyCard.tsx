import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { getDailyQuote } from '@/constants/quotes';
import { NIMBUS_MESSAGES } from '@/constants/nimbus';
import NimbusBird from '@/components/NimbusBird';

type CardMode = 'quote' | 'nimbus';

export function DailyCard() {
  const colors = useColors();
  const [mode, setMode] = useState<CardMode>('quote');

  const quote = getDailyQuote();
  const nimbusMsg = NIMBUS_MESSAGES[new Date().getDate() % NIMBUS_MESSAGES.length];

  const toggle = () => setMode((m) => (m === 'quote' ? 'nimbus' : 'quote'));

  return (
    <LinearGradient
      colors={[colors.primary + 'CC', colors.lavenderDeep + 'BB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.inner}>
        {mode === 'quote' ? (
          <>
            <Ionicons name="text-outline" size={22} color="rgba(255,255,255,0.5)" style={styles.quoteIcon} />
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </>
        ) : (
          <>
            <View style={styles.nimbusRow}>
              <View style={styles.nimbusCircle}>
                <NimbusBird size={28} />
              </View>
              <Text style={styles.nimbusLabel}>Nimbus says</Text>
            </View>
            <Text style={styles.nimbusText}>{nimbusMsg}</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={[styles.dot, mode === 'quote' ? styles.dotActive : styles.dotInactive]} />
          <View style={[styles.dot, mode === 'nimbus' ? styles.dotActive : styles.dotInactive]} />
        </View>
        <TouchableOpacity onPress={toggle} style={styles.toggleBtn} activeOpacity={0.8}>
          <Ionicons name={mode === 'quote' ? 'chatbubble-ellipses-outline' : 'library-outline'} size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.toggleText}>{mode === 'quote' ? 'Nimbus' : 'Quote'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24, padding: 20, gap: 16,
    overflow: 'hidden',
  },
  inner: { gap: 10, minHeight: 80 },
  quoteIcon: { marginBottom: -4 },
  quoteText: {
    fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#fff',
    lineHeight: 22, fontStyle: 'italic',
  },
  quoteAuthor: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.75)' },
  nimbusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nimbusCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  nimbusLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },
  nimbusText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', color: '#fff', lineHeight: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: '#fff' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  toggleText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: 'rgba(255,255,255,0.9)' },
});
