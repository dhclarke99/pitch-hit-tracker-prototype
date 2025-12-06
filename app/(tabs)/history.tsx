import { Colors } from '@/constants/theme';
import {
    deleteHittingSession,
    getHittingSessions,
    HitMetrics,
    HittingSession,
} from '@/data/localStorage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MetricCard } from '@/ui/MetricCard';
import React, { useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [sessions, setSessions] = useState<HittingSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    try {
      const hittingSessions = await getHittingSessions();
      setSessions(hittingSessions.sort((a: HittingSession, b: HittingSession) => b.date - a.date));
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleDelete = async (session: HittingSession) => {
    try {
      await deleteHittingSession(session.id);
      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateSessionStats = (session: HittingSession) => {
    if (session.swings.length === 0) {
      return {
        avgEV: 0,
        maxEV: 0,
        groundBalls: 0,
        lineDrives: 0,
        flyBalls: 0,
        popUps: 0,
      };
    }

    const evs = session.swings.map((s: HitMetrics) => s.exitVelocity);
    const avgEV = evs.reduce((a: number, b: number) => a + b, 0) / evs.length;
    const maxEV = Math.max(...evs);

    const groundBalls = session.swings.filter((s: HitMetrics) => s.outcome === 'Ground ball').length;
    const lineDrives = session.swings.filter((s: HitMetrics) => s.outcome === 'Line drive').length;
    const flyBalls = session.swings.filter((s: HitMetrics) => s.outcome === 'Fly ball').length;
    const popUps = session.swings.filter((s: HitMetrics) => s.outcome === 'Pop up').length;

    return {
      avgEV,
      maxEV,
      groundBalls,
      lineDrives,
      flyBalls,
      popUps,
    };
  };

  const renderEVChart = (session: HittingSession) => {
    if (session.swings.length === 0) return null;

    const evs = session.swings.map((s: HitMetrics) => s.exitVelocity);
    const maxEV = Math.max(...evs);
    const minEV = Math.min(...evs);
    const range = maxEV - minEV || 1;

    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.background, borderColor: colors.icon + '30' }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Exit Velocity by Swing</Text>
        <View style={styles.chart}>
          {evs.map((ev: number, index: number) => {
            const height = ((ev - minEV) / range) * 100;
            return (
              <View key={index} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${Math.max(height, 10)}%`,
                      backgroundColor: colors.tint,
                    },
                  ]}
                />
                <Text style={[styles.chartLabel, { color: colors.icon }]}>
                  {ev.toFixed(0)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSession = (session: HittingSession) => {
    const stats = calculateSessionStats(session);

    return (
      <View
        key={session.id}
        style={[
          styles.sessionCard,
          { backgroundColor: colors.background, borderColor: colors.icon + '30' },
        ]}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionHeaderLeft}>
            <Text style={[styles.sessionLabel, { color: colors.text }]}>
              {session.label}
            </Text>
            <Text style={[styles.sessionDate, { color: colors.icon }]}>
              {formatDate(session.date)}
            </Text>
            <Text style={[styles.swingCount, { color: colors.icon }]}>
              {session.swings.length} swings
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(session)}
            style={[styles.deleteButton, { backgroundColor: colors.icon + '20' }]}>
            <Text style={[styles.deleteButtonText, { color: colors.icon }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Summary</Text>
          <View style={styles.summaryGrid}>
            <MetricCard
              label="Avg EV"
              value={stats.avgEV}
              unit="mph"
              variant="primary"
            />
            <MetricCard
              label="Max EV"
              value={stats.maxEV}
              unit="mph"
              variant="primary"
            />
          </View>
          <View style={styles.outcomeCounts}>
            <View style={[styles.outcomeBadge, { backgroundColor: colors.icon + '20' }]}>
              <Text style={[styles.outcomeCount, { color: colors.text }]}>
                GB: {stats.groundBalls}
              </Text>
            </View>
            <View style={[styles.outcomeBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.outcomeCount, { color: colors.text }]}>
                LD: {stats.lineDrives}
              </Text>
            </View>
            <View style={[styles.outcomeBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.outcomeCount, { color: colors.text }]}>
                FB: {stats.flyBalls}
              </Text>
            </View>
            <View style={[styles.outcomeBadge, { backgroundColor: colors.icon + '20' }]}>
              <Text style={[styles.outcomeCount, { color: colors.text }]}>
                PU: {stats.popUps}
              </Text>
            </View>
          </View>
        </View>

        {/* EV Chart */}
        {renderEVChart(session)}

        {/* Individual Swings */}
        <View style={styles.swingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Swings</Text>
          {session.swings.map((swing: HitMetrics, index: number) => (
            <View
              key={index}
              style={[styles.swingCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.swingHeader}>
                <Text style={[styles.swingNumber, { color: colors.tint }]}>
                  Swing #{index + 1}
                </Text>
                <Text style={[styles.swingOutcome, { color: colors.text }]}>
                  {swing.outcome}
                </Text>
              </View>
              <View style={styles.swingMetrics}>
                <MetricCard
                  label="EV"
                  value={swing.exitVelocity}
                  unit="mph"
                  variant="primary"
                />
                <MetricCard
                  label="LA"
                  value={swing.launchAngle}
                  unit="°"
                  variant="secondary"
                />
                <MetricCard
                  label="Distance"
                  value={swing.estimatedDistance}
                  unit="ft"
                  variant="secondary"
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.icon + '30' }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Hitting History</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No hitting sessions yet. Start a session to begin tracking!
            </Text>
          </View>
        ) : (
          sessions.map((session) => renderSession(session))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sessionHeaderLeft: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  swingCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
    marginBottom: 12,
  },
  outcomeCounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outcomeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  outcomeCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  swingsSection: {
    marginTop: 8,
  },
  swingCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  swingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  swingNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  swingOutcome: {
    fontSize: 14,
    fontWeight: '600',
  },
  swingMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
