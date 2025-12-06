/**
 * Ball Flight Inference Pipeline
 * 
 * This module implements the ML pipeline for tracking ball flight and inferring
 * velocity, trajectory, and movement metrics.
 * 
 * Structure is designed to be compatible with CoreML models that can be
 * dropped in later without refactoring.
 */

import { CalibrationData, CameraCalibration, getCalibration, getDefaultCalibrationData } from './calibration';

// Ball detection bounding box
export interface BallDetection {
  x: number; // center x in pixels
  y: number; // center y in pixels
  width: number; // pixels
  height: number; // pixels
  confidence: number; // 0-1
  frameIndex: number;
  timestamp: number; // seconds
}

// 3D position (reconstructed)
export interface BallPosition3D {
  x: number; // meters
  y: number; // meters
  z: number; // meters
  timestamp: number; // seconds
}

// Trajectory data
export interface Trajectory {
  positions: BallPosition3D[];
  velocity: number; // m/s
  launchAngle: number; // degrees
  direction: number; // degrees (0 = straight, positive = right)
  verticalMovement?: number; // inches (for pitches)
  horizontalMovement?: number; // inches (for pitches)
}

// Physics constants
const GRAVITY = 9.81; // m/s²
const BALL_MASS = 0.145; // kg (baseball)
const BALL_RADIUS = 0.0366; // meters (2.9 inches)
const AIR_DENSITY = 1.225; // kg/m³
const DRAG_COEFFICIENT = 0.3; // approximate for baseball

// Ball track point (from ball detection/tracking)
export interface BallTrackPoint {
  t: number; // time in seconds
  x: number; // pixel x coordinate
  y: number; // pixel y coordinate
  conf: number; // confidence (0-1)
}

// Hit metrics result
export interface HitMetrics {
  exitVelocity: number; // mph
  launchAngle: number; // degrees
  sprayAngle: number; // degrees
  estimatedDistance: number; // feet
  outcome: 'Ground ball' | 'Line drive' | 'Fly ball' | 'Pop up';
}

/**
 * Extract frames from video
 * In production, this would use video processing
 */
export async function extractFrames(
  videoUri: string,
  fps: number = 30
): Promise<{ frameIndex: number; timestamp: number }[]> {
  // TODO: Implement actual frame extraction
  // For now, return placeholder
  const frames: { frameIndex: number; timestamp: number }[] = [];
  const duration = 2; // seconds
  const frameCount = Math.floor(duration * fps);
  
  for (let i = 0; i < frameCount; i++) {
    frames.push({
      frameIndex: i,
      timestamp: i / fps,
    });
  }
  
  return frames;
}

/**
 * Detect ball in frame
 * In production, this would use CoreML object detection model
 */
export async function detectBall(
  frame: any, // Image/Frame data
  frameIndex: number,
  timestamp: number
): Promise<BallDetection | null> {
  // TODO: Implement actual ball detection using CoreML
  // Placeholder: simulate detection in center of frame
  const calibration = getCalibration();
  
  // Simulate ball moving across frame
  const progress = Math.min(timestamp / 0.5, 1); // 0.5s flight
  const x = calibration.imageWidth * (0.3 + progress * 0.4);
  const y = calibration.imageHeight * (0.4 + progress * 0.2);
  
  return {
    x,
    y,
    width: 20,
    height: 20,
    confidence: 0.9,
    frameIndex,
    timestamp,
  };
}

/**
 * Reconstruct 3D position from 2D detection
 * Uses camera calibration and physics constraints
 */
export function reconstruct3D(
  detection: BallDetection,
  calibration: CameraCalibration
): BallPosition3D {
  // Simplified 3D reconstruction
  // In production, this would use proper camera geometry
  
  // Convert pixel coordinates to normalized coordinates
  const nx = (detection.x - calibration.principalPoint.x) / calibration.focalLength.x;
  const ny = (detection.y - calibration.principalPoint.y) / calibration.focalLength.y;
  
  // Estimate depth based on ball size (larger = closer)
  // This is a simplified approach
  const ballSizePixels = Math.max(detection.width, detection.height);
  const estimatedDepth = (calibration.focalLength.x * BALL_RADIUS * 2) / ballSizePixels;
  
  // Convert to 3D coordinates
  const x = nx * estimatedDepth;
  const y = ny * estimatedDepth;
  const z = estimatedDepth;
  
  return {
    x,
    y,
    z,
    timestamp: detection.timestamp,
  };
}

