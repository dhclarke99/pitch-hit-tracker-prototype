import { Colors } from '@/constants/theme';
import { getHittingSessions, HitMetrics, getSubscriptionTier, setSubscriptionTier, SubscriptionTier } from '@/data/localStorage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MetricTrend {
  label: string;
  current: number;
  average: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

interface GamificationData {
  scoutRating: number; // 0-100
  leaderboardRank: number;
  totalPlayers: number;
  xp: number;
  backyardBucks: number;
  badges: Badge[];
  challenges: Challenge[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number; // 0-100 for progress towards badge
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  progress: number; // 0-100
  reward: { xp: number; bucks: number };
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricTrend[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [subscriptionTier, setSubscriptionTierState] = useState<SubscriptionTier>('pro');

  useEffect(() => {
    loadProgressData();
    loadSubscriptionTier();
  }, []);

  const loadSubscriptionTier = async () => {
    try {
      const tier = await getSubscriptionTier();
      setSubscriptionTierState(tier);
    } catch (error) {
      console.error('Error loading subscription tier:', error);
    }
  };

  const handleTierToggle = async (value: boolean) => {
    const newTier: SubscriptionTier = value ? 'elite' : 'pro';
    try {
      await setSubscriptionTier(newTier);
      setSubscriptionTierState(newTier);
    } catch (error) {
      console.error('Error setting subscription tier:', error);
    }
  };

  const loadProgressData = async () => {
    try {
      const sessions = await getHittingSessions();
      const allSwings = sessions.flatMap(s => s.swings);
      
      // Calculate metrics trends
      const calculatedMetrics = calculateMetrics(allSwings);
      setMetrics(calculatedMetrics);
      
      // Calculate gamification data
      const gamificationData = calculateGamification(allSwings, sessions.length);
      setGamification(gamificationData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (swings: HitMetrics[]): MetricTrend[] => {
    if (swings.length === 0) {
      return [
        { label: 'Exit Velocity', current: 0, average: 0, trend: 'stable', unit: 'mph' },
        { label: 'Launch Angle', current: 0, average: 0, trend: 'stable', unit: '°' },
        { label: 'Distance', current: 0, average: 0, trend: 'stable', unit: 'ft' },
        { label: 'Swing Count', current: 0, average: 0, trend: 'stable', unit: 'swings' },
      ];
    }

    // Get recent swings (last 10) vs all swings
    const recentSwings = swings.slice(-10);
    const allSwings = swings;

    const exitVelocities = allSwings.map(s => s.exitVelocity);
    const recentExitVelocities = recentSwings.map(s => s.exitVelocity);
    const avgExitVel = exitVelocities.reduce((a, b) => a + b, 0) / exitVelocities.length;
    const recentAvgExitVel = recentExitVelocities.reduce((a, b) => a + b, 0) / recentExitVelocities.length;

    const launchAngles = allSwings.map(s => s.launchAngle);
    const recentLaunchAngles = recentSwings.map(s => s.launchAngle);
    const avgLaunchAngle = launchAngles.reduce((a, b) => a + b, 0) / launchAngles.length;
    const recentAvgLaunchAngle = recentLaunchAngles.reduce((a, b) => a + b, 0) / recentLaunchAngles.length;

    const distances = allSwings.map(s => s.estimatedDistance);
    const recentDistances = recentSwings.map(s => s.estimatedDistance);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const recentAvgDistance = recentDistances.reduce((a, b) => a + b, 0) / recentDistances.length;

    const determineTrend = (recent: number, average: number): 'up' | 'down' | 'stable' => {
      const diff = recent - average;
      if (Math.abs(diff) < 0.5) return 'stable';
      return diff > 0 ? 'up' : 'down';
    };

    return [
      {
        label: 'Exit Velocity',
        current: recentAvgExitVel,
        average: avgExitVel,
        trend: determineTrend(recentAvgExitVel, avgExitVel),
        unit: 'mph',
      },
      {
        label: 'Launch Angle',
        current: recentAvgLaunchAngle,
        average: avgLaunchAngle,
        trend: determineTrend(recentAvgLaunchAngle, avgLaunchAngle),
        unit: '°',
      },
      {
        label: 'Distance',
        current: recentAvgDistance,
        average: avgDistance,
        trend: determineTrend(recentAvgDistance, avgDistance),
        unit: 'ft',
      },
      {
        label: 'Swing Count',
        current: allSwings.length,
        average: allSwings.length,
        trend: 'stable',
        unit: 'swings',
      },
    ];
  };

  const calculateGamification = (swings: HitMetrics[], sessionCount: number): GamificationData => {
    // Calculate Virtual Scout Rating (0-100)
    // Based on exit velocity, launch angle consistency, and distance
    let scoutRating = 50; // Base rating
    
    if (swings.length > 0) {
      const avgExitVel = swings.reduce((sum, s) => sum + s.exitVelocity, 0) / swings.length;
      const avgDistance = swings.reduce((sum, s) => sum + s.estimatedDistance, 0) / swings.length;
      
      // Exit velocity component (0-40 points)
      const exitVelScore = Math.min(40, (avgExitVel / 100) * 40);
      
      // Distance component (0-30 points)
      const distanceScore = Math.min(30, (avgDistance / 400) * 30);
      
      // Consistency bonus (0-30 points) - based on session count
      const consistencyScore = Math.min(30, (sessionCount / 20) * 30);
      
      scoutRating = exitVelScore + distanceScore + consistencyScore;
    }

    // Calculate XP and Backyard Bucks
    const xp = swings.length * 10 + sessionCount * 50;
    const backyardBucks = Math.floor(xp / 5);

    // Generate badges
    const badges: Badge[] = [
      {
        id: 'first_swing',
        name: 'First Swing',
        description: 'Record your first swing',
        icon: 'star.fill' as any,
        earned: swings.length > 0,
      },
      {
        id: 'power_hitter',
        name: 'Power Hitter',
        description: 'Average exit velocity over 80 mph',
        icon: 'bolt.fill' as any,
        earned: swings.length > 0 && swings.reduce((sum, s) => sum + s.exitVelocity, 0) / swings.length > 80,
        progress: swings.length > 0 ? Math.min(100, (swings.reduce((sum, s) => sum + s.exitVelocity, 0) / swings.length / 80) * 100) : 0,
      },
      {
        id: 'distance_king',
        name: 'Distance King',
        description: 'Hit a ball over 300 feet',
        icon: 'location.fill' as any,
        earned: swings.some(s => s.estimatedDistance > 300),
        progress: swings.length > 0 ? Math.min(100, (Math.max(...swings.map(s => s.estimatedDistance)) / 300) * 100) : 0,
      },
      {
        id: 'session_master',
        name: 'Session Master',
        description: 'Complete 10 sessions',
        icon: 'trophy.fill' as any,
        earned: sessionCount >= 10,
        progress: Math.min(100, (sessionCount / 10) * 100),
      },
      {
        id: 'consistent',
        name: 'Consistent',
        description: 'Record 50 swings',
        icon: 'checkmark.circle.fill' as any,
        earned: swings.length >= 50,
        progress: Math.min(100, (swings.length / 50) * 100),
      },
    ];

    // Generate challenges
    const challenges: Challenge[] = [
      {
        id: 'weekly_swings',
        name: 'Weekly Warrior',
        description: 'Record 20 swings this week',
        progress: Math.min(100, (swings.length / 20) * 100),
        reward: { xp: 200, bucks: 40 },
      },
      {
        id: 'improve_velocity',
        name: 'Velocity Boost',
        description: 'Increase average exit velocity by 5 mph',
        progress: 60, // Placeholder
        reward: { xp: 150, bucks: 30 },
      },
      {
        id: 'perfect_angle',
        name: 'Perfect Angle',
        description: 'Hit 5 balls with launch angle between 10-20°',
        progress: 40, // Placeholder
        reward: { xp: 100, bucks: 20 },
      },
    ];

    return {
      scoutRating: Math.round(scoutRating),
      leaderboardRank: 42, // Placeholder - would come from backend
      totalPlayers: 1000, // Placeholder
      xp,
      backyardBucks,
      badges,
      challenges,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.tint + '20' }]}
            onPress={() => setShowProfileMenu(!showProfileMenu)}>
            <IconSymbol name="person.circle.fill" size={28} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Profile Submenu */}
        {showProfileMenu && (
          <View style={[styles.profileMenu, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <TouchableOpacity style={styles.profileMenuItem}>
              <IconSymbol name="person.fill" size={20} color={colors.icon} />
              <Text style={[styles.profileMenuText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem}>
              <IconSymbol name="gearshape.fill" size={20} color={colors.icon} />
              <Text style={[styles.profileMenuText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem}>
              <IconSymbol name="bell.fill" size={20} color={colors.icon} />
              <Text style={[styles.profileMenuText, { color: colors.text }]}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem}>
              <IconSymbol name="questionmark.circle.fill" size={20} color={colors.icon} />
              <Text style={[styles.profileMenuText, { color: colors.text }]}>Help & Support</Text>
            </TouchableOpacity>
            {/* Tier Toggle for Testing */}
            <View style={[styles.profileMenuItem, styles.tierToggleItem]}>
              <View style={styles.tierToggleContent}>
                <IconSymbol name="star.fill" size={20} color={colors.icon} />
                <View style={styles.tierToggleText}>
                  <Text style={[styles.profileMenuText, { color: colors.text }]}>Subscription Tier</Text>
                  <Text style={[styles.tierToggleSubtext, { color: colors.icon }]}>
                    {subscriptionTier === 'pro' ? 'Pro' : 'Elite'} (Testing)
                  </Text>
                </View>
              </View>
              <Switch
                value={subscriptionTier === 'elite'}
                onValueChange={handleTierToggle}
                trackColor={{ false: colors.icon + '40', true: colors.tint }}
                thumbColor={subscriptionTier === 'elite' ? colors.tint : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Gamification Hub */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gamification Hub</Text>
          
          {/* Virtual Scout Rating */}
          <View style={[styles.scoutCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
            <View style={styles.scoutHeader}>
              <IconSymbol name="star.fill" size={24} color={colors.tint} />
              <Text style={[styles.scoutTitle, { color: colors.text }]}>Virtual Scout Rating</Text>
            </View>
            <View style={styles.scoutRatingContainer}>
              <Text style={[styles.scoutRating, { color: colors.tint }]}>
                {gamification?.scoutRating || 0}
              </Text>
              <Text style={[styles.scoutRatingLabel, { color: colors.icon }]}>/ 100</Text>
            </View>
            <View style={[styles.ratingBar, { backgroundColor: colors.icon + '20' }]}>
              <View 
                style={[
                  styles.ratingBarFill, 
                  { 
                    width: `${gamification?.scoutRating || 0}%`, 
                    backgroundColor: colors.tint 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Leaderboard */}
          <View style={[styles.leaderboardCard, { backgroundColor: colors.background, borderColor: colors.icon + '30' }]}>
            <View style={styles.leaderboardHeader}>
              <IconSymbol name="trophy.fill" size={20} color={colors.tint} />
              <Text style={[styles.leaderboardTitle, { color: colors.text }]}>Leaderboard</Text>
            </View>
            <View style={styles.leaderboardRank}>
              <Text style={[styles.rankNumber, { color: colors.tint }]}>
                #{gamification?.leaderboardRank || 0}
              </Text>
              <Text style={[styles.rankLabel, { color: colors.icon }]}>
                of {gamification?.totalPlayers || 0} players
              </Text>
            </View>
          </View>

          {/* XP and Backyard Bucks */}
          <View style={styles.currencyRow}>
            <View style={[styles.currencyCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
              <IconSymbol name="star.fill" size={20} color={colors.tint} />
              <View style={styles.currencyContent}>
                <Text style={[styles.currencyValue, { color: colors.text }]}>
                  {gamification?.xp.toLocaleString() || 0}
                </Text>
                <Text style={[styles.currencyLabel, { color: colors.icon }]}>XP</Text>
              </View>
            </View>
            <View style={[styles.currencyCard, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}>
              <IconSymbol name="dollarsign.circle.fill" size={20} color={colors.secondary} />
              <View style={styles.currencyContent}>
                <Text style={[styles.currencyValue, { color: colors.text }]}>
                  {gamification?.backyardBucks.toLocaleString() || 0}
                </Text>
                <Text style={[styles.currencyLabel, { color: colors.icon }]}>Backyard Bucks</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Core Metrics */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Core Metrics</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.icon }]}>
            Automated trends from your training sessions
          </Text>
          
          {metrics.map((metric, index) => (
            <View 
              key={index} 
              style={[styles.metricCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.text }]}>{metric.label}</Text>
                <View style={styles.trendContainer}>
                  {metric.trend === 'up' && (
                    <IconSymbol name="arrow.up.right" size={16} color="#4CAF50" />
                  )}
                  {metric.trend === 'down' && (
                    <IconSymbol name="arrow.down.right" size={16} color="#F44336" />
                  )}
                  {metric.trend === 'stable' && (
                    <IconSymbol name="minus" size={16} color={colors.icon} />
                  )}
                </View>
              </View>
              <View style={styles.metricValues}>
                <View>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {metric.current.toFixed(1)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: colors.icon }]}>
                    {metric.unit} (current)
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View>
                  <Text style={[styles.metricValue, { color: colors.icon }]}>
                    {metric.average.toFixed(1)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: colors.icon }]}>
                    {metric.unit} (avg)
                  </Text>
                </View>
              </View>
              {/* Simple trend visualization */}
              <View style={[styles.trendBar, { backgroundColor: colors.icon + '10' }]}>
                <View 
                  style={[
                    styles.trendBarFill, 
                    { 
                      width: `${Math.min(100, (metric.current / (metric.average || 1)) * 50)}%`, 
                      backgroundColor: metric.trend === 'up' ? '#4CAF50' : metric.trend === 'down' ? '#F44336' : colors.icon 
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Challenges & Badges */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Challenges</Text>
          {gamification?.challenges.map((challenge) => (
            <View 
              key={challenge.id} 
              style={[styles.challengeCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.challengeHeader}>
                <Text style={[styles.challengeName, { color: colors.text }]}>{challenge.name}</Text>
                <Text style={[styles.challengeReward, { color: colors.tint }]}>
                  +{challenge.reward.xp} XP • {challenge.reward.bucks} Bucks
                </Text>
              </View>
              <Text style={[styles.challengeDescription, { color: colors.icon }]}>
                {challenge.description}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.icon + '10' }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${challenge.progress}%`, backgroundColor: colors.tint }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: colors.icon }]}>
                {Math.round(challenge.progress)}% complete
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Badges</Text>
          <View style={styles.badgesGrid}>
            {gamification?.badges.map((badge) => (
              <View 
                key={badge.id} 
                style={[
                  styles.badgeCard, 
                  { 
                    backgroundColor: badge.earned ? colors.tint + '15' : colors.background,
                    borderColor: badge.earned ? colors.tint : colors.icon + '20',
                    opacity: badge.earned ? 1 : 0.5,
                  }
                ]}>
                <IconSymbol 
                  name={badge.icon as any} 
                  size={32} 
                  color={badge.earned ? colors.tint : colors.icon} 
                />
                <Text style={[styles.badgeName, { color: colors.text }]}>{badge.name}</Text>
                <Text style={[styles.badgeDescription, { color: colors.icon }]}>
                  {badge.description}
                </Text>
                {!badge.earned && badge.progress !== undefined && (
                  <View style={[styles.badgeProgressBar, { backgroundColor: colors.icon + '10' }]}>
                    <View 
                      style={[
                        styles.badgeProgressFill, 
                        { width: `${badge.progress}%`, backgroundColor: colors.tint }
                      ]} 
                    />
                  </View>
                )}
                {badge.earned && (
                  <View style={[styles.earnedBadge, { backgroundColor: colors.tint }]}>
                    <IconSymbol name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMenu: {
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  tierToggleItem: {
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
    paddingTop: 16,
  },
  tierToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tierToggleText: {
    flex: 1,
  },
  tierToggleSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  profileMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  scoutCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  scoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scoutTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scoutRatingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoutRating: {
    fontSize: 48,
    fontWeight: '700',
  },
  scoutRatingLabel: {
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 4,
  },
  ratingBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  leaderboardCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  leaderboardRank: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rankNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  rankLabel: {
    fontSize: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  currencyCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyContent: {
    flex: 1,
  },
  currencyValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricUnit: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
  },
  trendBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  challengeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  challengeReward: {
    fontSize: 12,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  earnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

