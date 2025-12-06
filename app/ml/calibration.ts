/**
 * Camera Calibration Data
 * 
 * This module stores camera calibration parameters needed for 3D reconstruction.
 * In production, these would be obtained through a calibration process.
 * 
 * Structure is designed to be compatible with CoreML camera calibration models.
 */

export interface CameraCalibration {
  // Intrinsic parameters
  focalLength: {
    x: number; // pixels
    y: number; // pixels
  };
  principalPoint: {
    x: number; // pixels
    y: number; // pixels
  };
  
  // Distortion coefficients (for lens correction)
  distortionCoefficients: number[];
  
  // Image dimensions
  imageWidth: number;
  imageHeight: number;
  
  // Camera position/orientation (if known)
  cameraPosition?: {
    x: number; // meters
    y: number;
    z: number;
  };
  cameraRotation?: {
    pitch: number; // radians
    yaw: number;
    roll: number;
  };
}

/**
 * Calibration data for hitting analysis
 * Camera is positioned behind home plate in a batting cage
 */
export interface CalibrationData {
  // Camera position behind home plate (typical setup)
  cameraPosition: {
    x: number; // meters (0 = home plate, positive = toward pitcher)
    y: number; // meters (0 = center, positive = right field)
    z: number; // meters (height above ground)
  };
  
  // Camera orientation
  cameraRotation: {
    pitch: number; // radians (typically slightly downward)
    yaw: number; // radians (0 = looking straight ahead)
    roll: number; // radians
  };
  
  // Field dimensions for generic batting cage
  fieldDimensions: {
    homePlateToPitcher: number; // meters (typically 18.44m / 60.5ft)
    cageLength: number; // meters (typical cage ~30-50ft)
    cageWidth: number; // meters (typical cage ~12-15ft)
    cageHeight: number; // meters (typical cage ~12-15ft)
  };
  
  // Camera intrinsic parameters
  focalLength: {
    x: number; // pixels
    y: number; // pixels
  };
  principalPoint: {
    x: number; // pixels
    y: number; // pixels
  };
}

// Default calibration for iPhone camera (approximate)
// These values should be calibrated per device in production
export const DEFAULT_CALIBRATION: CameraCalibration = {
  focalLength: {
    x: 1000, // Approximate for iPhone
    y: 1000,
  },
  principalPoint: {
    x: 320, // Center of 640px width
    y: 240, // Center of 480px height
  },
  distortionCoefficients: [0, 0, 0, 0, 0], // No distortion assumed
  imageWidth: 640,
  imageHeight: 480,
};

/**
 * Get calibration for current device
 * In production, this would load from device-specific storage
 */
export function getCalibration(): CameraCalibration {
  // TODO: Load from device-specific storage
  // For now, return default
  return DEFAULT_CALIBRATION;
}

/**
 * Save calibration for current device
 */
export async function saveCalibration(calibration: CameraCalibration): Promise<void> {
  // TODO: Save to device-specific storage
  // This would be called after calibration process
  console.log('Calibration saved:', calibration);
}

/**
 * Get default calibration data for hitting analysis
 * Camera positioned behind home plate, looking toward pitcher
 */
export function getDefaultCalibrationData(): CalibrationData {
  return {
    cameraPosition: {
      x: -2.0, // 2 meters behind home plate
      y: 0, // centered
      z: 1.5, // 1.5 meters high (tripod height)
    },
    cameraRotation: {
      pitch: -0.1, // slightly downward
      yaw: 0, // looking straight ahead
      roll: 0,
    },
    fieldDimensions: {
      homePlateToPitcher: 18.44, // 60.5 feet
      cageLength: 15.24, // 50 feet
      cageWidth: 4.57, // 15 feet
      cageHeight: 4.57, // 15 feet
    },
    focalLength: {
      x: 1000,
      y: 1000,
    },
    principalPoint: {
      x: 320,
      y: 240,
    },
  };
}