/**
 * Calculate velocity from trajectory
 */
export function calculateVelocity(positions: BallPosition3D[]): number {
  if (positions.length < 2) return 0;
  
  // Use first two positions to estimate initial velocity
  const p1 = positions[0];
  const p2 = positions[1];
  const dt = p2.timestamp - p1.timestamp;
  
  if (dt <= 0) return 0;
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  const velocity = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
  return velocity; // m/s
}

/**
 * Calculate launch angle from trajectory
 */
export function calculateLaunchAngle(positions: BallPosition3D[]): number {
  if (positions.length < 2) return 0;
  
  const p1 = positions[0];
  const p2 = positions[1];
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  // Launch angle is angle from horizontal
  const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dz, horizontalDistance);
  
  return (angle * 180) / Math.PI; // degrees
}

/**
 * Calculate direction/spray angle
 */
export function calculateDirection(positions: BallPosition3D[]): number {
  if (positions.length < 2) return 0;
  
  const p1 = positions[0];
  const p2 = positions[1];
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  // Direction angle (0 = straight, positive = right)
  const angle = Math.atan2(dy, dx);
  return (angle * 180) / Math.PI; // degrees
}

/**
 * Calculate vertical and horizontal movement for pitches
 */
export function calculatePitchMovement(positions: BallPosition3D[]): {
  vertical: number; // inches
  horizontal: number; // inches
} {
  if (positions.length < 2) return { vertical: 0, horizontal: 0 };
  
  const start = positions[0];
  const end = positions[positions.length - 1];
  
  // Calculate movement from start to end
  // Convert meters to inches
  const verticalInches = (end.z - start.z) * 39.3701;
  const horizontalInches = (end.y - start.y) * 39.3701;
  
  return {
    vertical: verticalInches,
    horizontal: horizontalInches,
  };
}

/**
 * Estimate distance for hits using physics
 */
export function estimateDistance(
  exitVelocity: number, // m/s
  launchAngle: number, // degrees
  sprayAngle: number // degrees
): number {
  // Simplified projectile motion with drag
  // In production, this would use more sophisticated physics
  
  const angleRad = (launchAngle * Math.PI) / 180;
  const v0 = exitVelocity;
  
  // Initial velocity components
  const vx0 = v0 * Math.cos(angleRad);
  const vz0 = v0 * Math.sin(angleRad);
  
  // Simplified calculation (ignoring drag for now)
  // Time of flight
  const t = (2 * vz0) / GRAVITY;
  
  // Horizontal distance
  const distance = vx0 * t;
  
  // Convert meters to feet
  return distance * 3.28084;
}

/**
 * Main inference function for pitch tracking
 */
export async function inferPitchTrajectory(
  videoUri: string
): Promise<{
  velocity: number; // mph
  verticalMovement: number; // inches
  horizontalMovement: number; // inches
  trajectory: Trajectory;
}> {
  const calibration = getCalibration();
  const frames = await extractFrames(videoUri);
  const detections: BallDetection[] = [];
  
  // Detect ball in each frame
  for (const frame of frames) {
    const detection = await detectBall(null, frame.frameIndex, frame.timestamp);
    if (detection && detection.confidence > 0.5) {
      detections.push(detection);
    }
  }
  
  if (detections.length < 2) {
    throw new Error('Insufficient ball detections');
  }
  
  // Reconstruct 3D trajectory
  const positions = detections.map((det) => reconstruct3D(det, calibration));
  
  // Calculate metrics
  const velocityMs = calculateVelocity(positions);
  const velocityMph = velocityMs * 2.237; // Convert m/s to mph
  
  const movement = calculatePitchMovement(positions);
  
  const trajectory: Trajectory = {
    positions,
    velocity: velocityMs,
    launchAngle: calculateLaunchAngle(positions),
    direction: calculateDirection(positions),
    verticalMovement: movement.vertical,
    horizontalMovement: movement.horizontal,
  };
  
  return {
    velocity: velocityMph,
    verticalMovement: movement.vertical,
    horizontalMovement: movement.horizontal,
    trajectory,
  };
}

