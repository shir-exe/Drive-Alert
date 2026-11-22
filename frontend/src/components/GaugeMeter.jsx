import React from 'react';
import { Activity, ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';

export const GaugeMeter = ({ score = null, threshold = 0.4, label = 'מד ערנות נהג (HUD)' }) => {
  const hasScore = Number.isFinite(score);
  const normalized = hasScore
    ? Math.max(0.0, Math.min(1.0, score > 1.0 ? score / 100.0 : score))
    : 0;
  const percentage = Math.round(normalized * 100);

  // Determine state colors and descriptors
  let statusColor = '#94a3b8';
  let statusText = 'לא זמין';
  let statusClass = 'badge-warning';
  let IconComponent = AlertCircle;

  if (hasScore && normalized < threshold) {
    statusColor = '#ef4444'; // Red
    statusText = 'סכנה: עייפות / הסחת דעת!';
    statusClass = 'badge-danger';
    IconComponent = AlertTriangle;
  } else if (hasScore && normalized < 0.7) {
    statusColor = '#f59e0b'; // Amber
    statusText = 'זהירות: ירידה בריכוז';
    statusClass = 'badge-warning';
    IconComponent = AlertCircle;
  } else if (hasScore) {
    statusColor = '#10b981';
    statusText = 'ערני וממוקד';
    statusClass = 'badge-success';
    IconComponent = ShieldCheck;
  }

  // SVG Gauge Calculations (Semi-circle 180 degrees)
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const strokeDashoffset = circumference - normalized * circumference;

  return (
    <div
      className={`glass-panel gauge-meter ${hasScore && normalized < threshold ? 'gauge-alert' : ''}`}
    >
      {/* Header */}
      <div className="gauge-header">
        <span className="gauge-label">
          <Activity size={16} color={statusColor} />
          {label}
        </span>
        <span className={`badge gauge-status-badge ${statusClass}`}>
          <IconComponent size={12} />
          {statusText}
        </span>
      </div>

      {/* SVG Arc Gauge */}
      <div className="gauge-graphic">
        <svg
          width="200"
          height="120"
          viewBox="0 0 200 120"
          className="gauge-svg"
        >
          {/* Background Track Arc */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#ebe5f4"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Danger Zone marker (< 0.4) */}
          <path
            d="M 20 105 A 80 80 0 0 1 84 37"
            fill="none"
            stroke="rgba(239, 68, 68, 0.25)"
            strokeWidth={strokeWidth - 4}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={hasScore ? strokeDashoffset : circumference}
            strokeLinecap="round"
            className="gauge-progress"
            style={{ '--gauge-glow': statusColor }}
          />
        </svg>

        {/* Digital Readout in center of gauge */}
        <div className="gauge-readout">
          <div className="gauge-value" style={{ '--gauge-color': statusColor }}>
            {hasScore ? normalized.toFixed(2) : '—'}
          </div>
          <div className="gauge-caption">
            {hasScore ? `${percentage}% ערנות` : 'ממתין למדידה'}
          </div>
        </div>
      </div>

      {/* Threshold Reference Indicator */}
      <div className="gauge-threshold">
        <span>0.00 (ישנוני)</span>
        <span className="gauge-danger-threshold">
          סף סכנה: {threshold.toFixed(2)}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>1.00 (שיא)</span>
      </div>
    </div>
  );
};

export default GaugeMeter;
