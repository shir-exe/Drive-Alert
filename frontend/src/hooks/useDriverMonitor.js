import { useState, useEffect, useRef, useCallback } from 'react';
import { startDangerAlarm, stopDangerAlarm, playWarningBeep } from '../utils/audioAlert';
import { useFaceDetection } from './useFaceDetection';

export const useDriverMonitor = (threshold = 0.4) => {
  const [hasConsent, setHasConsent] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);
  const cameraRequestRef = useRef(0);
  const { faceDetected, attentionScore, isDrowsy, detectionStatus, detectionError } =
    useFaceDetection(videoRef, isCameraActive, threshold);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      stopDangerAlarm();
    };
  }, []);

  useEffect(() => {
    if (!hasConsent || !cameraStream || !videoRef.current) return undefined;

    const video = videoRef.current;
    let active = true;
    const activateCamera = async () => {
      try {
        await video.play();
        if (active) {
          setIsCameraActive(true);
          playWarningBeep(1200, 0.1);
        }
      } catch (error) {
        console.error('[DriveAlert] Camera playback failed:', error);
        if (active) {
          setCameraError('המצלמה נפתחה אך לא ניתן להפעיל את תצוגת הווידאו.');
          setIsCameraActive(false);
          cameraStream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setCameraStream(null);
          setHasConsent(false);
        }
      }
    };

    video.srcObject = cameraStream;
    if (video.readyState >= 1) {
      activateCamera();
    } else {
      video.addEventListener('loadedmetadata', activateCamera, { once: true });
    }

    return () => {
      active = false;
      video.removeEventListener('loadedmetadata', activateCamera);
      if (video.srcObject === cameraStream) video.srcObject = null;
    };
  }, [hasConsent, cameraStream]);

  useEffect(() => {
    if (!isCameraActive || (!isDrowsy && faceDetected !== false) || isMuted) {
      stopDangerAlarm();
      return undefined;
    }
    startDangerAlarm();
    return stopDangerAlarm;
  }, [isCameraActive, isDrowsy, faceDetected, isMuted]);

  const requestCameraAccess = useCallback(async () => {
    const requestId = ++cameraRequestRef.current;
    setCameraError(null);
    setCameraStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!aliveRef.current || requestId !== cameraRequestRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = mediaStream;
      setCameraStream(mediaStream);
      setHasConsent(true);
    } catch (error) {
      console.error('[DriveAlert] Camera permission/access error:', error);
      if (aliveRef.current && requestId === cameraRequestRef.current) {
        setCameraError('גישה למצלמה נדחתה או שאינה זמינה. יש לאשר הרשאת מצלמה בדפדפן ולנסות שוב.');
        setIsCameraActive(false);
      }
    } finally {
      if (aliveRef.current && requestId === cameraRequestRef.current) setCameraStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
    setHasConsent(false);
    setIsCameraActive(false);
    setCameraStarting(false);
    setCameraError(null);
    stopDangerAlarm();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    videoRef,
    hasConsent,
    isCameraActive,
    cameraStarting,
    cameraError,
    attentionScore,
    scoreDescription: 'ציון הריכוז מחושב על ידי מודל v4_2 ONNX על רצף נקודות פנים.',
    faceDetected,
    isDrowsy: isDrowsy || faceDetected === false,
    gazeState: faceDetected === false ? 'away' : isDrowsy ? 'distracted' : faceDetected === true ? 'focused' : 'unknown',
    isMuted,
    detectionStatus,
    detectionError,
    requestCameraAccess,
    stopCamera,
    toggleMute,
  };
};

export default useDriverMonitor;
