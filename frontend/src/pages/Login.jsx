import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username_or_email: usernameOrEmail, password });
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError('השרת אינו זמין כרגע. יש להפעיל את שירות DriveAlert ולנסות שוב.');
      } else {
        setError(err.response.data?.detail || 'שם המשתמש או הסיסמה אינם נכונים.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="glass-panel auth-card login-card">
        {/* Brand Icon */}
        <div className="auth-brand-icon">
          <ShieldAlert size={34} color="#ffffff" />
        </div>

        <h1 className="auth-title">
          Drive<span>Alert</span>
        </h1>
        <p className="auth-subtitle">
          מערכת חכמה לניטור ערנות נהגים ומניעת הסחת דעת בזמן אמת
        </p>

        {location.state?.registered && (
          <div role="status" className="auth-success">
            החשבון נוצר בהצלחה. אפשר להתחבר עכשיו.
          </div>
        )}

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">שם משתמש או אימייל</label>
            <div className="auth-input-wrap">
              <input
                type="text"
                required
                className="form-input auth-password-input"
                placeholder="הכנס שם משתמש או אימייל"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
              />
              <User size={18} className="auth-input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">סיסמה</label>
            <div className="auth-input-wrap">
              <input
                type="password"
                required
                className="form-input auth-password-input"
                placeholder="הכנס סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={18} className="auth-input-icon" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary auth-submit"
          >
            <span>{loading ? 'מתחבר למערכת...' : 'כניסה למערכת'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <p>
            עדיין אין לך פרופיל נהג?{' '}
            <Link to="/register">
              הרשמה מהירה כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
