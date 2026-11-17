import React, { useEffect, useMemo, useState } from 'react';
import { sessionService, userService } from '../services/api';
import {
  History as HistoryIcon,
  ShieldCheck,
  Clock,
  Calendar,
  BarChart2,
  Car,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const PAGE_SIZE = 8;
const MAX_CHART_BARS = 60;

const normalizeScore = (score) => (score > 1 ? score / 100 : score);

const formatDuration = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  if (minutes === 0) return `${remainder} שנ׳`;
  if (remainder === 0) return `${minutes} דק׳`;
  return `${minutes} דק׳ ${remainder} שנ׳`;
};

const groupReadings = (readings) => {
  const chunkSize = Math.max(1, Math.ceil(readings.length / MAX_CHART_BARS));
  const groups = [];
  for (let index = 0; index < readings.length; index += chunkSize) {
    const chunk = readings.slice(index, index + chunkSize);
    const scores = chunk
      .map((reading) => Number.isFinite(reading.score) ? normalizeScore(reading.score) : null)
      .filter((score) => score !== null);
    if (scores.length === 0) continue;

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    groups.push({
      average,
      from: chunk[0].position ?? chunk[0].timestamp_sec ?? index,
      to: chunk[chunk.length - 1].position ?? chunk[chunk.length - 1].timestamp_sec ?? index + chunk.length - 1,
      count: scores.length,
    });
  }
  return groups;
};

const formatScoreBadge = (score) => {
  if (!Number.isFinite(score)) {
    return <span className="badge badge-warning" title="לא התקבלו מספיק דגימות תקינות לחישוב ציון">אין ציון</span>;
  }
  const normalized = normalizeScore(score);
  const percentage = Math.round(normalized * 100);
  if (normalized >= 0.7) {
    return <span className="badge badge-success">ערנות טובה · {percentage}%</span>;
  }
  if (normalized >= 0.4) {
    return <span className="badge badge-warning">נדרשת תשומת לב · {percentage}%</span>;
  }
  return <span className="badge badge-danger">מדד נמוך · {percentage}%</span>;
};

