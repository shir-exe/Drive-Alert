import { useFaceDetection } from './useFaceDetection';
import { getProfileById } from '../utils/attentionProfiles';

export const useAttentionModel = (videoRef, isCameraReady, profileId = 'standard') => {
  const profile = getProfileById(profileId);
  const { faceDetected, attentionScore, isDrowsy, detectionStatus, detectionError } =
    useFaceDetection(videoRef, isCameraReady, profile.threshold / 100);

  return {
    attentionScore: attentionScore === null ? null : attentionScore * 100,
    gazeState: faceDetected === false ? 'away' : isDrowsy ? 'distracted' : faceDetected === true ? 'focused' : 'unknown',
    faceDetected,
    isDistracted: isDrowsy || faceDetected === false,
    profile,
    detectionStatus,
    detectionError,
    isDrowsy,
    scoreDescription: 'ציון הריכוז מחושב על ידי מודל v4_2 ONNX על רצף נקודות פנים.',
  };
};
