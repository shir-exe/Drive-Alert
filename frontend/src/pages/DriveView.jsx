import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { contentService, sessionService } from '../services/api';
import { useDriverMonitor } from '../hooks/useDriverMonitor';
import { getProfileById } from '../utils/attentionProfiles';
import { AlertBanner } from '../components/AlertBanner';
import { GaugeMeter } from '../components/GaugeMeter';
import {
  Camera,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Activity,
  ChevronLeft,
  Lock,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const DriveView = () => {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get('profile') || 'standard';
  const alertThreshold = getProfileById(profileId).threshold / 100;
  const navigate = useNavigate();

  const [route, setRoute] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [driveReadings, setDriveReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState('');
  const [videoElapsedSec, setVideoElapsedSec] = useState(0);
  const [telemetryError, setTelemetryError] = useState('');
  const [finishError, setFinishError] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('מבקש הרשאת מיקום...');
  const [distanceMeters, setDistanceMeters] = useState(0);

  const metricsRef = useRef({});
  const tripStartedRef = useRef(null);
  const lastGpsRef = useRef(null);
  const totalDistanceRef = useRef(0);
  const lastSampledSecondRef = useRef(-1);
  const gpsWatchRef = useRef(null);
  const currentSpeedRef = useRef(0);
  const driveReadingsRef = useRef([]);
  const initializedRouteRef = useRef('');
  const telemetrySyncRef = useRef(false);

  // Driver monitoring uses MediaPipe eye-blink blendshapes and a PERCLOS alertness proxy.
  const {
    videoRef: webcamRef,
    hasConsent,
    isCameraActive,
    cameraStarting,
    cameraError,
    attentionScore,
    scoreDescription,
    faceDetected,
    isDrowsy,
    eyesClosed,
    gazeState,
    isMuted,
    detectionStatus,
    detectionError,
    requestCameraAccess,
    stopCamera,
    toggleMute,
  } = useDriverMonitor(alertThreshold);

  metricsRef.current = { attentionScore, faceDetected, gazeState, isDrowsy };

  // Initialize Route & Backend Drive Session
  useEffect(() => {
    const initializationKey = `${routeId}:${profileId}`;
    if (initializedRouteRef.current === initializationKey) return undefined;
    initializedRouteRef.current = initializationKey;

    const initDrive = async () => {
      try {
        setLoading(true);
        setInitializationError('');
        const routeData = await contentService.getById(routeId);
        setRoute(routeData);

        const newSession = await sessionService.startSession({
          content_id: routeData.id,
          content_title: routeData.title,
          attention_profile: profileId,
        });
        setActiveSession(newSession);
      } catch (err) {
        console.error('Drive session initialization error:', err);
        setInitializationError(err.response?.data?.detail || 'לא ניתן לטעון את המסלול או לפתוח נסיעה. נסו לחזור לספרייה ולפתוח אותו שוב.');
      } finally {
        setLoading(false);
      }
    };

    initDrive();
  }, [routeId, profileId]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Real GPS speed, position and distance tracking.
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS אינו נתמך בדפדפן זה');
      return undefined;
    }

    tripStartedRef.current = Date.now();
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const gpsSpeed = Number.isFinite(speed) ? Math.max(0, speed * 3.6) : 0;
        currentSpeedRef.current = Number(gpsSpeed.toFixed(1));
        setCurrentSpeed(Number(gpsSpeed.toFixed(1)));
        setGpsStatus('GPS פעיל');

        if (lastGpsRef.current) {
          const earthRadiusMeters = 6371000;
          const previous = lastGpsRef.current;
          const lat1 = previous.latitude * Math.PI / 180;
          const lat2 = latitude * Math.PI / 180;
          const deltaLat = (latitude - previous.latitude) * Math.PI / 180;
          const deltaLon = (longitude - previous.longitude) * Math.PI / 180;
          const haversine =
            Math.sin(deltaLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
          const meters = 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
          if (meters >= 1 && meters < 1000) {
            totalDistanceRef.current += meters;
            setDistanceMeters(totalDistanceRef.current);
          }
        }
        lastGpsRef.current = { latitude, longitude };
      },
      (error) => {
        const messages = {
          1: 'הרשאת מיקום נדחתה. יש לאשר GPS בדפדפן.',
          2: 'המיקום אינו זמין כרגע. בדקו ש-GPS פעיל.',
          3: 'בקשת המיקום נמשכת זמן רב ולא התקבלה.',
        };
        setGpsStatus(messages[error.code] || 'שגיאה בקבלת מיקום');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    return () => {
      if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    };
  }, []);

  // Keep live attention and GPS telemetry while the real drive is active.
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(async () => {
      if (telemetrySyncRef.current) return;
      const currentSec = tripStartedRef.current
        ? Math.floor((Date.now() - tripStartedRef.current) / 1000)
        : 0;
      setVideoElapsedSec(currentSec);
      if (currentSec === lastSampledSecondRef.current) return;
      lastSampledSecondRef.current = currentSec;
      telemetrySyncRef.current = true;

      const { attentionScore: score, faceDetected: detectedFace, gazeState: gaze, isDrowsy: drowsy } = metricsRef.current;
      const normalizedScore = Number.isFinite(score) ? Number(score.toFixed(2)) : null;
      const position = lastGpsRef.current;
      const reading = {
        position: currentSec,
        timestamp_sec: currentSec,
        score: normalizedScore,
        attention_score: normalizedScore,
        face_detected: detectedFace,
        gaze_state: gaze,
        is_drowsy: normalizedScore === null ? null : drowsy,
        speed_kmh: currentSpeedRef.current,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        distance_m: totalDistanceRef.current,
      };

      setDriveReadings((previous) => {
        const next = [...previous, reading];
        driveReadingsRef.current = next;
        return next;
      });
      try {
        await sessionService.sendReadings(activeSession.id, reading);
        if (currentSec > 0 && currentSec % 30 === 0) {
          const scored = driveReadingsRef.current.filter((item) => Number.isFinite(item.score));
          const avg = scored.length
            ? Number((scored.reduce((sum, item) => sum + item.score, 0) / scored.length).toFixed(2))
            : null;
          await sessionService.updateSession(activeSession.id, {
            readings: driveReadingsRef.current,
            average_score: avg,
            duration_watched_sec: currentSec,
            is_completed: false,
          });
        }
        setTelemetryError('');
      } catch (error) {
        console.error('Failed to sync live telemetry:', error);
        setTelemetryError('הדגימות נשמרות זמנית במכשיר, אך הסנכרון לשרת נכשל. הן יישלחו שוב עם שמירת הנסיעה.');
      } finally {
        telemetrySyncRef.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Finalize Drive Session
  const handleCompleteDrive = async (completed = true) => {
    if (isFinishing) return;
    if (!activeSession) {
      stopCamera();
      navigate('/history');
      return;
    }

    setIsFinishing(true);
    setFinishError('');
    try {
      const finalReadings = driveReadingsRef.current;
      const scoredReadings = finalReadings.filter((reading) => Number.isFinite(reading.score));
      const avg = scoredReadings.length > 0
        ? Number((scoredReadings.reduce((acc, reading) => acc + reading.score, 0) / scoredReadings.length).toFixed(2))
        : null;

      await sessionService.updateSession(activeSession.id, {
        readings: finalReadings,
        average_score: avg,
        duration_watched_sec: tripStartedRef.current
          ? Math.floor((Date.now() - tripStartedRef.current) / 1000)
          : videoElapsedSec,
        is_completed: completed,
      });

      stopCamera();
      navigate('/history');
    } catch (err) {
      console.error('Failed to finalize drive session:', err);
      setFinishError('לא ניתן היה לשמור את הנסיעה. בדקו את החיבור ונסו שוב; הנתונים עדיין מוצגים כאן.');
      setIsFinishing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-secondary)' }}>
        מכין את מערכות ה-AI ומתחבר למסלול הנהיגה...
      </div>
    );
  }

  if (initializationError) {
    return (
      <div style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1.25rem' }}>
        <div className="glass-panel" role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertTriangle size={30} color="var(--warning)" />
          <h2 style={{ marginTop: '0.6rem', fontSize: '1.2rem', fontWeight: 850 }}>לא ניתן לפתוח את הנסיעה</h2>
          <p style={{ margin: '0.5rem 0 1.25rem', color: 'var(--text-secondary)' }}>{initializationError}</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/dashboard')}>
            חזרה לספריית המסלולים
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell drive-page" style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.25rem' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => handleCompleteDrive(false)}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.8rem' }}
          >
            <ChevronLeft size={18} />
            <span>סיום וחזרה</span>
          </button>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{route?.title}</h2>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.2rem' }}>
              <span className="badge badge-primary">{route?.category || 'כביש מהיר'}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                סף התרעת עייפות: {alertThreshold.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={toggleMute}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.8rem' }}
            title={isMuted ? 'הפעל צפצוף התרעה' : 'השתק צפצוף'}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{isMuted ? 'צפצוף מושתק' : 'צפצוף פעיל'}</span>
          </button>

          <button
            onClick={() => handleCompleteDrive(true)}
            className="btn-primary"
            disabled={isFinishing}
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <CheckCircle size={18} />
            <span>{isFinishing ? 'שומר נסיעה...' : 'סיום נסיעה ושמירת דוח'}</span>
          </button>
        </div>
      </div>

      {finishError && <p className="page-error" role="alert" style={{ marginBottom: '1rem' }}>{finishError}</p>}

      {/* Prominent Fatigue/Distraction Alert Banner (< 0.4 or Face Missing) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <AlertBanner
          score={attentionScore}
          faceDetected={faceDetected}
          isDrowsy={isDrowsy}
          eyesClosed={eyesClosed}
          threshold={alertThreshold}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      </div>

      {/* Main Grid: Road View (Left) & Driver Cockpit Monitor HUD (Right) */}
      <div
        className="drive-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 390px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Live real-drive telemetry */}
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div
            style={{
              minHeight: '360px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '5.5rem', fontWeight: 900, lineHeight: 1 }}>
                {Math.round(currentSpeed)}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#c4b5fd', marginTop: '0.5rem' }}>קמ״ש</div>
              <div style={{ marginTop: '1.25rem', color: '#e2e8f0', fontSize: '0.95rem' }}>
                {gpsStatus}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '2rem' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>מרחק מצטבר</div>
                  <div style={{ fontWeight: 800, marginTop: '0.25rem' }}>{(distanceMeters / 1000).toFixed(2)} ק״מ</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>משך נסיעה</div>
                  <div style={{ fontWeight: 800, marginTop: '0.25rem' }}>{videoElapsedSec} שניות</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '0 0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              תנאי הדרך ומטרת הניטור
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {route?.description}
            </p>
          </div>
        </div>

        {/* Right Column: Driver Monitoring Camera & Telemetry HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Driver Camera Box - Explicit Consent Handling */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Camera size={16} color="var(--accent-secondary)" />
                מצלמת ניטור פני נהג
              </span>
              <span className={isCameraActive ? 'badge badge-success' : 'badge badge-warning'}>
                {isCameraActive ? 'מצלמה פעילה' : cameraStarting ? 'מתחבר למצלמה...' : cameraError ? 'המצלמה לא זמינה' : 'ממתין להסכמה'}
              </span>
            </div>

            {/* Camera Viewport or Explicit Consent Prompt */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/3',
                background: '#090d16',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: `2px solid ${
                faceDetected === false
                    ? '#ef4444'
                  : Number.isFinite(attentionScore) && attentionScore < alertThreshold
                    ? '#ef4444'
                  : Number.isFinite(attentionScore) && attentionScore < 0.7
                    ? '#f59e0b'
                  : faceDetected === true
                  ? '#10b981'
                  : '#64748b'
                }`,
              }}
            >
              {!hasConsent ? (
                /* Explicit Consent Card */
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#f1eaff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Lock size={22} color="var(--accent-primary)" />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    אישור הפעלת מצלמת בטיחות
                  </h4>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.45',
                      marginBottom: '1rem',
                    }}
                  >
                    הווידאו מנותח בדפדפן לזיהוי פנים ועצימת עיניים בלבד. הוא אינו נשמר או משודר לשרת; ציון הערנות הוא הערכה מקורבת ואינו מדידת ריכוז ישירה.
                  </p>
                  <button
                    onClick={requestCameraAccess}
                    disabled={cameraStarting}
                    className="btn-primary"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.55rem 1rem',
                      background: 'var(--accent-gradient)',
                    }}
                  >
                    <Camera size={16} />
                    <span>{cameraStarting ? 'מתחבר למצלמה...' : cameraError ? 'נסה/י שוב להפעיל מצלמה' : 'אני מסכים/ה – הפעל מצלמה'}</span>
                  </button>
                </div>
              ) : (
                /* Live Camera Feed */
                <>
                  <video
                    ref={webcamRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Mirror view for natural driver HUD
                    }}
                  />

                  {/* Warning overlay if face is missing */}
                  {faceDetected === false && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(239, 68, 68, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        backdropFilter: 'blur(2px)',
                      }}
                    >
                      <EyeOff size={32} />
                      <span>לא זוהו פני נהג!</span>
                    </div>
                  )}

                  {/* Bottom pill in camera preview */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {faceDetected === false ? <EyeOff size={12} color="#ef4444" /> : <Eye size={12} color="#94a3b8" />}
                    <span>
                    {faceDetected === false
                      ? 'פנים לא זוהו'
                      : faceDetected === true
                      ? eyesClosed
                        ? 'זוהתה עצימת עיניים'
                        : 'פנים זוהו; כיוון מבט אינו נמדד'
                      : 'ממתין לזיהוי פנים'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {cameraError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.6rem' }}>
                {cameraError}
              </p>
            )}
            {detectionError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.6rem' }}>
                {detectionError}
              </p>
            )}
            {isCameraActive && detectionStatus === 'loading' && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.6rem' }}>
                טוען את מודל זיהוי הפנים...
              </p>
            )}
          </div>

          {/* Alertness Gauge Meter (0.0 to 1.0, 0.4 Danger Threshold) */}
          <GaugeMeter score={attentionScore} threshold={alertThreshold} label="מד ערנות נהג (HUD)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '-0.75rem' }}>
            {scoreDescription}
          </p>

          {/* Drive Telemetry KPI Panel */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '0.75rem',
              }}
            >
              נתוני סשן נהיגה חיים
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                style={{
                  background: '#f7f3ff',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>זמן נסיעה</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{videoElapsedSec} שניות</div>
              </div>
              <div
                style={{
                  background: '#f7f3ff',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>דגימות רשומות</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{driveReadings.length}</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '0.7rem' }}>
              המדידה מתעדכנת לאורך הנסיעה בזמן אמת.
            </p>
            {telemetryError && (
              <p role="status" style={{ color: 'var(--warning)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                {telemetryError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveView;
