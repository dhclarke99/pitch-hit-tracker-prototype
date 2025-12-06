import { Colors } from '@/constants/theme';
import { HitMetrics, HittingSession, saveHittingSession } from '@/data/localStorage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateSyntheticTrack, inferHitMetricsFromTrack } from '@/ml/inferBallFlight';
import { MetricCard } from '@/ui/MetricCard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HitScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [permission, requestPermission] = useCameraPermissions();
  
  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<HittingSession | null>(null);
  const [swingCount, setSwingCount] = useState(0);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Current swing results
  const [currentSwing, setCurrentSwing] = useState<HitMetrics | null>(null);
  
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    MediaLibrary.requestPermissionsAsync().catch(console.error);
  }, [permission?.granted, requestPermission]);

  const startSession = () => {
    const now = new Date();
    const label = `Cage BP – ${now.toLocaleDateString()}`;
    
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
  };

  const endSession = async () => {
    if (!currentSession) return;
    
    if (currentSession.swings.length > 0) {
      try {
        await saveHittingSession(currentSession);
        Alert.alert('Success', `Session saved with ${currentSession.swings.length} swings!`);
      } catch (error) {
        console.error('Error saving session:', error);
        Alert.alert('Error', 'Failed to save session');
      }
    }
    
    setSessionActive(false);
    setCurrentSession(null);
    setSwingCount(0);
    setCurrentSwing(null);
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>
          Camera permission is required
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#fff' }]}>Hit Trax</Text>
            {sessionActive && (
              <Text style={[styles.sessionInfo, { color: '#fff' }]}>
                Session: {swingCount} swings
              </Text>
            )}
          </View>
          
          {!sessionActive && (
            <TouchableOpacity
              style={[styles.sessionButton, { backgroundColor: colors.tint }]}
              onPress={startSession}>
              <Text style={styles.sessionButtonText}>Start Session</Text>
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
      
      {currentSwing && (
        <ScrollView 
          style={styles.resultsContainer} 
          contentContainerStyle={styles.resultsContent}>
          <Text style={[styles.resultsTitle, { color: colors.text }]}>
            Swing #{swingCount}
          </Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Exit Velocity"
              value={currentSwing.exitVelocity}
              unit="mph"
              variant="primary"
            />
            <MetricCard
              label="Launch Angle"
              value={currentSwing.launchAngle}
              unit="°"
              variant="secondary"
            />
            <MetricCard
              label="Spray Angle"
              value={currentSwing.sprayAngle}
              unit="°"
              variant="secondary"
            />
            <MetricCard
              label="Distance"
              value={currentSwing.estimatedDistance}
              unit="ft"
              variant="primary"
            />
            <View style={[styles.outcomeCard, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}>
              <Text style={[styles.outcomeLabel, { color: colors.icon }]}>Outcome</Text>
              <Text style={[styles.outcomeValue, { color: colors.text }]}>
                {currentSwing.outcome}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
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
    paddingTop: 50,
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
  sessionInfo: {
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
});
