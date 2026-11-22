import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Compass, History as HistoryIcon, LogOut, User } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || (path === '/dashboard' && location.pathname === '/library');

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          <div className="navbar-brand-icon">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="navbar-brand-name">
              Drive<span>Alert</span>
            </span>
            <span className="navbar-brand-tagline">
              ניטור ערנות נהגים
            </span>
          </div>
        </Link>

        <nav className="navbar-nav" aria-label="ניווט ראשי">
          <Link
            to="/dashboard"
            aria-current={isActive('/dashboard') ? 'page' : undefined}
            className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <Compass size={17} />
            <span>מסלולי נהיגה</span>
          </Link>
          <Link
            to="/history"
            aria-current={isActive('/history') ? 'page' : undefined}
            className={`navbar-link ${isActive('/history') ? 'active' : ''}`}
          >
            <HistoryIcon size={17} />
            <span>יומן נסיעות</span>
          </Link>
        </nav>

        <div className="navbar-user">
          <div className="navbar-user-profile">
            <User size={16} color="var(--accent-primary)" />
            <span className="navbar-user-name">
              {user?.full_name || user?.username}
            </span>
            <span className="badge badge-success navbar-user-badge">
              מחובר/ת
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary navbar-logout"
            title="התנתקות מהמערכת"
          >
            <LogOut size={15} />
            <span>יציאה</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