/**
 * Convert pixel track to 3D initial velocity vector
 * Uses calibration data to reconstruct 3D trajectory from 2D pixel track
 */
function trackTo3DVelocity(
  track: BallTrackPoint[],
  calibration: CalibrationData
): { vx: number; vy: number; vz: number; velocity: number } {
  if (track.length < 2) {
    throw new Error('Insufficient track points');
  }
  
  // Use first two points to estimate initial velocity
  const p1 = track[0];
  const p2 = track[1];
  const dt = p2.t - p1.t;
  
  if (dt <= 0) {
    throw new Error('Invalid time delta');
  }
  
  // Convert pixel coordinates to normalized coordinates
  const nx1 = (p1.x - calibration.principalPoint.x) / calibration.focalLength.x;
  const ny1 = (p1.y - calibration.principalPoint.y) / calibration.focalLength.y;
  const nx2 = (p2.x - calibration.principalPoint.x) / calibration.focalLength.x;
  const ny2 = (p2.y - calibration.principalPoint.y) / calibration.focalLength.y;
  
  // Estimate depth (simplified - in production would use more sophisticated methods)
  // Assume ball is at contact point (home plate) for first detection
  const contactDepth = 2.0; // meters (approximate distance from camera to home plate)
  
  // Convert to 3D coordinates (simplified)
  const x1 = nx1 * contactDepth;
  const y1 = ny1 * contactDepth;
  const z1 = contactDepth;
  
  const x2 = nx2 * contactDepth * 0.95; // slightly further
  const y2 = ny2 * contactDepth * 0.95;
  const z2 = contactDepth * 0.95;
  
  // Calculate velocity components
  const vx = (x2 - x1) / dt;
  const vy = (y2 - y1) / dt;
  const vz = (z2 - z1) / dt;
  
  const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz);
  
  return { vx, vy, vz, velocity };
}

/**
 * Classify hit outcome based on launch angle and exit velocity
 */
function classifyOutcome(launchAngle: number, exitVelocity: number): 'Ground ball' | 'Line drive' | 'Fly ball' | 'Pop up' {
  // Classification thresholds (typical baseball metrics)
  if (launchAngle < 10) {
    return 'Ground ball';
  } else if (launchAngle >= 10 && launchAngle < 25) {
    return 'Line drive';
  } else if (launchAngle >= 25 && launchAngle < 50) {
    return 'Fly ball';
  } else {
    return 'Pop up';
  }
}

/**
 * Estimate carry distance using simplified ballistics
 * Uses gravity + constant drag approximation
 */
function estimateCarryDistance(
  exitVelocity: number, // m/s
  launchAngle: number, // degrees
  sprayAngle: number // degrees (not used in simplified model)
): number {
  const angleRad = (launchAngle * Math.PI) / 180;
  const v0 = exitVelocity;
  
  // Initial velocity components
  const vx0 = v0 * Math.cos(angleRad);
  const vz0 = v0 * Math.sin(angleRad);
  
  // Simplified projectile motion (ignoring drag for now)
  // Time of flight
  const t = (2 * vz0) / GRAVITY;
  
  // Horizontal distance
  const distance = vx0 * t;
  
  // Convert meters to feet
  return distance * 3.28084;
}

/**
 * Main inference function: Convert ball track to hit metrics
 * This is the core function that will be called for each swing
 */
