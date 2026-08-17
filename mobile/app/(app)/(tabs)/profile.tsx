import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInUp, FadeIn, withRepeat, withTiming, withSequence, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { 
  Settings, Heart, Pill, Utensils, BarChart3, Activity, 
  Watch, Bell, Shield, Download, Globe, CreditCard, HelpCircle, 
  LogOut, Crown, TrendingUp, Camera, Award, Star, Edit3, ChevronRight,
  Flame, Target
} from 'lucide-react-native';

import { useAuthStore } from '../../../store/authStore';
import { authAPI, apiClient, dashboardAPI, healthAPI, scanAPI } from '../../../services/api';
import { COLORS, SHADOWS } from '../../../theme/tokens';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { EmptyState } from '../../../components/ui/EmptyState';

const HEALTH_MENU = [
  { icon: Heart, label: 'Health Profile', desc: 'Medical history, conditions', color: COLORS.danger, nav: '/(app)/health-profile' },
  { icon: Pill, label: 'Medications', desc: 'Current prescriptions & schedule', color: COLORS.neon, nav: '/(app)/medications' },
  { icon: Utensils, label: 'Meal History', desc: 'Past scans & nutrition log', color: COLORS.warning, nav: '/(app)/(tabs)/history' },
  { icon: BarChart3, label: 'Data & Reports', desc: 'Weekly analytics, Export', color: COLORS.info, nav: '/(app)/reports' },
  { icon: Activity, label: 'Activity Log', desc: 'Steps, exercise & movement', color: '#B39DDB', nav: '/(app)/activity' },
];



export default function ProfileScreen() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  // We could fetch actual stats from APIs
  const { data: scoreData } = useQuery({ queryKey: ['healthScore'], queryFn: healthAPI.getScore });
  const { data: scanStats } = useQuery({ queryKey: ['scanStats'], queryFn: scanAPI.stats });
  
  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'User';
  const healthScore = scoreData?.score ?? 0;
  const totalScans = scanStats?.total_scans ?? 0;
  const streak = 3; // Placeholder
  const badgesCount = 2; // Placeholder

  const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const dynamicStats = [
    { label: 'Streak', value: `${streak}d`, icon: <TrendingUp size={14} color={COLORS.neon} />, color: COLORS.neon },
    { label: 'Scans', value: `${totalScans}`, icon: <Camera size={14} color={COLORS.info} />, color: COLORS.info },
    { label: 'Score', value: `${healthScore}`, icon: <Activity size={14} color={COLORS.warning} />, color: COLORS.warning },
    { label: 'Badges', value: `${badgesCount}`, icon: <Award size={14} color="#B39DDB" />, color: '#B39DDB' },
  ];

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error(e);
    } finally {
      await clearAuth();
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Account</Text>
          <TouchableOpacity style={styles.iconButton}>
             <Settings size={18} color={COLORS.textOnLight} />
          </TouchableOpacity>
        </View>

        {/* Profile header card */}
        <Animated.View entering={FadeInUp.delay(100).springify().stiffness(280).damping(26)} style={{ marginTop: 16 }}>
           <GlassCard elevation={3}>
              <View style={styles.profileRow}>
                 <AnimatedAvatar initials={initials} />
                 
                 <View style={styles.profileInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.nameText}>{userName}</Text>
                        <Crown size={14} color={COLORS.lime} />
                     </View>
                    <Text style={styles.userDesc}>Type 2 Diabetes • Age 45</Text>
                    
                    <View style={styles.medsRow}>
                       <View style={styles.medPill}>
                          <Text style={styles.medPillText}>Metformin</Text>
                       </View>
                    </View>
                 </View>
                 
                 <TouchableOpacity style={styles.editButton}>
                    <Edit3 size={14} color={COLORS.textOnLight} />
                 </TouchableOpacity>
              </View>
           </GlassCard>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInUp.delay(200).springify().stiffness(280).damping(26)} style={styles.statsGrid}>
           {dynamicStats.map((s, i) => (
             <View key={s.label} style={styles.statCardContainer}>
                <GlassCard elevation={1} style={styles.statCard}>
                   <View style={[styles.statIconContainer, { backgroundColor: `${s.color}15` }]}>
                      {s.icon}
                   </View>
                   <Text style={styles.statValue}>{s.value}</Text>
                   <Text style={styles.statLabel}>{s.label}</Text>
                </GlassCard>
             </View>
           ))}
        </Animated.View>

        {/* Achievements */}
        <Animated.View entering={FadeInUp.delay(300).springify().stiffness(280).damping(26)} style={styles.sectionContainer}>
           <SectionLabel icon={<Star size={12} color={COLORS.neon} />}>Achievements</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
              <GlassCard elevation={2} style={styles.achievementCard}>
                 <View style={[styles.achievementIconBox, { backgroundColor: 'rgba(255,80,0,0.15)' }]}>
                    <Flame size={20} color="#FF5000" strokeWidth={2} />
                 </View>
                 <Text style={styles.achievementText}>3 Day Streak</Text>
              </GlassCard>
              <GlassCard elevation={2} style={styles.achievementCard}>
                 <View style={[styles.achievementIconBox, { backgroundColor: COLORS.infoDim }]}>
                    <Camera size={20} color={COLORS.info} strokeWidth={2} />
                 </View>
                 <Text style={styles.achievementText}>First Scan</Text>
              </GlassCard>
               <GlassCard elevation={1} style={[styles.achievementCard, { opacity: 0.4 }] as any}>
                 <View style={[styles.achievementIconBox, { backgroundColor: COLORS.neonSoft }]}>
                    <Target size={20} color={COLORS.neon} strokeWidth={2} />
                 </View>
                 <Text style={styles.achievementText}>100 Score</Text>
              </GlassCard>
           </ScrollView>
        </Animated.View>

        {/* Health & Data Menu */}
        <Animated.View entering={FadeInUp.delay(400).springify().stiffness(280).damping(26)} style={styles.sectionContainer}>
           <SectionLabel icon={<Heart size={12} color={COLORS.danger} />}>Health & Data</SectionLabel>
           <GlassCard elevation={2} style={styles.menuCard}>
              {HEALTH_MENU.map((m, i) => (
                <MenuRow key={m.label} item={m} isLast={i === HEALTH_MENU.length - 1} router={router} />
              ))}
           </GlassCard>
        </Animated.View>



        {/* Sign Out */}
        <Animated.View entering={FadeInUp.delay(600).springify().stiffness(280).damping(26)} style={styles.signOutContainer}>
           <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
              <LogOut size={16} color={COLORS.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
           </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

function AnimatedAvatar({ initials }: { initials: string }) {
  const glowOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.2, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <View style={styles.avatarWrapper}>
      <Animated.View style={[styles.avatarGlow, animatedStyle]}>
         <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
         </View>
      </Animated.View>
      <View style={styles.onlineDot} />
    </View>
  );
}

