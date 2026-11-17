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
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-glass)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div
        className="navbar-inner"
        style={{
          maxWidth: '1440px',
          minHeight: '76px',
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '13px',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: 'var(--accent-gradient)',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Drive<span style={{ color: 'var(--accent-primary)' }}>Alert</span>
            </span>
            <span style={{ display: 'block', marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1 }}>
              ניטור ערנות נהגים
            </span>
          </div>
        </Link>

        <nav className="navbar-nav" aria-label="ניווט ראשי" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Link
            to="/dashboard"
            aria-current={isActive('/dashboard') ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 0.9rem',
              borderRadius: '11px',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: isActive('/dashboard') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive('/dashboard') ? '#f0efff' : 'transparent',
            }}
          >
            <Compass size={17} />
            <span>מסלולי נהיגה</span>
          </Link>
          <Link
            to="/history"
            aria-current={isActive('/history') ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 0.9rem',
              borderRadius: '11px',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: isActive('/history') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive('/history') ? '#f0efff' : 'transparent',
            }}
          >
            <HistoryIcon size={17} />
            <span>יומן נסיעות</span>
          </Link>
        </nav>

        <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
            <User size={16} color="var(--accent-primary)" />
            <span className="navbar-user-name" style={{ fontSize: '0.86rem', fontWeight: 700 }}>
              {user?.full_name || user?.username}
            </span>
            <span className="badge badge-success navbar-user-badge" style={{ fontSize: '0.67rem' }}>
              מחובר/ת
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ minHeight: '38px', padding: '0.4rem 0.7rem', fontSize: '0.83rem' }}
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
