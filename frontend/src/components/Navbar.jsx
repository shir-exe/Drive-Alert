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
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              background: 'var(--accent-gradient)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            <ShieldAlert size={22} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
              Drive<span style={{ color: 'var(--accent-primary)' }}>Alert</span>
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              ניטור ערנות נהגים
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: isActive('/dashboard') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive('/dashboard') ? '#f1eaff' : 'transparent',
              border: isActive('/dashboard') ? '1px solid #dfd0fa' : '1px solid transparent',
              transition: 'var(--transition-smooth)',
            }}
          >
            <Compass size={17} />
            <span>ספריית מסלולים</span>
          </Link>

          <Link
            to="/history"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: isActive('/history') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive('/history') ? '#f1eaff' : 'transparent',
              border: isActive('/history') ? '1px solid #dfd0fa' : '1px solid transparent',
              transition: 'var(--transition-smooth)',
            }}
          >
            <HistoryIcon size={17} />
            <span>יומן נסיעות וציונים</span>
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: '#faf9ff',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <User size={15} color="var(--accent-secondary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.username}</span>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
              נהג פעיל
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
            title="התנתקות מהמערכת"
          >
            <LogOut size={16} />
            <span>יציאה</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
