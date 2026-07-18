import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const ROLE_REDIRECT = {
  administrator: '/admin-dashboard',
  doctor:        '/doctor-dashboard',
  receptionist:  '/reception-dashboard',
};

export default function Login() {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim())                        errs.email    = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email))  errs.email    = 'Enter a valid email';
    if (!form.password)                            errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(''); setSuccess('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      setSuccess('Login successful! Redirecting…');
      const destination = data.user.mustChangePassword
        ? '/change-password'
        : (ROLE_REDIRECT[data.user.role] ?? '/login');
      setTimeout(() => navigate(destination), 500);
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo">🏥</div>
          <h1 className="auth-card__title">Hospital Management</h1>
          <p className="auth-card__subtitle">Sign in to your account</p>
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
            <label className="form-label">Email Address</label>
            <input
              name="email" type="email" autoComplete="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="you@hospital.com"
              value={form.email} onChange={onChange}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="mb-4">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                name="password" type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Enter your password"
                value={form.password} onChange={onChange}
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn-hospital" disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</>
              : <><i className="bi bi-box-arrow-in-right me-2" />Sign In</>}
          </button>
        </form>

        <p className="auth-footer">
          Doctor and receptionist accounts are created by your administrator.
        </p>
      </div>
    </div>
  );
}
