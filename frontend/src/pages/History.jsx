import React, { useState, useEffect } from 'react';
import { sessionService, userService } from '../services/api';
import {
  History as HistoryIcon,
  ShieldCheck,
  Clock,
  Calendar,
  AlertTriangle,
  BarChart2,
  Car,
  Activity,
  ChevronRight,
} from 'lucide-react';

export const History = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const [sessionsData, statsData] = await Promise.all([
          sessionService.getAllSessions(),
          userService.getStats(),
        ]);
        setSessions(sessionsData);
        setStats(statsData);
      } catch (err) {
        console.error('Error fetching drive history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const viewSessionTimeline = async (sessionId) => {
    try {
      const detail = await sessionService.getSessionDetail(sessionId);
      setSelectedSessionDetail(detail);
    } catch (err) {
      console.error('Failed to load drive session timeline:', err);
    }
  };

  const formatScoreBadge = (score) => {
    if (!Number.isFinite(score)) {
      return <span className="badge badge-warning">לא נמדד</span>;
    }
    const normalized = score > 1.0 ? score / 100.0 : score;
    const percentage = Math.round(normalized * 100);

    if (normalized >= 0.7) {
      return (
        <span className="badge badge-success">
          {normalized.toFixed(2)} ({percentage}%) • נהיגה בטוחה
        </span>
      );
    }
    if (normalized >= 0.4) {
      return (
        <span className="badge badge-warning">
          {normalized.toFixed(2)} ({percentage}%) • ירידה בערנות
        </span>
      );
    }
    return (
      <span className="badge badge-danger">
        {normalized.toFixed(2)} ({percentage}%) • התרעת עייפות
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.4rem' }}>
          יומן נסיעות וציוני <span style={{ color: 'var(--accent-primary)' }}>ערנות</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          מעקב אחר פרופילי ערנות, התרעות עייפות ודוחות בטיחות נהיגה בזמן אמת
        </p>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: 'var(--accent-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              <Car size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>סה״כ נסיעות</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{stats.total_sessions}</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: 'var(--success)',
                marginBottom: '0.5rem',
              }}
            >
              <ShieldCheck size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ציון ערנות ממוצע</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>
              {Number.isFinite(stats.overall_avg_score)
                ? `${stats.overall_avg_score <= 1.0 ? stats.overall_avg_score : (stats.overall_avg_score / 100).toFixed(2)}`
                : 'לא זמין'}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: 'var(--accent-primary)',
                marginBottom: '0.5rem',
              }}
            >
              <Clock size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>זמן נהיגה מנוטר</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>
              {Math.floor(stats.total_watch_seconds / 60)} דק׳
            </div>
          </div>
        </div>
      )}

      {/* Drives Sessions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          טוען היסטוריית נסיעות...
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            טרם נרשמו נסיעות מנוטרות. בחרו מסלול מהספרייה והתחילו נסיעה!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((s) => {
            const dateStr = new Date(s.start_time).toLocaleDateString('he-IL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={s.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem 1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    {s.content_title}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={14} />
                      {dateStr}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} />
                      {Math.round(s.duration_watched_sec)} שניות נסיעה
                    </span>
                    <span className="badge badge-primary">{s.attention_profile || 'standard'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {formatScoreBadge(s.average_score)}
                  <button
                    onClick={() => viewSessionTimeline(s.id)}
                    className="btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    <BarChart2 size={16} />
                    <span>גרף טלמטריה</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drilldown Timeline Modal */}
      {selectedSessionDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  דוח טלמטריה וערנות: {selectedSessionDetail.content_title}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ציון ממוצע לנסיעה: {Number.isFinite(selectedSessionDetail.average_score)
                    ? selectedSessionDetail.average_score <= 1.0
                      ? selectedSessionDetail.average_score
                      : (selectedSessionDetail.average_score / 100).toFixed(2)
                    : 'לא נמדד'}
                </span>
              </div>
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="btn-secondary"
                style={{ padding: '0.3rem 0.7rem' }}
              >
                סגור
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.6rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>התפלגות מדד ערנות לפי שניות הנסיעה (אפור = לא נמדד):</span>
                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>סף: 0.40</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  height: '150px',
                  padding: '0.75rem',
                  background: '#f7f3ff',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {(selectedSessionDetail.readings || selectedSessionDetail.samples)?.map((r, idx) => {
                  const hasScore = Number.isFinite(r.score);
                  const val = hasScore ? (r.score > 1.0 ? r.score / 100.0 : r.score) : 0;
                  const isDanger = r.face_detected === false || r.is_drowsy === true || (hasScore && val < 0.4);
                  const barColor = !hasScore ? '#64748b' : isDanger ? '#ef4444' : val >= 0.7 ? '#10b981' : '#f59e0b';

                  return (
                    <div
                      key={idx}
                      title={`מיקום: ${r.position || r.timestamp_sec} שניות | ציון: ${hasScore ? val.toFixed(2) : 'לא נמדד'} | פנים: ${
                        r.face_detected === null ? 'לא ידוע' : r.face_detected ? 'כן' : 'לא'
                      } | מבט: ${r.gaze_state}`}
                      style={{
                        flex: '0 0 10px',
                        height: `${hasScore ? Math.max(2, Math.round(val * 100)) : 2}%`,
                        background: barColor,
                        borderRadius: '2px',
                        transition: 'height 0.2s',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="btn-primary"
                style={{ background: 'var(--accent-gradient)' }}
              >
                הבנתי, סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
