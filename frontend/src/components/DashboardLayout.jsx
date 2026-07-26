import React, { useState } from 'react';
import { useNavigate }  from 'react-router-dom';
import { useAuth }      from '../context/AuthContext.jsx';

const ROLE_LABEL = { administrator: 'Administrator', doctor: 'Doctor', receptionist: 'Receptionist' };
const ROLE_COLOR = { administrator: '#2563eb', doctor: '#059669', receptionist: '#d97706' };

export default function DashboardLayout({ sidebarLinks = [], activeSection, onSection, pageTitle, children }) {
  const navigate           = useNavigate();
  const { user, logout }   = useAuth();
  const [open, setOpen]    = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const role         = user?.role ?? '';
  const name         = user?.name ?? 'User';
  const avatarLetter = name.charAt(0).toUpperCase();

  return (
    <div className="dashboard-shell">
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className={`app-sidebar ${open ? 'open' : ''}`}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🏥</div>
          <div className="sidebar-brand-text">
            MediCare
            <small>Hospital System</small>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {sidebarLinks.map((link) => (
            <button
              key={link.section}
              type="button"
              className={`sidebar-link ${activeSection === link.section ? 'active' : ''}`}
              onClick={() => { onSection(link.section); setOpen(false); }}
            >
              <i className={`bi ${link.icon}`} />
              {link.label}
              {link.badge > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <i className="bi bi-box-arrow-left" /> Logout
        </button>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────── */}
      <div className="dashboard-body">

        {/* Navbar */}
        <header className="app-navbar">
          <button type="button" className="navbar-toggle" onClick={() => setOpen((v) => !v)} aria-label="Toggle sidebar">
            <i className="bi bi-list" />
          </button>

          <span className="navbar-page-title">{pageTitle}</span>

          <div className="navbar-user">
            <div style={{ textAlign: 'right' }}>
              <div className="navbar-user-name">{name}</div>
              <span className={`navbar-role-badge role-${role}`}>{ROLE_LABEL[role] ?? role}</span>
            </div>
            <div className="navbar-user-avatar" style={{ background: ROLE_COLOR[role] ?? '#2563eb' }}>
              {avatarLetter}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
