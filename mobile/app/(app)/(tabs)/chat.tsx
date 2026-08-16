import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Settings, Sparkles, Droplet, Brain } from 'lucide-react-native';

import { healthAPI, dashboardAPI } from '../../../services/api';
import { COLORS, SHADOWS, TYPE, RADII } from '../../../theme/tokens';
import { AITwinOrb } from '../../../components/ui/AITwinOrb';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { NeonButton } from '../../../components/ui/NeonButton';

export default function ChatScreen() {
  const router = useRouter();

  const {
    data: scoreData, isLoading: scoreLoading,
    refetch: refetchScore, isRefetching: isRefetchingScore,
  } = useQuery({ queryKey: ['healthScore'], queryFn: healthAPI.getScore });

  const {
    data: insightsData, isLoading: insightsLoading,
    refetch: refetchInsights, isRefetching: isRefetchingInsights,
  } = useQuery({ queryKey: ['healthInsights'], queryFn: healthAPI.getInsights });

  const {
    data: dashData, refetch: refetchDash, isRefetching: isRefetchingDash,
  } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardAPI.get });

  const onRefresh = () => { refetchScore(); refetchInsights(); refetchDash(); };
  const isRefreshing = isRefetchingScore || isRefetchingInsights || isRefetchingDash;

  const targetScore    = scoreData?.score ?? null;
  const scoreSummary   = scoreData?.summary ?? 'Processing Data';
  const apiPredictions = insightsData?.predictions || [];
  const currentGlucose = dashData?.glucose?.avg ?? null;

  const [score, setScore] = useState(0);
  useEffect(() => {
    if (targetScore !== null) setScore(targetScore);
  }, [targetScore]);

  const [twinState, setTwinState] = useState<'idle' | 'listening' | 'thinking' | 'data'>('idle');

  // Drive twin state from loading status
  useEffect(() => {
    if (scoreLoading || insightsLoading) {
      setTwinState('thinking');
    } else {
      setTwinState('idle');
    }
  }, [scoreLoading, insightsLoading]);

  const moodColor = targetScore !== null 
    ? (targetScore >= 70 ? COLORS.lime : targetScore >= 40 ? COLORS.warning : COLORS.danger)
    : COLORS.lime;

  const predictions = apiPredictions.map((p: any) => ({
    text: p.text,
    risk: p.risk === 'high' ? 'critical' as const : p.risk === 'medium' ? 'warning' as const : 'safe' as const,
    label: p.risk === 'high' ? 'High' : p.risk === 'medium' ? 'Medium' : 'Low',
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
      >
        {/* ─── Top bar ─── */}
        <Animated.View entering={FadeInDown.delay(60).springify().stiffness(280).damping(26)} style={styles.topBar}>
          <View>
            <Text style={styles.title}>AI Health Twin</Text>
            <View style={styles.subtitleRow}>
              <Sparkles size={12} color={COLORS.greenDeep} />
              <Text style={styles.subtitleText}>Your personalized metabolic intelligence</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={18} color={COLORS.textOnLight} />
          </TouchableOpacity>
        </Animated.View>

        {/* ─── 3D AI Twin ─── */}
        <Animated.View entering={FadeInDown.delay(120)} style={styles.avatarContainer}>
          {/* Lime gradient backdrop */}
          <View style={styles.avatarBg} />
          <AITwinOrb
            state={twinState}
            moodColor={moodColor}
            size={280}
          />

          {/* Floating glucose badge */}
          {currentGlucose !== null && (
            <Animated.View entering={FadeInDown.delay(800).springify().stiffness(280).damping(26)} style={styles.floatingCard}>
              <View style={[styles.floatingDot, { backgroundColor: COLORS.lime }]} />
              <Droplet size={11} color={COLORS.greenDeep} />
              <Text style={styles.floatingText}>Glucose {Math.round(currentGlucose)}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ─── Health Score Ring ─── */}
        <Animated.View entering={FadeInDown.delay(240).springify().stiffness(280).damping(26)} style={styles.scoreContainer}>
          {scoreLoading ? (
            <LoadingSkeleton variant="circle" width={140} height={140} />
          ) : (
            <>
              <View style={styles.scoreRing}>
                <View style={styles.scoreContent}>
                  <Text style={styles.scoreValue}>{targetScore !== null ? Math.round(score) : '—'}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>
              <Text style={styles.scoreLabel}>Health Score</Text>
              {targetScore !== null && (
                <View style={{ marginTop: 8 }}>
                  <StatusBadge variant="safe">{scoreSummary}</StatusBadge>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* ─── AI Predictions ─── */}
        <Animated.View entering={FadeInDown.delay(300).springify().stiffness(280).damping(26)} style={styles.predictionsContainer}>
          <SectionLabel icon={<Brain size={12} />}>AI Predictions</SectionLabel>

          {insightsLoading ? (
            <View style={styles.predictionsRow}>
              <LoadingSkeleton variant="card" width={185} height={120} />
              <View style={{ width: 12 }} />
              <LoadingSkeleton variant="card" width={185} height={120} />
            </View>
          ) : predictions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.predictionsScroll}>
              {predictions.map((p: any, i: number) => (
                <GlassCard key={i} elevation={2} style={styles.predictionCard}>
                  <View style={styles.predictionIconBox}>
                    <Sparkles size={18} color={COLORS.greenDeep} strokeWidth={2} />
                  </View>
                  <Text style={styles.predictionText}>{p.text}</Text>
                  <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                    <StatusBadge variant={p.risk}>{p.label} Risk</StatusBadge>
                  </View>
                </GlassCard>
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              compact
              title="No Predictions Available"
              message="More data is needed to generate accurate health predictions."
            />
          )}
        </Animated.View>

        {/* ─── Chat CTA ─── */}
        <Animated.View entering={FadeInDown.delay(360).springify().stiffness(280).damping(26)} style={styles.chatButtonContainer}>
          <NeonButton
            onPress={() => {
              router.push('/(app)/conversation');
            }}
            size="lg"
          >
            Chat with AI Twin
          </NeonButton>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bgPage },
  scrollContent:     { paddingBottom: 120 },
  topBar:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 60 },
  title:             { ...TYPE.h1 },
  subtitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subtitleText:      { ...TYPE.caption, color: COLORS.greenDeep, fontStyle: 'italic' },
  settingsButton:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.elevation1 },
  avatarContainer:   { alignItems: 'center', marginTop: 12, height: 300, justifyContent: 'center', position: 'relative' },
  avatarBg:          { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: COLORS.limeDim },
  floatingCard:      { position: 'absolute', bottom: 20, left: 24, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, ...SHADOWS.elevation1 },
  floatingDot:       { width: 6, height: 6, borderRadius: 3 },
  floatingText:      { ...TYPE.caption, color: COLORS.textOnLight, fontWeight: '600' },
  scoreContainer:    { alignItems: 'center', marginTop: 8 },
  scoreRing:         { width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', ...SHADOWS.limeButtonGlow },
  scoreContent:      { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue:        { ...TYPE.display, fontSize: 38, fontWeight: '900' },
  scoreMax:          { ...TYPE.caption, marginLeft: 2, alignSelf: 'flex-end', marginBottom: 4 },
  scoreLabel:        { ...TYPE.caption, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
  predictionsContainer: { marginTop: 32, paddingHorizontal: 24 },
  predictionsRow:    { flexDirection: 'row', marginTop: 12 },
  predictionsScroll: { paddingHorizontal: 24, gap: 12, marginTop: 12, marginHorizontal: -24 },
  predictionCard:    { width: 185, padding: 14 },
  predictionIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.limeDim, alignItems: 'center', justifyContent: 'center' },
  predictionText:    { ...TYPE.body, fontSize: 13, marginTop: 10, lineHeight: 18 },
  chatButtonContainer: { marginTop: 32, paddingHorizontal: 24 },
});
