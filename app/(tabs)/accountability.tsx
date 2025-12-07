import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { getHittingSessions, getSubscriptionTier, SubscriptionTier } from '@/data/localStorage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AccountabilityPartner {
  id: string;
  name: string;
  profilePicture?: string;
  complianceStatus: string;
  lastChecked: number;
}

interface Coach {
  id: string;
  name: string;
  certification?: string;
  profilePicture?: string;
}

interface ComplianceMetrics {
  workoutsCompleted: number;
  workoutsAssigned: number;
  lastWorkoutDate: number | null;
  lastTrackSession: number | null;
  daysSinceLastTrack: number;
  consecutiveMissedWorkouts: number;
}

export default function AccountabilityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [tier, setTier] = useState<SubscriptionTier>('pro');
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<AccountabilityPartner[]>([]);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [compliance, setCompliance] = useState<ComplianceMetrics | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    loadAccountabilityData();
  }, []);

  const loadAccountabilityData = async () => {
    try {
      const currentTier = await getSubscriptionTier();
      setTier(currentTier);
      
      // Load compliance metrics
      const sessions = await getHittingSessions();
      const complianceData = calculateCompliance(sessions);
      setCompliance(complianceData);
      
      // Load mock data for partners/coach
      if (currentTier === 'pro') {
        // Mock partners for Pro tier
        setPartners([
          {
            id: '1',
            name: 'Dad',
            complianceStatus: 'Completed 5/7 Workouts this Week',
            lastChecked: Date.now() - 3600000, // 1 hour ago
          },
          {
            id: '2',
            name: 'Teammate Mike',
            complianceStatus: 'Missed last session',
            lastChecked: Date.now() - 7200000, // 2 hours ago
          },
        ]);
      } else {
        // Mock coach for Elite tier
        setCoach({
          id: '1',
          name: 'Max JG',
          certification: 'Certified Elite Coach',
        });
      }
    } catch (error) {
      console.error('Error loading accountability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompliance = (sessions: any[]): ComplianceMetrics => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Get last track session
    const lastSession = sessions.length > 0 
      ? Math.max(...sessions.map(s => s.date))
      : null;
    
    const daysSinceLastTrack = lastSession 
      ? Math.floor((now - lastSession) / oneDay)
      : 999;
    
    // Mock workout data (in production, this would come from Training tab)
    const workoutsCompleted = 5;
    const workoutsAssigned = 7;
    const lastWorkoutDate = now - (2 * oneDay); // 2 days ago
    const consecutiveMissedWorkouts = 2;
    
    return {
      workoutsCompleted,
      workoutsAssigned,
      lastWorkoutDate,
      lastTrackSession: lastSession,
      daysSinceLastTrack,
      consecutiveMissedWorkouts,
    };
  };

  const generateInviteCode = () => {
    // Generate a unique invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setInviteCode(code);
    
    // In production, this would be sent to backend
    Alert.alert(
      'Invite Code Generated',
      `Share this code with your accountability partner: ${code}\n\nThey can use this code to connect with you.`,
      [{ text: 'OK' }]
    );
  };

  const handleChatWithCoach = () => {
    // In production, this would navigate to chat screen
    Alert.alert(
      'Chat with Coach',
      `Opening 1-on-1 chat with ${coach?.name}...\n\nThis is the only location where direct chat with your coach is available.`,
      [{ text: 'OK' }]
    );
  };

  // Pro Tier View
  const renderProView = () => (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Accountability Partners</Text>
      </View>

      {/* Invite Partner CTA */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.inviteButton, 
            { 
              backgroundColor: colors.tint,
              borderTopColor: 'rgba(255, 255, 255, 0.3)',
              borderBottomColor: 'rgba(0, 0, 0, 0.3)',
            }
          ]}
          onPress={generateInviteCode}
          activeOpacity={0.85}>
          <IconSymbol name="person.fill" size={20} color="#fff" />
          <Text style={styles.inviteButtonText}>Add Partners</Text>
        </TouchableOpacity>
      </View>

      {/* Compliance Status */}
      {compliance && (
        <View style={[styles.complianceCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
          <Text style={[styles.complianceTitle, { color: colors.text }]}>Your Compliance Status</Text>
          <View style={styles.complianceRow}>
            <Text style={[styles.complianceLabel, { color: colors.icon }]}>Workouts This Week:</Text>
            <Text style={[styles.complianceValue, { color: colors.text }]}>
              {compliance.workoutsCompleted}/{compliance.workoutsAssigned}
            </Text>
          </View>
          <View style={styles.complianceRow}>
            <Text style={[styles.complianceLabel, { color: colors.icon }]}>Last Track Session:</Text>
            <Text style={[styles.complianceValue, { color: colors.text }]}>
              {compliance.daysSinceLastTrack < 3 
                ? `${compliance.daysSinceLastTrack} days ago`
                : 'Over 3 days ago'}
            </Text>
          </View>
          {compliance.consecutiveMissedWorkouts >= 2 && (
            <View style={[styles.alertBadge, { backgroundColor: colors.secondary + '20' }]}>
              <IconSymbol name="bell.fill" size={16} color={colors.secondary} />
              <Text style={[styles.alertText, { color: colors.secondary }]}>
                Alert: {compliance.consecutiveMissedWorkouts} consecutive workouts missed
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Partners List */}
      <View style={styles.partnersSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Partners</Text>
        {partners.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <IconSymbol name="person.fill" size={48} color={colors.icon} />
            <Text style={[styles.emptyStateText, { color: colors.icon }]}>
              No partners connected yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.icon }]}>
              Invite a partner to start tracking together
            </Text>
          </View>
        ) : (
          partners.map((partner) => (
            <View 
              key={partner.id} 
              style={[styles.partnerCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={[styles.partnerAvatar, { backgroundColor: colors.tint + '20' }]}>
                <IconSymbol name="person.fill" size={24} color={colors.tint} />
              </View>
              <View style={styles.partnerInfo}>
                <Text style={[styles.partnerName, { color: colors.text }]}>{partner.name}</Text>
                <Text style={[styles.partnerStatus, { color: colors.icon }]}>
                  {partner.complianceStatus}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Notification Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint }]}>
        <IconSymbol name="bell.fill" size={20} color={colors.tint} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Automatic Notifications</Text>
          <Text style={[styles.infoText, { color: colors.icon }]}>
            Your partners will be notified if you miss 2 consecutive workouts or haven&apos;t logged a track session in 72 hours.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // Elite Tier View
  const renderEliteView = () => (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Elite Coaching Hub</Text>
      </View>

      {/* Assigned Coach */}
      {coach && (
        <View style={[styles.coachCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
          <View style={[styles.coachAvatar, { backgroundColor: colors.tint }]}>
            <IconSymbol name="person.fill" size={32} color="#fff" />
          </View>
          <View style={styles.coachInfo}>
            <Text style={[styles.coachLabel, { color: colors.icon }]}>Your Coach</Text>
            <Text style={[styles.coachName, { color: colors.text }]}>{coach.name}</Text>
            {coach.certification && (
              <Text style={[styles.coachCert, { color: colors.icon }]}>{coach.certification}</Text>
            )}
          </View>
        </View>
      )}

      {/* Chat with Coach CTA */}
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: colors.secondary }]}
        onPress={handleChatWithCoach}>
        <IconSymbol name="bubble.left.fill" size={20} color="#fff" />
        <Text style={styles.chatButtonText}>Message {coach?.name || 'Coach'}</Text>
        <Text style={styles.chatButtonSubtext}>1-on-1 Chat</Text>
      </TouchableOpacity>

      {/* Coach's Data Dashboard */}
      {compliance && (
        <View style={[styles.dashboardCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
          <View style={styles.dashboardHeader}>
            <IconSymbol name="chart.bar.fill" size={20} color={colors.tint} />
            <Text style={[styles.dashboardTitle, { color: colors.text }]}>
              Metrics Monitored by {coach?.name || 'Your Coach'}
            </Text>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricItem, { backgroundColor: colors.tint + '10' }]}>
              <Text style={[styles.metricLabel, { color: colors.icon }]}>Workout Compliance</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {compliance.workoutsCompleted}/{compliance.workoutsAssigned}
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.icon }]}>This Week</Text>
            </View>
            
            <View style={[styles.metricItem, { backgroundColor: colors.tint + '10' }]}>
              <Text style={[styles.metricLabel, { color: colors.icon }]}>Last Track Session</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {compliance.daysSinceLastTrack < 3 
                  ? `${compliance.daysSinceLastTrack}d`
                  : '3+ days'}
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.icon }]}>Days Ago</Text>
            </View>
          </View>

          {compliance.consecutiveMissedWorkouts >= 2 && (
            <View style={[styles.coachAlert, { backgroundColor: colors.secondary + '20' }]}>
              <IconSymbol name="bell.fill" size={16} color={colors.secondary} />
              <Text style={[styles.coachAlertText, { color: colors.secondary }]}>
                Coach Alert: {compliance.consecutiveMissedWorkouts} consecutive workouts missed - Follow-up needed
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Elite Benefits Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.secondary + '10', borderColor: colors.secondary }]}>
        <IconSymbol name="star.fill" size={20} color={colors.secondary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Elite Coaching Benefits</Text>
          <Text style={[styles.infoText, { color: colors.icon }]}>
            Your coach receives automated alerts based on your performance and can proactively reach out with personalized guidance.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {tier === 'pro' ? renderProView() : renderEliteView()}
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  buttonContainer: {
    marginBottom: 24,
    // Outer shadow for 3D depth effect
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 8,
    // 3D border effect - light top, dark bottom
    borderWidth: 1,
    borderTopWidth: 2,
    borderBottomWidth: 4,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  complianceCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  complianceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  complianceLabel: {
    fontSize: 14,
  },
  complianceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  partnersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  partnerStatus: {
    fontSize: 14,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    gap: 16,
  },
  coachAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
  },
  coachLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  coachCert: {
    fontSize: 14,
  },
  chatButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  chatButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  dashboardCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
  },
  coachAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  coachAlertText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

