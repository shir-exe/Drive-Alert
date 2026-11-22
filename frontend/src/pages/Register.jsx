import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { ATTENTION_PROFILES } from '../utils/attentionProfiles';

export const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    preferred_profile: 'standard',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.register(formData);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      if (!err.response) {
        setError('השרת אינו זמין כרגע. יש להפעיל את שירות DriveAlert ולנסות שוב.');
      } else {
        setError(err.response.data?.detail || 'לא ניתן ליצור את החשבון. בדקו את הפרטים ונסו שוב.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
      <div className="glass-panel auth-card register-card">
        <div className="register-header">
          <div className="auth-brand-icon">
            <ShieldAlert size={34} color="#ffffff" />
          </div>

          <h1 className="auth-title">
            הרשמה ל-<span>DriveAlert</span>
          </h1>
          <p className="register-description">
            הצטרפו למערכת ניטור בטיחות נהיגה ומניעת עייפות והסחת דעת
          </p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">שם הנהג/ת המלא</label>
            <input
              type="text"
              name="full_name"
              required
              className="form-input"
              placeholder="ישראל ישראלי"
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="register-grid">
            <div className="form-group">
              <label className="form-label">שם משתמש *</label>
              <input
                type="text"
                required
                name="username"
                className="form-input"
                placeholder="driver_01"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">כתובת אימייל *</label>
              <input
                type="email"
                required
                name="email"
                className="form-input"
                placeholder="driver@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">סיסמה (לפחות 8 תווים) *</label>
            <input
              type="password"
              required
              name="password"
              minLength={8}
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* Attention Profile Selection */}
          <div className="form-group profile-selection">
            <label className="form-label">פרופיל רגישות התרעות</label>
            <div className="profile-options">
              {Object.values(ATTENTION_PROFILES).map((prof) => (
                <label
                  key={prof.id}
                  className={`profile-option ${formData.preferred_profile === prof.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="preferred_profile"
                    value={prof.id}
                    checked={formData.preferred_profile === prof.id}
                    onChange={handleChange}
                    className="profile-radio"
                  />
                  <div>
                    <div className="profile-option-name">
                      {prof.name}
                    </div>
                    <div className="profile-option-description">
                      {prof.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary auth-submit register-submit"
          >
            <span>{loading ? 'יוצר פרופיל נהג...' : 'סיום והרשמה'}</span>
            <CheckCircle2 size={18} />
          </button>
        </form>

        <div className="auth-footer register-footer">
          <p>
            כבר יש לך פרופיל?{' '}
            <Link to="/login">
              התחברות כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
