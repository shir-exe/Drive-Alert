import { useState, useEffect, useRef, useCallback } from 'react';

export const useCamera = () => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestIdRef = useRef(0);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return true;
    const requestId = ++requestIdRef.current;
    setError(null);
    setIsStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      if (requestId !== requestIdRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return false;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      return true;
    } catch (err) {
      console.error('Camera access error:', err);
      if (requestId === requestIdRef.current) {
        setError('לא ניתן לגשת למצלמה. אנא ודאי/ודא שהרשאות המצלמה מאושרות.');
        setIsReady(false);
      }
      return false;
    } finally {
      if (requestId === requestIdRef.current) setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setIsReady(false);
    setIsStarting(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!stream || !videoRef.current) return undefined;

    const video = videoRef.current;
    let active = true;
    video.srcObject = stream;
    const startPlayback = async () => {
      try {
        await video.play();
        if (active) setIsReady(true);
      } catch (err) {
        console.error('Camera video playback error:', err);
        if (active) {
          setError('המצלמה נפתחה אך לא ניתן להפעיל את תצוגת הווידאו.');
          setIsReady(false);
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setStream(null);
        }
      }
    };
    startPlayback();

    return () => {
      active = false;
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  return {
    videoRef,
    stream,
    isReady,
    isStarting,
    error,
    startCamera,
    stopCamera
  };
};
