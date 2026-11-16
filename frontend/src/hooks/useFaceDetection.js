import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { calculateAlertness, getEyeClosure } from '../utils/eyeAlertness';

const SCORE_WINDOW_MS = 30_000;
const CLOSED_EYE_THRESHOLD = 0.5;
const SUSTAINED_CLOSURE_MS = 1_500;
const INFERENCE_INTERVAL_MS = 100;

const createFaceLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
  );
  const options = {
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    runningMode: 'VIDEO',
    numFaces: 1,
  };

  try {
    return await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
    });
  } catch (gpuError) {
    console.warn('[DriveAlert] GPU face detection unavailable; retrying with CPU:', gpuError);
    return FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU',
      },
    });
  }
};

export const useFaceDetection = (videoRef, isCameraReady, alertThreshold = 0.4) => {
  const [faceDetected, setFaceDetected] = useState(null);
  const [attentionScore, setAttentionScore] = useState(null);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('loading');
  const [detectionError, setDetectionError] = useState(null);
  const landmarkerRef = useRef(null);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const landmarker = await createFaceLandmarker();
        if (!active) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setDetectionStatus('ready');
      } catch (error) {
        console.error('[DriveAlert] Face detector initialization failed:', error);
        if (active) {
          setDetectionError('לא ניתן לטעון את מודל זיהוי הפנים. בדקו חיבור לרשת ורעננו את העמוד.');
          setDetectionStatus('error');
        }
      }
    };

    initialize();

    return () => {
      active = false;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isCameraReady || detectionStatus !== 'ready' || !landmarkerRef.current) {
      setFaceDetected(null);
      setAttentionScore(null);
      setEyesClosed(false);
      setIsDrowsy(false);
      return undefined;
    }

    let active = true;
    let frameId = null;
    let lastVideoTime = -1;
    let missingFaceSince = null;
    let eyesClosedSince = null;
    let lastInferenceAt = 0;
    const eyeSamples = [];

    const analyzeFrame = () => {
      const video = videoRef.current;
      if (!active) return;

      if (!video || video.paused || video.ended || video.videoWidth === 0 || video.currentTime === lastVideoTime) {
        frameId = requestAnimationFrame(analyzeFrame);
        return;
      }
      lastVideoTime = video.currentTime;

      const now = performance.now();
      if (now - lastInferenceAt < INFERENCE_INTERVAL_MS) {
        frameId = requestAnimationFrame(analyzeFrame);
        return;
      }
      lastInferenceAt = now;

      try {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        if (results.faceLandmarks?.length > 0) {
          missingFaceSince = null;
          setFaceDetected(true);

          const eyeClosure = getEyeClosure(results.faceBlendshapes);
          if (eyeClosure === null) {
            throw new Error('FaceLandmarker did not return eye-blink blendshapes.');
          }

          const closed = eyeClosure >= CLOSED_EYE_THRESHOLD;
          eyeSamples.push({ timestamp: now, closed });
          while (eyeSamples.length > 0 && eyeSamples[0].timestamp < now - SCORE_WINDOW_MS) {
            eyeSamples.shift();
          }

          if (closed) {
            eyesClosedSince ??= now;
          } else {
            eyesClosedSince = null;
          }

          const score = calculateAlertness(eyeSamples);
          const sustainedClosure = eyesClosedSince !== null && now - eyesClosedSince >= SUSTAINED_CLOSURE_MS;
          setEyesClosed(closed);
          setAttentionScore(score);
          setIsDrowsy(sustainedClosure || (score !== null && score < alertThreshold));
        } else {
          missingFaceSince ??= performance.now();
          if (performance.now() - missingFaceSince >= 750) {
            eyeSamples.length = 0;
            eyesClosedSince = null;
            setFaceDetected(false);
            setAttentionScore(0);
            setEyesClosed(false);
            setIsDrowsy(true);
          }
        }
      } catch (error) {
        console.error('[DriveAlert] Face detection failed:', error);
        landmarkerRef.current?.close();
        landmarkerRef.current = null;
        setDetectionError('ניתוח תמונת המצלמה נכשל. בדקו את החיבור ואת הרשאות המצלמה, ואז רעננו את העמוד.');
        setDetectionStatus('error');
        setAttentionScore(null);
        setEyesClosed(false);
        setIsDrowsy(false);
        active = false;
        return;
      }

      frameId = requestAnimationFrame(analyzeFrame);
    };

    frameId = requestAnimationFrame(analyzeFrame);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [videoRef, isCameraReady, detectionStatus, alertThreshold]);

  return { faceDetected, attentionScore, eyesClosed, isDrowsy, detectionStatus, detectionError };
};
