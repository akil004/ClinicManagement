import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const ROLE_REDIRECT = {
  administrator: '/admin-dashboard',
  doctor:        '/doctor-dashboard',
  receptionist:  '/reception-dashboard',
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, clearMustChangePassword, logout } = useAuth();
  const forced = Boolean(user?.mustChangePassword);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.currentPassword)                        errs.currentPassword = 'Current password is required';
    if (!form.newPassword)                             errs.newPassword = 'New password is required';
    else if (form.newPassword.length < 6)              errs.newPassword = 'Minimum 6 characters';
    if (!form.confirmNewPassword)                      errs.confirmNewPassword = 'Please confirm your new password';
    else if (form.newPassword !== form.confirmNewPassword) errs.confirmNewPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(''); setSuccess('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/change-password', form);
      clearMustChangePassword();
      setSuccess('Password updated! Redirecting…');
      const role = data.user?.role ?? user?.role;
      setTimeout(() => navigate(ROLE_REDIRECT[role] ?? '/login'), 700);
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Could not update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo">🔒</div>
          <h1 className="auth-card__title">{forced ? 'Set a New Password' : 'Change Password'}</h1>
          <p className="auth-card__subtitle">
            {forced
              ? 'For security, you must change your temporary password before continuing.'
              : 'Update the password for your account.'}
          </p>
        </div>

        {serverError && (
          <div className="alert alert-danger py-2 px-3 mb-3" style={{ borderRadius: 10, fontSize: 14 }}>
            <i className="bi bi-exclamation-circle me-2" />{serverError}
          </div>
        )}
        {success && (
          <div className="alert alert-success py-2 px-3 mb-3" style={{ borderRadius: 10, fontSize: 14 }}>
            <i className="bi bi-check-circle me-2" />{success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label">{forced ? 'Temporary Password' : 'Current Password'}</label>
            <input
              name="currentPassword" type="password" autoComplete="current-password"
              className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`}
              placeholder="Enter your current password"
              value={form.currentPassword} onChange={onChange}
            />
            {errors.currentPassword && <div className="field-error">{errors.currentPassword}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input
              name="newPassword" type="password" autoComplete="new-password"
              className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
              placeholder="Min. 6 characters"
              value={form.newPassword} onChange={onChange}
            />
            {errors.newPassword && <div className="field-error">{errors.newPassword}</div>}
          </div>

          <div className="mb-4">
            <label className="form-label">Confirm New Password</label>
            <input
              name="confirmNewPassword" type="password" autoComplete="new-password"
              className={`form-control ${errors.confirmNewPassword ? 'is-invalid' : ''}`}
              placeholder="Re-enter new password"
              value={form.confirmNewPassword} onChange={onChange}
            />
            {errors.confirmNewPassword && <div className="field-error">{errors.confirmNewPassword}</div>}
          </div>

          <button type="submit" className="btn-hospital" disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" />Updating…</>
              : <><i className="bi bi-shield-check me-2" />Update Password</>}
          </button>
        </form>

        {!forced && (
          <p className="auth-footer">
            <button type="button" className="btn btn-link p-0" onClick={() => navigate(-1)}>
              ← Back
            </button>
          </p>
        )}
        <p className="auth-footer">
          <button type="button" className="btn btn-link p-0 text-muted" onClick={() => { logout(); navigate('/login'); }}>
            Log out instead
          </button>
        </p>
      </div>
    </div>
  );
}
