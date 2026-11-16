import { useFaceDetection } from './useFaceDetection';
import { getProfileById } from '../utils/attentionProfiles';

export const useAttentionModel = (videoRef, isCameraReady, profileId = 'standard') => {
  const profile = getProfileById(profileId);
  const { faceDetected, attentionScore, eyesClosed, isDrowsy, detectionStatus, detectionError } =
    useFaceDetection(videoRef, isCameraReady, profile.threshold / 100);

  return {
    attentionScore: attentionScore === null ? null : attentionScore * 100,
    gazeState: faceDetected === false ? 'away' : eyesClosed ? 'eyes_closed' : faceDetected === true ? 'focused' : 'unknown',
    faceDetected,
    isDistracted: isDrowsy || faceDetected === false,
    profile,
    detectionStatus,
    detectionError,
    eyesClosed,
    isDrowsy,
    scoreDescription: 'הערכת ערנות לפי עצימת עיניים (PERCLOS); אינה מדידת ריכוז ישירה.',
  };
};
