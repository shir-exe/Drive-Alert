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
    <div className="page-shell dashboard-page">
      {/* Hero / HUD Banner */}
      <div
        className="glass-panel dashboard-hero"
      >
        <div className="dashboard-hero-content">
          <div
            className="badge dashboard-hero-badge"
          >
            <ShieldCheck size={14} />
            <span>DriveAlert • מערכת בטיחות וניטור נהג בזמן אמת</span>
          </div>
          <h1 className="dashboard-hero-title">
            שלום, <span>{user?.full_name || user?.username}</span>
          </h1>
          <p className="dashboard-hero-description">
            בחר/י מסלול נהיגה והפעל/י סשן מנוטר. המצלמה ומודל MediaPipe מעריכים עצימת עיניים כדי לחשב מדד ערנות מקורב; המדד אינו מודד ריכוז ישירות ואינו תחליף למערכת בטיחות מוסמכת.
          </p>

          {/* Quick Telemetry KPI Badges */}
          {stats && (
            <div className="dashboard-kpis">
              <div className="dashboard-kpi">
                <div className="dashboard-kpi-label">נסיעות שהושלמו</div>
                <div className="dashboard-kpi-value completed">
                  {stats.completed_sessions} / {stats.total_sessions}
                </div>
              </div>
              <div className="dashboard-kpi">
                <div className="dashboard-kpi-label">ציון ערנות ממוצע</div>
                <div className="dashboard-kpi-value success">
                  {Number.isFinite(stats.overall_avg_score)
                    ? `${Math.round((stats.overall_avg_score > 1 ? stats.overall_avg_score / 100 : stats.overall_avg_score) * 100)}%`
                    : '—'}
                </div>
                {!Number.isFinite(stats.overall_avg_score) && (
                  <div className="dashboard-kpi-caption">יופיע לאחר איסוף דגימות תקינות</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Profiles & Filters */}
      <div
        className="dashboard-controls"
      >
        {/* Profile Selector */}
        <div className="profile-controls">
          <span className="profile-controls-label">
            רגישות התרעות:
          </span>
          <div className="profile-buttons">
            {Object.values(ATTENTION_PROFILES).map((prof) => (
              <button
                key={prof.id}
                onClick={() => setSelectedProfile(prof.id)}
                className={`profile-button ${selectedProfile === prof.id ? 'selected' : ''}`}
              >
                {prof.name.split(' ')[0]} (סף {prof.threshold}%)
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="category-filters">
          <Filter size={16} color="var(--text-muted)" />
          {categories.map((cat) => {
            const val = cat === 'הכל' ? '' : cat;
            const isSel = selectedCategory === val;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(val)}
                className={`${isSel ? 'btn-primary' : 'btn-secondary'} category-filter`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-create-action">
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
          className="glass-panel route-create-form"
        >
          <div className="route-create-heading">
            <h2>
              יצירת מסלול נסיעה
            </h2>
            <p>
              צריך רק לתת למסלול שם. פרטים נוספים אפשר להוסיף לפי הצורך.
            </p>
          </div>
          {formError && (
            <p role="alert" className="dashboard-action-error">{formError}</p>
          )}
          <div className="form-group route-title-group">
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
          <details className="route-details">
            <summary>
              פרטים נוספים (לא חובה)
            </summary>
            <div className="route-details-content">
              <div className="route-form-grid">
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
              <div className="form-group route-description-group">
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
        <p role="alert" className="dashboard-action-error">{actionError}</p>
      )}
      {loadError && (
        <p role="alert" className="dashboard-action-error">{loadError}</p>
      )}

      {/* Routes Grid */}
      {loading ? (
        <div className="dashboard-loading">
          טוען מסלולי נהיגה זמינים...
        </div>
      ) : routesList.length === 0 ? (
        <div className="glass-panel dashboard-empty">
          <p>הספרייה שלך עדיין ריקה. הוסיפו יעד נסיעה כדי להתחיל.</p>
        </div>
      ) : (
        <div
          className="route-grid"
        >
          {routesList.map((item) => (
            <div
              key={item.id}
              className="glass-panel route-card"
            >
              {/* Thumbnail / Header */}
              <div className="route-thumbnail">
                <img
                  src={
                    item.thumbnail_url ||
                    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={item.title}
                  className="route-thumbnail-image"
                />
                <div className="route-badges">
                  <span className="badge badge-primary">{item.category}</span>
                  <span className="badge badge-warning">{item.difficulty}</span>
                </div>
                <div className="route-live-label">
                  <Clock size={13} />
                  <span>נסיעה בזמן אמת</span>
                </div>
              </div>

              {/* Body */}
              <div className="route-card-body">
                <h3 className="route-card-title">
                  {item.title}
                </h3>
                {item.is_default ? (
                  <span className="route-default-label">
                    מסלול מוכן לכולם
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoute(item)}
                    className="btn-secondary route-delete-button"
                    aria-label={`מחיקת ${item.title}`}
                  >
                    <Trash2 size={15} />
                    <span>מחיקה מהספרייה</span>
                  </button>
                )}
                <p className="route-card-description">
                  {item.description}
                </p>

                {/* Tags */}
                <div className="route-tags">
                  {item.tags?.map((t) => (
                    <span
                      key={t}
                      className="route-tag"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleStartDrive(item.id)}
                  className="btn-primary route-start-button"
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