function MenuRow({ item, isLast, router }: { item: any, isLast: boolean, router: any }) {
  const Icon = item.icon;
  return (
    <TouchableOpacity 
      style={[styles.menuRow, !isLast && styles.menuRowBorder]}
      onPress={() => item.nav && router.push(item.nav)}
    >
      <View style={styles.menuRowLeft}>
         <View style={[styles.menuIconBox, { backgroundColor: `${item.color}15` }]}>
            <Icon size={16} color={item.color} />
         </View>
         <View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
         </View>
      </View>
      <ChevronRight size={16} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPage },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60 },
  headerTitle: { color: COLORS.textOnLight, fontSize: 24, fontWeight: 'bold' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCardAlt, borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrapper: { position: 'relative' },
  avatarGlow: { shadowColor: COLORS.greenDeep, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 10 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${COLORS.greenDeep}20`, borderWidth: 3, borderColor: COLORS.greenDeep, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: COLORS.greenDeep, fontSize: 24, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.greenDeep, borderWidth: 3, borderColor: COLORS.bgCard, ...SHADOWS.limeButtonGlow },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { color: COLORS.textOnLight, fontSize: 18, fontWeight: 'bold' },
  userDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  medsRow: { flexDirection: 'row', marginTop: 8 },
  medPill: { backgroundColor: COLORS.limeSoft, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.greenDeep },
  medPillText: { color: COLORS.greenDeep, fontSize: 10, fontWeight: 'bold' },
  editButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgCardAlt, borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 16 },
  statCardContainer: { width: '25%', padding: 4 },
  statCard: { padding: 10, alignItems: 'center' },
  statIconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: COLORS.textOnLight, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textTertiary, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
  sectionContainer: { marginTop: 24 },
  achievementsScroll: { gap: 8, paddingVertical: 8 },
  achievementCard: { width: 92, padding: 12, alignItems: 'center' },
  achievementIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  achievementText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  menuCard: { padding: 0, marginTop: 10, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderColor: COLORS.divider },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: COLORS.textOnLight, fontSize: 13, fontWeight: '600' },
  menuDesc: { color: COLORS.textTertiary, fontSize: 10, marginTop: 2 },
  signOutContainer: { marginTop: 24, marginBottom: 24 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: 'rgba(255,77,106,0.08)', borderWidth: 1.5, borderColor: COLORS.danger, borderRadius: 16 },
  signOutText: { color: COLORS.danger, fontSize: 14, fontWeight: 'bold' },
});
