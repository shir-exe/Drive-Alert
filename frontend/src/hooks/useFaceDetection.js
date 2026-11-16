import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web/wasm';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MODEL_SEQUENCE_LENGTH = 100;
const LANDMARK_COUNT = 478;
const LANDMARK_DIMENSIONS = 3;
const INFERENCE_INTERVAL_MS = 100;
const INFERENCE_STRIDE = 10;
const NO_FACE_GRACE_PERIOD_MS = 750;

const createFaceLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
  );
  const options = {
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    runningMode: 'VIDEO',
    numFaces: 1,
  };
  const modelAssetPath =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  try {
    return await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { modelAssetPath, delegate: 'GPU' },
    });
  } catch (gpuError) {
    console.warn('[DriveAlert] GPU face detection unavailable; retrying with CPU:', gpuError);
    return FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { modelAssetPath, delegate: 'CPU' },
    });
  }
};

const getLandmarkFrame = (landmarks) => {
  if (!landmarks || landmarks.length !== LANDMARK_COUNT) {
    throw new Error(`Expected ${LANDMARK_COUNT} face landmarks; received ${landmarks?.length ?? 0}.`);
  }

  const frame = new Float32Array(LANDMARK_COUNT * LANDMARK_DIMENSIONS);
  for (let index = 0; index < LANDMARK_COUNT; index += 1) {
    const landmark = landmarks[index];
    if (![landmark.x, landmark.y, landmark.z].every(Number.isFinite)) {
      throw new Error(`Face landmark ${index} contains a non-finite coordinate.`);
    }
    const offset = index * LANDMARK_DIMENSIONS;
    frame[offset] = landmark.x;
    frame[offset + 1] = landmark.y;
    frame[offset + 2] = landmark.z;
  }
  return frame;
};

export const useFaceDetection = (videoRef, isCameraReady, alertThreshold = 0.4) => {
  const [faceDetected, setFaceDetected] = useState(null);
  const [attentionScore, setAttentionScore] = useState(null);
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('loading');
  const [detectionError, setDetectionError] = useState(null);
  const landmarkerRef = useRef(null);
  const onnxSessionRef = useRef(null);

  useEffect(() => {
    let active = true;
    let landmarker;
    let session;

    const initialize = async () => {
      try {
        ort.env.wasm.numThreads = 1;
        landmarker = await createFaceLandmarker();
        session = await ort.InferenceSession.create('/models/v4_2.onnx', {
          executionProviders: ['wasm'],
        });
        if (!active) {
          landmarker.close();
          await session.release();
          return;
        }
        landmarkerRef.current = landmarker;
        onnxSessionRef.current = session;
        console.info('[DriveAlert] FaceLandmarker and concentration model v4_2 are ready.');
        setDetectionStatus('ready');
      } catch (error) {
        console.error('[DriveAlert] Vision model initialization failed:', error);
        landmarker?.close();
        await session?.release();
        if (active) {
          setDetectionError('לא ניתן לטעון את מודל הריכוז או זיהוי הפנים. בדקו חיבור לרשת ורעננו את העמוד.');
          setDetectionStatus('error');
        }
      }
    };

    initialize();

    return () => {
      active = false;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      void onnxSessionRef.current?.release();
      onnxSessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isCameraReady || detectionStatus !== 'ready' || !landmarkerRef.current || !onnxSessionRef.current) {
      setFaceDetected(null);
      setAttentionScore(null);
      setIsDrowsy(false);
      return undefined;
    }

    let active = true;
    let frameId = null;
    let lastVideoTime = -1;
    let lastInferenceAt = 0;
    let framesSinceInference = 0;
    let inferenceInProgress = false;
    let missingFaceSince = null;
    let noFaceReported = false;
    const landmarkFrames = [];

    const failInference = (error) => {
      console.error('[DriveAlert] Concentration model inference failed:', error);
      setDetectionError('חיזוי מודל הריכוז נכשל. בדקו את המצלמה וטעינת המודל, ואז רעננו את העמוד.');
      setDetectionStatus('error');
      setAttentionScore(null);
      setIsDrowsy(false);
      active = false;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      void onnxSessionRef.current?.release();
      onnxSessionRef.current = null;
    };

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
        const results = landmarkerRef.current.detectForVideo(video, now);
        const faceLandmarks = results.faceLandmarks?.[0];
        if (!faceLandmarks) {
          missingFaceSince ??= now;
          if (now - missingFaceSince >= NO_FACE_GRACE_PERIOD_MS && !noFaceReported) {
            landmarkFrames.length = 0;
            framesSinceInference = 0;
            noFaceReported = true;
            setFaceDetected(false);
            setAttentionScore(0);
            setIsDrowsy(true);
          }
        } else {
          if (missingFaceSince !== null && now - missingFaceSince >= NO_FACE_GRACE_PERIOD_MS) {
            landmarkFrames.length = 0;
            framesSinceInference = 0;
            setAttentionScore(null);
            setIsDrowsy(false);
          }
          missingFaceSince = null;
          noFaceReported = false;
          setFaceDetected(true);
          landmarkFrames.push(getLandmarkFrame(faceLandmarks));
          if (landmarkFrames.length > MODEL_SEQUENCE_LENGTH) landmarkFrames.shift();
          framesSinceInference += 1;

          if (
            landmarkFrames.length === MODEL_SEQUENCE_LENGTH &&
            framesSinceInference >= INFERENCE_STRIDE &&
            !inferenceInProgress
          ) {
            framesSinceInference = 0;
            inferenceInProgress = true;
            const inputData = new Float32Array(
              MODEL_SEQUENCE_LENGTH * LANDMARK_COUNT * LANDMARK_DIMENSIONS
            );
            landmarkFrames.forEach((frame, index) => {
              inputData.set(frame, index * frame.length);
            });

            const session = onnxSessionRef.current;
            const inputName = session.inputNames[0];
            const tensor = new ort.Tensor('float32', inputData, [
              1,
              MODEL_SEQUENCE_LENGTH,
              LANDMARK_COUNT,
              LANDMARK_DIMENSIONS,
            ]);
            session.run({ [inputName]: tensor })
              .then((outputs) => {
                if (!active) return;
                const regressionOutput = outputs.regression_scores;
                const rawScore = regressionOutput?.data?.[0];
                if (!Number.isFinite(rawScore)) {
                  throw new Error('Model output regression_scores is missing or non-finite.');
                }
                const score = Math.max(0, Math.min(1, rawScore));
                setAttentionScore(score);
                setIsDrowsy(score < alertThreshold);
              })
              .catch(failInference)
              .finally(() => {
                inferenceInProgress = false;
              });
          }
        }
      } catch (error) {
        failInference(error);
      }

      if (active) frameId = requestAnimationFrame(analyzeFrame);
    };

    frameId = requestAnimationFrame(analyzeFrame);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [videoRef, isCameraReady, detectionStatus, alertThreshold]);

  return { faceDetected, attentionScore, isDrowsy, detectionStatus, detectionError };
};
