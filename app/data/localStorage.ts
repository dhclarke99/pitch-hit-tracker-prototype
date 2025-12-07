// Using in-memory storage for now - can be swapped to AsyncStorage later
// To use AsyncStorage: npm install @react-native-async-storage/async-storage
// Then replace this implementation with AsyncStorage

interface Storage {
  [key: string]: string;
}

const memoryStorage: Storage = {};

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return memoryStorage[key] || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryStorage[key] = value;
  },
  async removeItem(key: string): Promise<void> {
    delete memoryStorage[key];
  },
};

// Storage keys
const PITCH_SESSIONS_KEY = '@pitch_sessions';
const HIT_SESSIONS_KEY = '@hit_sessions';
const HITTING_SESSIONS_KEY = '@hitting_sessions';
const SUBSCRIPTION_TIER_KEY = '@subscription_tier';

// Types
export interface PitchSession {
  id: string;
  timestamp: number;
  velocity: number; // mph
  verticalMovement: number; // inches
  horizontalMovement: number; // inches
  duration: number; // seconds
}

export interface HitSession {
  id: string;
  timestamp: number;
  exitVelocity: number; // mph
  launchAngle: number; // degrees
  sprayAngle: number; // degrees
  estimatedDistance: number; // feet
  duration: number; // seconds
}

// Hitting metrics for a single swing
export interface HitMetrics {
  exitVelocity: number; // mph
  launchAngle: number; // degrees
  sprayAngle: number; // degrees
  estimatedDistance: number; // feet
  outcome: 'Ground ball' | 'Line drive' | 'Fly ball' | 'Pop up';
  timestamp: number; // when this swing occurred
}

// A hitting session contains multiple swings
export interface HittingSession {
  id: string;
  label: string; // e.g., "Cage BP – 2025-12-05"
  date: number; // timestamp
  swings: HitMetrics[];
}

// Pitch Session Storage
export async function savePitchSession(session: PitchSession): Promise<void> {
  try {
    const sessions = await getPitchSessions();
    sessions.push(session);
    await AsyncStorage.setItem(PITCH_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving pitch session:', error);
    throw error;
  }
}

export async function getPitchSessions(): Promise<PitchSession[]> {
  try {
    const data = await AsyncStorage.getItem(PITCH_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pitch sessions:', error);
    return [];
  }
}

export async function deletePitchSession(id: string): Promise<void> {
  try {
    const sessions = await getPitchSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await AsyncStorage.setItem(PITCH_SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting pitch session:', error);
    throw error;
  }
}

// Hit Session Storage
export async function saveHitSession(session: HitSession): Promise<void> {
  try {
    const sessions = await getHitSessions();
    sessions.push(session);
    await AsyncStorage.setItem(HIT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving hit session:', error);
    throw error;
  }
}

export async function getHitSessions(): Promise<HitSession[]> {
  try {
    const data = await AsyncStorage.getItem(HIT_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting hit sessions:', error);
    return [];
  }
}

export async function deleteHitSession(id: string): Promise<void> {
  try {
    const sessions = await getHitSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await AsyncStorage.setItem(HIT_SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting hit session:', error);
    throw error;
  }
}

// Hitting Session Storage
export async function saveHittingSession(session: HittingSession): Promise<void> {
  try {
    const sessions = await getHittingSessions();
    sessions.push(session);
    await AsyncStorage.setItem(HITTING_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving hitting session:', error);
    throw error;
  }
}

export async function getHittingSessions(): Promise<HittingSession[]> {
  try {
    const data = await AsyncStorage.getItem(HITTING_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting hitting sessions:', error);
    return [];
  }
}

export async function deleteHittingSession(id: string): Promise<void> {
  try {
    const sessions = await getHittingSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await AsyncStorage.setItem(HITTING_SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting hitting session:', error);
    throw error;
  }
}

// Combined session retrieval (sorted by timestamp)
export async function getAllSessions(): Promise<(PitchSession | HitSession)[]> {
  try {
    const pitches = await getPitchSessions();
    const hits = await getHitSessions();
    const all = [...pitches, ...hits];
    return all.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}

// Subscription Tier Storage
export type SubscriptionTier = 'pro' | 'elite';

export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_TIER_KEY);
    return (data as SubscriptionTier) || 'pro'; // Default to 'pro'
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    return 'pro';
  }
}

export async function setSubscriptionTier(tier: SubscriptionTier): Promise<void> {
  try {
    await AsyncStorage.setItem(SUBSCRIPTION_TIER_KEY, tier);
  } catch (error) {
    console.error('Error setting subscription tier:', error);
    throw error;
  }
}