export function inferHitMetricsFromTrack(
  track: BallTrackPoint[],
  calibration: CalibrationData = getDefaultCalibrationData()
): HitMetrics {
  if (track.length < 2) {
    throw new Error('Insufficient track points');
  }
  
  // Convert track to 3D velocity vector
  const { vx, vy, vz, velocity } = trackTo3DVelocity(track, calibration);
  
  // Calculate launch angle (angle from horizontal)
  const horizontalVel = Math.sqrt(vx * vx + vy * vy);
  const launchAngleRad = Math.atan2(vz, horizontalVel);
  const launchAngle = (launchAngleRad * 180) / Math.PI;
  
  // Calculate spray angle (direction in horizontal plane)
  // 0 = straight ahead (toward pitcher), positive = right field
  const sprayAngleRad = Math.atan2(vy, vx);
  const sprayAngle = (sprayAngleRad * 180) / Math.PI;
  
  // Convert velocity to mph
  const exitVelocityMph = velocity * 2.237;
  
  // Estimate distance
  const estimatedDistance = estimateCarryDistance(velocity, launchAngle, sprayAngle);
  
  // Classify outcome
  const outcome = classifyOutcome(launchAngle, exitVelocityMph);
  
  return {
    exitVelocity: exitVelocityMph,
    launchAngle,
    sprayAngle,
    estimatedDistance,
    outcome,
  };
}

/**
 * Generate a synthetic ball track for testing/placeholder
 * In production, this would come from CoreML ball detection
 */
export function generateSyntheticTrack(
  exitVelocityMph: number = 85,
  launchAngle: number = 15,
  sprayAngle: number = 0,
  duration: number = 0.5,
  fps: number = 30
): BallTrackPoint[] {
  const track: BallTrackPoint[] = [];
  const exitVelocityMs = exitVelocityMph / 2.237;
  const angleRad = (launchAngle * Math.PI) / 180;
  const sprayRad = (sprayAngle * Math.PI) / 180;
  
  const vx0 = exitVelocityMs * Math.cos(angleRad) * Math.cos(sprayRad);
  const vy0 = exitVelocityMs * Math.cos(angleRad) * Math.sin(sprayRad);
  const vz0 = exitVelocityMs * Math.sin(angleRad);
  
  const calibration = getDefaultCalibrationData();
  const frameCount = Math.floor(duration * fps);
  
  for (let i = 0; i < frameCount; i++) {
    const t = i / fps;
    
    // Simplified trajectory (ignoring drag for synthetic)
    const x = vx0 * t;
    const y = vy0 * t;
    const z = vz0 * t - 0.5 * GRAVITY * t * t;
    
    // Project back to pixel coordinates (simplified)
    const depth = Math.max(z, 2.0); // approximate depth
    const nx = x / depth;
    const ny = y / depth;
    
    const px = nx * calibration.focalLength.x + calibration.principalPoint.x;
    const py = ny * calibration.focalLength.y + calibration.principalPoint.y;
    
    track.push({
      t,
      x: px,
      y: py,
      conf: 0.9,
    });
  }
  
  return track;
}

/**
 * Main inference function for hit tracking (legacy - uses video URI)
 * Kept for backward compatibility
 */
export async function inferHitTrajectory(
  videoUri: string
): Promise<{
  exitVelocity: number; // mph
  launchAngle: number; // degrees
  sprayAngle: number; // degrees
  estimatedDistance: number; // feet
  trajectory: Trajectory;
}> {
  const calibration = getCalibration();
  const frames = await extractFrames(videoUri);
  const detections: BallDetection[] = [];
  
  // Detect ball in each frame
  for (const frame of frames) {
    const detection = await detectBall(null, frame.frameIndex, frame.timestamp);
    if (detection && detection.confidence > 0.5) {
      detections.push(detection);
    }
  }
  
  if (detections.length < 2) {
    throw new Error('Insufficient ball detections');
  }
  
  // Convert detections to track points
  const track: BallTrackPoint[] = detections.map((det) => ({
    t: det.timestamp,
    x: det.x,
    y: det.y,
    conf: det.confidence,
  }));
  
  // Use new inference function
  const metrics = inferHitMetricsFromTrack(track, getDefaultCalibrationData());
  
  // Reconstruct 3D trajectory for backward compatibility
  const positions = detections.map((det) => reconstruct3D(det, calibration));
  
  const trajectory: Trajectory = {
    positions,
    velocity: metrics.exitVelocity / 2.237, // convert to m/s
    launchAngle: metrics.launchAngle,
    direction: metrics.sprayAngle,
  };
  
  return {
    exitVelocity: metrics.exitVelocity,
    launchAngle: metrics.launchAngle,
    sprayAngle: metrics.sprayAngle,
    estimatedDistance: metrics.estimatedDistance,
    trajectory,
  };
}

