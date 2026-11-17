import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Play, Clock, Compass, Filter, ShieldCheck, Car, Plus, Trash2 } from 'lucide-react';
import { ATTENTION_PROFILES } from '../utils/attentionProfiles';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routesList, setRoutesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(user?.preferred_profile || 'standard');
  const [stats, setStats] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [routeForm, setRouteForm] = useState({
    title: '',
    description: '',
    category: 'Highway',
    difficulty: 'Normal',
    tags: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const [routesData, statsData] = await Promise.all([
          contentService.getAll(selectedCategory),
          userService.getStats(),
        ]);
        setRoutesList(routesData);
        setStats(statsData);
      } catch (err) {
        console.error('Error fetching driving routes:', err);
        setLoadError(err.response?.data?.detail || 'לא ניתן לטעון את הספרייה כרגע. נסו לרענן את העמוד.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const handleStartDrive = (routeId) => {
    navigate(`/drive/${routeId}?profile=${selectedProfile}`);
  };

  const handleCreateRoute = async (event) => {
    event.preventDefault();
    setFormError('');
    setSavingRoute(true);
    try {
      const created = await contentService.create({
        ...routeForm,
        tags: routeForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        video_url: '',
        duration_seconds: 0,
      });
      setRoutesList((current) => [created, ...current]);
      setSelectedCategory('');
      setRouteForm({
        title: '',
        description: '',
        category: 'Highway',
        difficulty: 'Normal',
        tags: '',
      });
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'לא ניתן להוסיף את הנסיעה. בדקו את הפרטים ונסו שוב.');
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (route) => {
    if (!window.confirm(`למחוק את "${route.title}" מהספרייה שלך?`)) return;
    setActionError('');
    try {
      await contentService.deleteById(route.id);
      setRoutesList((current) => current.filter((item) => item.id !== route.id));
    } catch (err) {
      setActionError(err.response?.data?.detail || 'לא ניתן למחוק את הנסיעה. נסו שוב.');
    }
  };

  const categories = ['הכל', 'Highway', 'Desert Cruise', 'Urban Traffic', 'Mountain Pass', 'Night Drive'];

  return (
    <div className="page-shell dashboard-page" style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Hero / HUD Banner */}
      <div
        className="glass-panel dashboard-hero"
        style={{
          padding: '2.5rem',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5efff 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ maxWidth: '750px' }}>
          <div
            className="badge"
            style={{
              background: '#f1eaff',
              color: 'var(--accent-primary)',
              border: '1px solid #dfd0fa',
              marginBottom: '0.8rem',
            }}
          >
            <ShieldCheck size={14} />
            <span>DriveAlert • מערכת בטיחות וניטור נהג בזמן אמת</span>
          </div>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.8rem' }}>
            שלום, <span style={{ color: 'var(--accent-primary)' }}>{user?.full_name || user?.username}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            בחר/י מסלול נהיגה והפעל/י סשן מנוטר. המצלמה ומודל MediaPipe מעריכים עצימת עיניים כדי לחשב מדד ערנות מקורב; המדד אינו מודד ריכוז ישירות ואינו תחליף למערכת בטיחות מוסמכת.
          </p>

          {/* Quick Telemetry KPI Badges */}
          {stats && (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.7rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>נסיעות שהושלמו</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                  {stats.completed_sessions} / {stats.total_sessions}
                </div>
              </div>
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.7rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ציון ערנות ממוצע</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                  {Number.isFinite(stats.overall_avg_score)
                    ? `${Math.round((stats.overall_avg_score > 1 ? stats.overall_avg_score / 100 : stats.overall_avg_score) * 100)}%`
                    : '—'}
                </div>
                {!Number.isFinite(stats.overall_avg_score) && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>יופיע לאחר איסוף דגימות תקינות</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Profiles & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Profile Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            רגישות התרעות:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {Object.values(ATTENTION_PROFILES).map((prof) => (
              <button
                key={prof.id}
                onClick={() => setSelectedProfile(prof.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border:
                    selectedProfile === prof.id
                      ? '1px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                  background:
                    selectedProfile === prof.id
                      ? '#f1eaff'
                      : '#ffffff',
                  color: selectedProfile === prof.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  transition: 'var(--transition-smooth)',
                }}
              >
                {prof.name.split(' ')[0]} (סף {prof.threshold}%)
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-muted)" />
          {categories.map((cat) => {
            const val = cat === 'הכל' ? '' : cat;
            const isSel = selectedCategory === val;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(val)}
                className={isSel ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  background: isSel ? 'var(--accent-gradient)' : undefined,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((shown) => !shown);
            setFormError('');
          }}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>{showCreateForm ? 'סגירת טופס' : 'הוספת מסלול נסיעה'}</span>
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateRoute}
          className="glass-panel"
          style={{ padding: '1.5rem', marginBottom: '1.5rem', direction: 'rtl' }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              יצירת מסלול נסיעה
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              צריך רק לתת למסלול שם. פרטים נוספים אפשר להוסיף לפי הצורך.
            </p>
          </div>
          {formError && (
            <p role="alert" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{formError}</p>
          )}
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" htmlFor="route-title">שם המסלול</label>
            <input
              id="route-title"
              className="form-input"
              required
              minLength={2}
              maxLength={150}
              placeholder="לדוגמה: נסיעה לעבודה"
              value={routeForm.title}
              onChange={(event) => setRouteForm({ ...routeForm, title: event.target.value })}
            />
          </div>
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 700 }}>
              פרטים נוספים (לא חובה)
            </summary>
            <div style={{ paddingTop: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="route-category">סוג מסלול</label>
                  <select
                    id="route-category"
                    className="form-input"
                    value={routeForm.category}
                    onChange={(event) => setRouteForm({ ...routeForm, category: event.target.value })}
                  >
                    {['Highway', 'Desert Cruise', 'Urban Traffic', 'Mountain Pass', 'Night Drive'].map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="route-difficulty">רמת קושי</label>
                  <select
                    id="route-difficulty"
                    className="form-input"
                    value={routeForm.difficulty}
                    onChange={(event) => setRouteForm({ ...routeForm, difficulty: event.target.value })}
                  >
                    {['Easy', 'Normal', 'Challenging', 'Extreme'].map((difficulty) => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="route-tags">תגיות</label>
                  <input
                    id="route-tags"
                    className="form-input"
                    maxLength={300}
                    placeholder="בוקר, עירוני"
                    value={routeForm.tags}
                    onChange={(event) => setRouteForm({ ...routeForm, tags: event.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="route-description">תיאור</label>
                <textarea
                  id="route-description"
                  className="form-input"
                  maxLength={2000}
                  rows={2}
                  placeholder="הוסיפו מידע שיעזור לזהות את המסלול"
                  value={routeForm.description}
                  onChange={(event) => setRouteForm({ ...routeForm, description: event.target.value })}
                />
              </div>
            </div>
          </details>
          <button type="submit" className="btn-primary" disabled={savingRoute}>
            <Plus size={17} />
              <span>{savingRoute ? 'שומר...' : 'שמירת מסלול'}</span>
          </button>
        </form>
      )}

      {actionError && (
        <p role="alert" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{actionError}</p>
      )}
      {loadError && (
        <p role="alert" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{loadError}</p>
      )}

      {/* Routes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          טוען מסלולי נהיגה זמינים...
        </div>
      ) : routesList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>הספרייה שלך עדיין ריקה. הוסיפו יעד נסיעה כדי להתחיל.</p>
        </div>
      ) : (
        <div
          className="route-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {routesList.map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {/* Thumbnail / Header */}
              <div className="route-thumbnail" style={{ position: 'relative', height: '200px', background: '#0b1120' }}>
                <img
                  src={
                    item.thumbnail_url ||
                    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    gap: '0.5rem',
                  }}
                >
                  <span className="badge badge-primary">{item.category}</span>
                  <span className="badge badge-warning">{item.difficulty}</span>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.75)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Clock size={13} />
                  <span>נסיעה בזמן אמת</span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                  {item.title}
                </h3>
                {item.is_default ? (
                  <span style={{ alignSelf: 'flex-start', marginBottom: '0.75rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700 }}>
                    מסלול מוכן לכולם
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoute(item)}
                    className="btn-secondary"
                    style={{ alignSelf: 'flex-start', marginBottom: '0.75rem', padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                    aria-label={`מחיקת ${item.title}`}
                  >
                    <Trash2 size={15} />
                    <span>מחיקה מהספרייה</span>
                  </button>
                )}
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem',
                    lineHeight: '1.55',
                    marginBottom: '1.25rem',
                    flex: 1,
                  }}
                >
                  {item.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {item.tags?.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: '#f7f3ff',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleStartDrive(item.id)}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background: 'var(--accent-gradient)',
                  }}
                >
                  <Car size={18} />
                  <span>התחלת נסיעה מנוטרת</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