export const History = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const [sessionsData, statsData] = await Promise.all([
          sessionService.getAllSessions(),
          userService.getStats(),
        ]);
        setSessions(sessionsData);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching drive history:', error);
        setLoadError(error.response?.data?.detail || 'לא ניתן לטעון את היסטוריית הנסיעות. נסו לרענן את העמוד.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const visibleSessions = useMemo(
    () => sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sessions, page]
  );
  const pageCount = Math.ceil(sessions.length / PAGE_SIZE);

  const viewSessionTimeline = async (sessionId) => {
    try {
      setDetailLoading(true);
      setDetailError('');
      const detail = await sessionService.getSessionDetail(sessionId);
      setSelectedSessionDetail(detail);
    } catch (error) {
      console.error('Failed to load drive session report:', error);
      setDetailError(error.response?.data?.detail || 'לא ניתן לטעון את דוח הנסיעה. נסו שוב.');
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedReadings = selectedSessionDetail?.readings?.length
    ? selectedSessionDetail.readings
    : selectedSessionDetail?.samples || [];
  const chartGroups = useMemo(() => groupReadings(selectedReadings), [selectedReadings]);
  const measuredReadings = selectedReadings.filter((reading) => Number.isFinite(reading.score)).length;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2.25rem 1.5rem' }}>
      <header style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.45rem' }}>
          <HistoryIcon size={16} />
          <span>היסטוריית הנהיגה שלך</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 900, letterSpacing: '-0.035em', marginBottom: '0.35rem' }}>
          סיכום נסיעות
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          סקירה של זמן הניטור, מדדי הערנות והדוחות שנאספו בכל נסיעה.
        </p>
      </header>

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div className="glass-panel" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--accent-primary)', fontSize: '0.86rem', fontWeight: 700 }}>
              <Car size={18} />
              <span>נסיעות שנשמרו</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.35rem' }}>{stats.total_sessions}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.77rem' }}>{stats.completed_sessions} נסיעות הושלמו</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--success)', fontSize: '0.86rem', fontWeight: 700 }}>
              <ShieldCheck size={18} />
              <span>ציון ערנות ממוצע</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.35rem' }}>
              {Number.isFinite(stats.overall_avg_score)
                ? `${Math.round(normalizeScore(stats.overall_avg_score) * 100)}%`
                : '—'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.77rem' }}>
              {Number.isFinite(stats.overall_avg_score) ? 'מחושב על סמך דגימות זמינות' : 'יופיע לאחר איסוף דגימות תקינות'}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--accent-secondary)', fontSize: '0.86rem', fontWeight: 700 }}>
              <Clock size={18} />
              <span>זמן ניטור מצטבר</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.35rem' }}>
              {formatDuration(stats.total_watch_seconds)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.77rem' }}>זמן נסיעה אמיתי</div>
          </div>
        </div>
      )}

      {loadError && <p className="page-error" role="alert" style={{ marginBottom: '1rem' }}>{loadError}</p>}
      {detailError && <p className="page-error" role="alert" style={{ marginBottom: '1rem' }}>{detailError}</p>}

      <section aria-labelledby="trips-heading">
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <div>
            <h2 id="trips-heading" style={{ fontSize: '1.2rem', fontWeight: 850 }}>הנסיעות האחרונות</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
              {sessions.length > 0 ? `${sessions.length} נסיעות · מוצגות עד ${PAGE_SIZE} בכל עמוד` : 'כל נסיעה כוללת סיכום קצר ודוח מדידות'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="telemetry-empty" role="status">טוען את היסטוריית הנסיעות...</div>
        ) : sessions.length === 0 ? (
          <div className="telemetry-empty">
            <div>
              <Car size={28} color="var(--accent-primary)" />
              <p style={{ marginTop: '0.55rem', fontWeight: 750 }}>עדיין אין נסיעות שמורות</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.86rem' }}>בחרו מסלול בספרייה כדי להתחיל נסיעה מנוטרת.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="history-list">
              {visibleSessions.map((session) => {
                const date = new Date(session.start_time);
                const dateStr = Number.isNaN(date.getTime())
                  ? 'תאריך לא זמין'
                  : date.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = Number.isNaN(date.getTime())
                  ? ''
                  : date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

                return (
                  <article key={session.id} className="glass-panel history-row">
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.45rem' }}>
                        {session.content_title || 'נסיעת אימון'}
                      </h3>
                      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={14} /> {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={14} /> {formatDuration(session.duration_watched_sec)}
                        </span>
                        <span>{session.readings_count || 0} דגימות</span>
                      </div>
                    </div>
                    <div className="history-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {formatScoreBadge(session.average_score)}
                      <button
                        type="button"
                        onClick={() => viewSessionTimeline(session.id)}
                        className="btn-secondary"
                        disabled={detailLoading}
                        style={{ minHeight: '38px', padding: '0.4rem 0.75rem', fontSize: '0.83rem' }}
                      >
                        <BarChart2 size={16} />
                        <span>{detailLoading ? 'טוען דוח...' : 'פתיחת דוח'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {pageCount > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronRight size={16} />
                  הקודמות
                </button>
                <span>עמוד {page + 1} מתוך {pageCount}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                >
                  הבאות
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selectedSessionDetail && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSessionDetail(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(17, 24, 39, 0.55)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="glass-panel"
            style={{ maxWidth: '760px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1.1rem, 3vw, 2rem)', borderRadius: 'var(--radius-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '1.35rem' }}>
              <div>
                <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>דוח נסיעה</div>
                <h2 id="report-title" style={{ fontSize: '1.25rem', fontWeight: 850 }}>
                  {selectedSessionDetail.content_title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.3rem' }}>
                  {formatScoreBadge(selectedSessionDetail.average_score)}
                  <span style={{ marginInlineStart: '0.55rem' }}>{formatDuration(selectedSessionDetail.duration_watched_sec)} · {selectedReadings.length} דגימות</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionDetail(null)}
                className="btn-secondary"
                aria-label="סגירת דוח"
                style={{ minHeight: '36px', padding: '0.4rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {chartGroups.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.55rem' }}>
                  <span>מדד ערנות לאורך הנסיעה</span>
                  <span>{measuredReadings} מתוך {selectedReadings.length} דגימות עם ציון</span>
                </div>
                <div className="telemetry-chart" role="img" aria-label="תרשים מדד ערנות לאורך הנסיעה">
                  {chartGroups.map((group, index) => {
                    const percentage = Math.round(group.average * 100);
                    const color = group.average < 0.4 ? 'var(--danger)' : group.average < 0.7 ? 'var(--warning)' : 'var(--success)';
                    return (
                      <div
                        key={`${group.from}-${group.to}-${index}`}
                        className="telemetry-bar"
                        title={`${group.from}–${group.to} שנ׳ · ${percentage}% ערנות · ${group.count} דגימות`}
                        style={{ height: `${Math.max(4, percentage)}%`, background: color }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                  <span>תחילת נסיעה</span>
                  <span>מדד משוער, אינו מדידה רפואית או תחליף למערכת בטיחות</span>
                  <span>סוף נסיעה</span>
                </div>
              </>
            ) : (
              <div className="telemetry-empty">
                <div>
                  <BarChart2 size={28} color="var(--text-muted)" />
                  <p style={{ marginTop: '0.6rem', fontWeight: 750, color: 'var(--text-primary)' }}>אין עדיין נתוני מדידה להצגה</p>
                  <p style={{ maxWidth: '460px', marginTop: '0.3rem', fontSize: '0.85rem' }}>
                    כדי ליצור דוח, אשרו גישה למצלמה וה-GPS, והמתינו לטעינת מודל הזיהוי. הנתונים נשמרים לאורך הנסיעה.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default History;
