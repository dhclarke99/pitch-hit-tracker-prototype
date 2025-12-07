import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { HitMetrics, HittingSession, saveHittingSession } from '@/data/localStorage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateSyntheticTrack, inferHitMetricsFromTrack } from '@/ml/inferBallFlight';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SessionType = 'free-hit' | 'program-drill' | 'challenge';

interface SessionConfig {
  type: SessionType;
  goalEV?: number; // For program drill
  label: string;
}

export default function TrackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [permission, requestPermission] = useCameraPermissions();
  
  // Session selection state
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  
  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<HittingSession | null>(null);
  const [swingCount, setSwingCount] = useState(0);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Current swing results
  const [currentSwing, setCurrentSwing] = useState<HitMetrics | null>(null);
  
  // Post-session stat card
  const [showStatCard, setShowStatCard] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    avgExitVelocity: number;
    avgLaunchAngle: number;
    avgDistance: number;
    bestExitVelocity: number;
    bestDistance: number;
  } | null>(null);
  
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Only request media library permission, not camera (user will click button)
    MediaLibrary.requestPermissionsAsync().catch(console.error);
  }, []);

  const selectSessionType = (type: SessionType, goalEV?: number) => {
    let label = '';
    switch (type) {
      case 'free-hit':
        label = 'Free Hit';
        break;
      case 'program-drill':
        label = `Program Drill (Goal: ${goalEV || 80} EV)`;
        break;
      case 'challenge':
        label = 'Homerun Derby Challenge';
        break;
    }
    
    setSessionConfig({ type, goalEV, label });
    setShowSessionSelector(false);
    startSession({ type, goalEV, label });
  };

  const startSession = (config: SessionConfig) => {
    const now = new Date();
    const label = `${config.label} – ${now.toLocaleDateString()}`;
    
    const session: HittingSession = {
      id: Date.now().toString(),
      label,
      date: now.getTime(),
      swings: [],
    };
    
    setCurrentSession(session);
    setSessionActive(true);
    setSwingCount(0);
    setCurrentSwing(null);
    setShowStatCard(false);
  };

  const calculateSessionStats = (swings: HitMetrics[]) => {
    if (swings.length === 0) return null;
    
    const avgExitVelocity = swings.reduce((sum, s) => sum + s.exitVelocity, 0) / swings.length;
    const avgLaunchAngle = swings.reduce((sum, s) => sum + s.launchAngle, 0) / swings.length;
    const avgDistance = swings.reduce((sum, s) => sum + s.estimatedDistance, 0) / swings.length;
    const bestExitVelocity = Math.max(...swings.map(s => s.exitVelocity));
    const bestDistance = Math.max(...swings.map(s => s.estimatedDistance));
    
    return {
      avgExitVelocity,
      avgLaunchAngle,
      avgDistance,
      bestExitVelocity,
      bestDistance,
    };
  };

  const endSession = async () => {
    if (!currentSession) return;
    
    // Calculate session stats
    const stats = calculateSessionStats(currentSession.swings);
    setSessionStats(stats);
    
    // Show stat card if there are swings
    if (currentSession.swings.length > 0) {
      setShowStatCard(true);
    } else {
      // No swings, just close the session
      setSessionActive(false);
      setCurrentSession(null);
      setSwingCount(0);
      setCurrentSwing(null);
      setSessionConfig(null);
    }
  };

  const handleSaveToProgress = async () => {
    if (!currentSession) return;
    
    try {
      await saveHittingSession(currentSession);
      Alert.alert('Success', `Session saved with ${currentSession.swings.length} swings!`);
      closeSession();
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Error', 'Failed to save session');
    }
  };

  const handleShareToFeed = async () => {
    if (!currentSession || !sessionStats) return;
    
    try {
      // Save to progress first
      await saveHittingSession(currentSession);
      
      // TODO: In production, this would post to a feed/social system
      // For now, we'll simulate sharing
      Alert.alert(
        'Shared to Feed! 🎉',
        `Your ${sessionConfig?.label} session has been shared!\n\n` +
        `Best Exit Velocity: ${sessionStats.bestExitVelocity.toFixed(1)} mph\n` +
        `Best Distance: ${sessionStats.bestDistance.toFixed(0)} ft`,
        [{ text: 'OK', onPress: closeSession }]
      );
    } catch (error) {
      console.error('Error sharing to feed:', error);
      Alert.alert('Error', 'Failed to share to feed');
    }
  };

  const closeSession = () => {
    setSessionActive(false);
    setCurrentSession(null);
    setSwingCount(0);
    setCurrentSwing(null);
    setSessionConfig(null);
    setShowStatCard(false);
    setSessionStats(null);
  };

  const captureSwing = async () => {
    if (!cameraRef.current || !sessionActive) return;
    
    try {
      setIsRecording(true);
      
      // Record a short clip (2 seconds should capture the ball flight)
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: 2,
      });
      
      recordingPromise
        .then(async (recording) => {
          setIsRecording(false);
          if (recording && 'uri' in recording && recording.uri) {
            await processSwing(recording.uri);
          }
        })
        .catch((error) => {
          console.error('Error during recording:', error);
          setIsRecording(false);
          Alert.alert('Error', 'Recording failed');
        });
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const processSwing = async (videoUri: string) => {
    setIsProcessing(true);
    
    try {
      // TODO: In production, extract actual ball track from video using CoreML
      // For now, generate a synthetic track with realistic variation
      const randomVariation = () => (Math.random() - 0.5) * 20; // ±10 variation
      const exitVel = 75 + randomVariation(); // 65-85 mph range
      const launchAngle = 15 + (Math.random() - 0.5) * 30; // 0-30 degree range
      const sprayAngle = (Math.random() - 0.5) * 60; // ±30 degrees
      
      const track = generateSyntheticTrack(exitVel, launchAngle, sprayAngle, 0.5, 30);
      
      // Infer metrics from track
      const metrics = inferHitMetricsFromTrack(track);
      
      // Add timestamp
      const swingMetrics: HitMetrics = {
        ...metrics,
        timestamp: Date.now(),
      };
      
      setCurrentSwing(swingMetrics);
      
      // Add to current session
      if (currentSession) {
        const updatedSession: HittingSession = {
          ...currentSession,
          swings: [...currentSession.swings, swingMetrics],
        };
        setCurrentSession(updatedSession);
        setSwingCount(updatedSession.swings.length);
      }
    } catch (error) {
      console.error('Error processing swing:', error);
      Alert.alert('Error', 'Failed to process swing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.permissionContainer}>
          <Text style={[styles.message, { color: colors.text }]}>
            Camera permission is required
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert(
                  'Permission Required',
                  'Camera permission is required to track swings. Please enable it in your device settings.',
                  [{ text: 'OK' }]
                );
              }
            }}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#fff' }]}>Hit Trax</Text>
            {sessionActive && sessionConfig && (
              <View style={styles.sessionInfoContainer}>
                <Text style={[styles.sessionInfo, { color: '#fff' }]}>
                  {sessionConfig.label}
                </Text>
                <Text style={[styles.sessionInfo, { color: '#fff' }]}>
                  {swingCount} swings
                </Text>
                {sessionConfig.type === 'program-drill' && sessionConfig.goalEV && (
                  <Text style={[styles.goalText, { color: '#fff' }]}>
                    Goal: {sessionConfig.goalEV} mph EV
                  </Text>
                )}
              </View>
            )}
          </View>
          
          {!sessionActive && (
            <TouchableOpacity
              style={[styles.sessionButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowSessionSelector(true)}>
              <Text style={styles.sessionButtonText}>+ Track</Text>
            </TouchableOpacity>
          )}
          
          {sessionActive && (
            <View style={styles.sessionControls}>
              {!isRecording && !isProcessing && (
                <TouchableOpacity
                  style={[styles.captureButton, { backgroundColor: '#ff0000' }]}
                  onPress={captureSwing}>
                  <Text style={styles.captureButtonText}>Capture Swing</Text>
                </TouchableOpacity>
              )}
              
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={[styles.recordingText, { color: '#fff' }]}>Recording...</Text>
                </View>
              )}
              
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={[styles.processingText, { color: '#fff' }]}>
                    Processing swing...
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.endButton, { backgroundColor: colors.icon + '80' }]}
                onPress={endSession}>
                <Text style={styles.endButtonText}>End Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CameraView>
      
      {/* Session Selector Modal */}
      <Modal
        visible={showSessionSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSessionSelector(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Session Type</Text>
            <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
              Choose how you want to track your session
            </Text>
            
            <TouchableOpacity
              style={[styles.sessionTypeButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
              onPress={() => selectSessionType('free-hit')}>
              <IconSymbol name="sportscourt.fill" size={32} color={colors.tint} />
              <View style={styles.sessionTypeContent}>
                <Text style={[styles.sessionTypeTitle, { color: colors.text }]}>Free Hit</Text>
                <Text style={[styles.sessionTypeDescription, { color: colors.icon }]}>
                  Practice freely without goals or constraints
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sessionTypeButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
              onPress={() => selectSessionType('program-drill', 80)}>
              <IconSymbol name="dumbbell.fill" size={32} color={colors.tint} />
              <View style={styles.sessionTypeContent}>
                <Text style={[styles.sessionTypeTitle, { color: colors.text }]}>Program Drill</Text>
                <Text style={[styles.sessionTypeDescription, { color: colors.icon }]}>
                  Goal: 80 mph Exit Velocity
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sessionTypeButton, { backgroundColor: colors.secondary + '20', borderColor: colors.secondary }]}
              onPress={() => selectSessionType('challenge')}>
              <IconSymbol name="trophy.fill" size={32} color={colors.secondary} />
              <View style={styles.sessionTypeContent}>
                <Text style={[styles.sessionTypeTitle, { color: colors.text }]}>Homerun Derby</Text>
                <Text style={[styles.sessionTypeDescription, { color: colors.icon }]}>
                  Challenge mode - compete for distance!
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.icon + '20' }]}
              onPress={() => setShowSessionSelector(false)}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Post-Session Stat Card Modal */}
      <Modal
        visible={showStatCard}
        transparent
        animationType="slide"
        onRequestClose={closeSession}>
        <View style={styles.modalOverlay}>
          <View style={[styles.statCardModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.statCardTitle, { color: colors.text }]}>Session Complete!</Text>
            {sessionConfig && (
              <Text style={[styles.statCardSubtitle, { color: colors.icon }]}>
                {sessionConfig.label}
              </Text>
            )}
            
            {sessionStats && (
              <View style={styles.statCardContent}>
                <View style={styles.statCardHeader}>
                  <Text style={[styles.statCardSectionTitle, { color: colors.text }]}>Session Stats</Text>
                </View>
                
                <View style={styles.statMetrics}>
                  <View style={[styles.statMetricCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
                    <Text style={[styles.statMetricLabel, { color: colors.icon }]}>Avg Exit Velocity</Text>
                    <Text style={[styles.statMetricValue, { color: colors.tint }]}>
                      {sessionStats.avgExitVelocity.toFixed(1)}
                    </Text>
                    <Text style={[styles.statMetricUnit, { color: colors.icon }]}>mph</Text>
                  </View>
                  
                  <View style={[styles.statMetricCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
                    <Text style={[styles.statMetricLabel, { color: colors.icon }]}>Avg Launch Angle</Text>
                    <Text style={[styles.statMetricValue, { color: colors.tint }]}>
                      {sessionStats.avgLaunchAngle.toFixed(1)}
                    </Text>
                    <Text style={[styles.statMetricUnit, { color: colors.icon }]}>°</Text>
                  </View>
                  
                  <View style={[styles.statMetricCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
                    <Text style={[styles.statMetricLabel, { color: colors.icon }]}>Avg Distance</Text>
                    <Text style={[styles.statMetricValue, { color: colors.tint }]}>
                      {sessionStats.avgDistance.toFixed(0)}
                    </Text>
                    <Text style={[styles.statMetricUnit, { color: colors.icon }]}>ft</Text>
                  </View>
                </View>
                
                <View style={styles.bestStats}>
                  <View style={[styles.bestStatItem, { backgroundColor: colors.secondary + '15' }]}>
                    <IconSymbol name="bolt.fill" size={20} color={colors.secondary} />
                    <View style={styles.bestStatContent}>
                      <Text style={[styles.bestStatLabel, { color: colors.icon }]}>Best Exit Velocity</Text>
                      <Text style={[styles.bestStatValue, { color: colors.text }]}>
                        {sessionStats.bestExitVelocity.toFixed(1)} mph
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.bestStatItem, { backgroundColor: colors.secondary + '15' }]}>
                    <IconSymbol name="location.fill" size={20} color={colors.secondary} />
                    <View style={styles.bestStatContent}>
                      <Text style={[styles.bestStatLabel, { color: colors.icon }]}>Best Distance</Text>
                      <Text style={[styles.bestStatValue, { color: colors.text }]}>
                        {sessionStats.bestDistance.toFixed(0)} ft
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.statCardActions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveToProgress}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save to Progress</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.secondary }]}
                onPress={handleShareToFeed}>
                <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share to Feed</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.closeStatCardButton, { backgroundColor: colors.icon + '20' }]}
              onPress={closeSession}>
              <Text style={[styles.closeStatCardText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Current Swing Results (shown during session) */}
      {currentSwing && !showStatCard && (
        <ScrollView 
          style={styles.resultsContainer} 
          contentContainerStyle={styles.resultsContent}>
          <Text style={[styles.resultsTitle, { color: '#fff' }]}>
            Swing #{swingCount}
          </Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCardDark, { backgroundColor: colors.tint + '30', borderColor: colors.tint }]}>
              <Text style={[styles.metricLabelDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>Exit Velocity</Text>
              <View style={styles.valueContainerDark}>
                <Text style={[styles.metricValueDark, { color: '#fff' }]}>
                  {currentSwing.exitVelocity.toFixed(1)}
                </Text>
                <Text style={[styles.metricUnitDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>mph</Text>
              </View>
            </View>
            <View style={[styles.metricCardDark, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={[styles.metricLabelDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>Launch Angle</Text>
              <View style={styles.valueContainerDark}>
                <Text style={[styles.metricValueDark, { color: '#fff' }]}>
                  {currentSwing.launchAngle.toFixed(1)}
                </Text>
                <Text style={[styles.metricUnitDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>°</Text>
              </View>
            </View>
            <View style={[styles.metricCardDark, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={[styles.metricLabelDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>Spray Angle</Text>
              <View style={styles.valueContainerDark}>
                <Text style={[styles.metricValueDark, { color: '#fff' }]}>
                  {currentSwing.sprayAngle.toFixed(1)}
                </Text>
                <Text style={[styles.metricUnitDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>°</Text>
              </View>
            </View>
            <View style={[styles.metricCardDark, { backgroundColor: colors.tint + '30', borderColor: colors.tint }]}>
              <Text style={[styles.metricLabelDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>Distance</Text>
              <View style={styles.valueContainerDark}>
                <Text style={[styles.metricValueDark, { color: '#fff' }]}>
                  {currentSwing.estimatedDistance.toFixed(0)}
                </Text>
                <Text style={[styles.metricUnitDark, { color: 'rgba(255, 255, 255, 0.7)' }]}>ft</Text>
              </View>
            </View>
            <View style={[styles.outcomeCard, { backgroundColor: colors.tint + '30', borderColor: colors.tint }]}>
              <Text style={[styles.outcomeLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>Outcome</Text>
              <Text style={[styles.outcomeValue, { color: '#fff' }]}>
                {currentSwing.outcome}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  sessionInfoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  sessionInfo: {
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 4,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sessionButton: {
    alignSelf: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 40,
  },
  sessionButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  sessionControls: {
    alignItems: 'center',
    marginBottom: 40,
  },
  captureButton: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 16,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    marginBottom: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  endButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    maxHeight: 350,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  resultsContent: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  outcomeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 120,
    alignItems: 'center',
  },
  outcomeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outcomeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  sessionTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    gap: 16,
  },
  sessionTypeContent: {
    flex: 1,
  },
  sessionTypeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionTypeDescription: {
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Stat Card Modal styles
  statCardModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  statCardTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  statCardSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  statCardContent: {
    marginBottom: 24,
  },
  statCardHeader: {
    marginBottom: 16,
  },
  statCardSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statMetricCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  statMetricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statMetricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statMetricUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  bestStats: {
    gap: 12,
    marginTop: 8,
  },
  bestStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  bestStatContent: {
    flex: 1,
  },
  bestStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  bestStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statCardActions: {
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeStatCardButton: {
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeStatCardText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Dark background metric card styles
  metricCardDark: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  metricLabelDark: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainerDark: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValueDark: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricUnitDark: {
    fontSize: 14,
    fontWeight: '500',
  },
});
