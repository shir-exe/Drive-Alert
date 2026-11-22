import React from 'react';
import { EyeOff, ShieldAlert, Volume2, VolumeX } from 'lucide-react';

export const AlertBanner = ({
  score = null,
  faceDetected = null,
  isDrowsy = false,
  eyesClosed = false,
  threshold = 0.4,
  isMuted = false,
  onToggleMute,
}) => {
  // Score is between 0.0 and 1.0
  const hasScore = Number.isFinite(score);
  const normalizedScore = hasScore ? (score > 1.0 ? score / 100.0 : score) : null;
  const isFaceMissing = faceDetected === false;
  const isDrowsinessAlert = isDrowsy && !isFaceMissing;
  const isCriticalAlert = isFaceMissing || isDrowsinessAlert || (hasScore && normalizedScore < threshold);

  if (!isCriticalAlert && !isFaceMissing && !isDrowsinessAlert) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`alert-banner ${isCriticalAlert ? 'critical' : 'warning'}`}
      style={{
        '--alert-animation': 'pulseGlow 1.2s infinite ease-in-out',
      }}
    >
      <div className="alert-banner-message">
        <div className="alert-banner-icon">
          {isFaceMissing ? (
            <EyeOff size={26} color="#ffffff" />
          ) : (
            <ShieldAlert size={26} color="#ffffff" />
          )}
        </div>

        <div>
          <div className="alert-banner-title">
            {isFaceMissing
              ? 'אזהרה קריטית: לא זוהו פני נהג!'
              : isDrowsinessAlert
              ? eyesClosed
                ? 'אזהרה: זוהתה עצימת עיניים ממושכת!'
                : 'אזהרה: מדד הערנות נמוך!'
              : 'התרעת עייפות / הסחת דעת קריטית! סכנת תאונה!'}
          </div>
          <div className="alert-banner-description">
            {isFaceMissing
              ? 'המצלמה אינה מזהה פנים, ולכן לא ניתן לחשב את מדד הערנות.'
              : isDrowsinessAlert
              ? `${eyesClosed ? 'זוהתה עצימת עיניים ממושכת' : 'הצטברה עצימת עיניים בחלון המדידה'}. עצור במקום בטוח אם אתה עייף.`
              : `ציון הערנות ירד ל-${normalizedScore.toFixed(2)} (מתחת לסף הבטיחות של ${threshold.toFixed(2)}). מומלץ לעצור להתרעננות מיידית!`}
          </div>
        </div>
      </div>

      <div className="alert-banner-actions">
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className="alert-mute-button"
            title={isMuted ? 'הפעל צפצוף התרעה' : 'השתק צפצוף'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? 'מושתק' : 'צפצוף פעיל'}</span>
          </button>
        )}

        <div className="alert-banner-status">
          {isFaceMissing ? 'NO FACE' : isDrowsinessAlert ? eyesClosed ? 'EYES CLOSED' : 'LOW ALERTNESS' : `ALERT: ${normalizedScore.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
