import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout      from '../components/DashboardLayout.jsx';
import Pagination           from '../components/Pagination.jsx';
import BookingWizard        from '../components/BookingWizard.jsx';
import DoctorScheduleModal  from '../components/DoctorScheduleModal.jsx';
import { useToast }         from '../components/Toast.jsx';
import useDebounce          from '../hooks/useDebounce.js';
import usePagination        from '../hooks/usePagination.js';
import api                  from '../api/axios.js';

const SIDEBAR_LINKS = [
  { label: 'Dashboard',        icon: 'bi-speedometer2',   section: 'overview'     },
  { label: 'Doctors',          icon: 'bi-person-badge',   section: 'doctors'      },
  { label: 'Register Patient', icon: 'bi-person-plus',    section: 'register'     },
  { label: 'Patients',         icon: 'bi-people',         section: 'patients'     },
  { label: 'Appointments',     icon: 'bi-calendar-check', section: 'appointments' },
  { label: 'Billing',          icon: 'bi-receipt',        section: 'billing'      },
  { label: 'Profile',          icon: 'bi-person-circle',  section: 'profile'      },
];

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const AVAILABILITY_OPTIONS = ['Available', 'Busy', 'On Leave'];

const EMPTY_REG  = { patientName: '', patientAge: '', patientPhone: '', patientEmail: '', patientBloodGroup: '', patientGender: '', doctorId: '', doctorName: '', date: '', timeSlot: '', complaint: '' };
const EMPTY_BILL = { patientName: '', service: '', amount: '' };

const STATUS_CFG = {
  pending:   { cls: 'badge-pending',   label: 'Pending'   },
  approved:  { cls: 'badge-active',    label: 'Approved'  },
  rejected:  { cls: 'badge-cancelled', label: 'Rejected'  },
  completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-inactive',  label: 'Cancelled' },
  paid:      { cls: 'badge-completed', label: 'Paid'      },
  Available: { cls: 'badge-active',    label: 'Available' },
  Busy:      { cls: 'badge-pending',   label: 'Busy'      },
  'On Leave':{ cls: 'badge-leave',     label: 'On Leave'  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] ?? { cls: 'badge-inactive', label: status };
  return <span className={`badge-status ${cfg.cls}`}>{cfg.label}</span>;
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className="stat-card-icon" style={{ background: color + '20', color }}>{icon}</div>
    <div><div className="stat-card-value">{value ?? '—'}</div><div className="stat-card-label">{label}</div></div>
  </div>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="modal-backdrop-custom" onClick={onClose}>
    <div className="modal-custom" style={{ maxWidth: wide ? 700 : 500 }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-custom-header">
        <h5 className="modal-custom-title">{title}</h5>
        <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>
      {children}
    </div>
  </div>
);

export default function ReceptionDashboard() {
  const toast = useToast();
  const [section,  setSection]  = useState('overview');
  const [stats,    setStats]    = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading]   = useState(true);

  // Local patients list (no Patient model — managed in state)
  const [patients,  setPatients]  = useState([]);
  const [bills,     setBills]     = useState([]);

  // Specializations & doctors (real data, for booking wizard, registration form, and Doctors section)
  const [specializations,  setSpecializations]  = useState([]);
  const [allDoctors,       setAllDoctors]       = useState([]);
  const [allDoctorsLoading, setAllDoctorsLoading] = useState(true);

  // Doctors section search/filter/sort
  const [doctorSearch,  setDoctorSearch]  = useState('');
  const [doctorFilters, setDoctorFilters] = useState({ specialization: '', availabilityStatus: '' });
  const [doctorSort,    setDoctorSort]    = useState({ sortBy: 'name', sortDir: 'asc' });
  const debouncedDoctorSearch = useDebounce(doctorSearch, 350);
  const [scheduleDoctor, setScheduleDoctor] = useState(null);

  // Modals
  const [modal,     setModal]     = useState(null);   // 'reschedule'|'rejectionDetail'|'generateBill'|'editPatient'|'bookingWizard'
  const [selected,  setSelected]  = useState(null);
  const [wizardInitialDoctor, setWizardInitialDoctor] = useState(null);
  const [regForm,   setRegForm]   = useState(EMPTY_REG);
  const [billForm,  setBillForm]  = useState(EMPTY_BILL);
  const [reschedForm, setReschedForm] = useState({ date: '', timeSlot: '' });
  const [saving,    setSaving]    = useState(false);

  // Filters
  const [searchTerm,   setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Fetch ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/reception');
      setStats(data.stats);
    } catch { /* non-critical */ }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setApptLoading(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data.appointments ?? []);
    } catch {
      toast('Could not load appointments', 'error');
    } finally {
      setApptLoading(false);
    }
  }, []);

  const fetchSpecializations = useCallback(async () => {
    try {
      const { data } = await api.get('/specializations');
      setSpecializations(data.specializations ?? []);
    } catch { /* non-critical */ }
  }, []);

  const fetchAllDoctors = useCallback(async () => {
    setAllDoctorsLoading(true);
    try {
      const { data } = await api.get('/employees/doctors', {
        params: {
          search: debouncedDoctorSearch || undefined,
          specialization: doctorFilters.specialization || undefined,
          availabilityStatus: doctorFilters.availabilityStatus || undefined,
          status: 'active',
          sortBy: doctorSort.sortBy,
          sortDir: doctorSort.sortDir,
          limit: 100,
        },
      });
      setAllDoctors(data.employees ?? []);
    } catch { toast('Could not load doctors', 'error'); }
    finally { setAllDoctorsLoading(false); }
  }, [debouncedDoctorSearch, doctorFilters, doctorSort]);

  useEffect(() => { fetchStats(); fetchAppointments(); fetchSpecializations(); }, []);
  useEffect(() => { fetchAllDoctors(); }, [fetchAllDoctors]);

  // ── Derived data ───────────────────────────────────────
  const rejectedAppts = appointments.filter((a) => a.status === 'rejected');

  const filteredAppts = useMemo(() => {
    let list = appointments;
    if (statusFilter !== 'all')  list = list.filter((a) => a.status === statusFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((a) =>
        a.patientName?.toLowerCase().includes(q) ||
        a.doctorName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, statusFilter, debouncedSearch]);

  const filteredPatients = useMemo(() => {
    if (!debouncedSearch) return patients;
    const q = debouncedSearch.toLowerCase();
    return patients.filter((p) =>
      p.patientName?.toLowerCase().includes(q) || p.patientPhone?.includes(q)
    );
  }, [patients, debouncedSearch]);

  const apptPag  = usePagination(filteredAppts, 8);
  const patiPag  = usePagination(filteredPatients, 8);

  // ── Appointment actions ────────────────────────────────
  const cancelAppt = async (id) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: 'cancelled' } : a));
      toast('Appointment cancelled', 'info');
      fetchStats();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not cancel', 'error');
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch(`/appointments/${selected._id}/reschedule`, reschedForm);
      setAppointments((prev) => prev.map((a) => a._id === selected._id ? data.appointment : a));
      toast('Appointment rescheduled ✓', 'success');
      setModal(null);
      setSelected(null);
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not reschedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openBookingWizard = (doctor = null) => { setWizardInitialDoctor(doctor); setModal('bookingWizard'); };
  const handleBooked = () => { setModal(null); setWizardInitialDoctor(null); fetchAppointments(); fetchStats(); };

  // ── Patient registration ───────────────────────────────
  const handleRegisterPatient = (e) => {
    e.preventDefault();
    const newP = { ...regForm, id: Date.now(), registeredAt: new Date().toISOString() };
    setPatients((prev) => [newP, ...prev]);
    toast('Patient registered ✓', 'success');
    setRegForm(EMPTY_REG);
    setSection('patients');
  };

  // ── Billing ────────────────────────────────────────────
  const handleGenerateBill = (e) => {
    e.preventDefault();
    const newBill = { ...billForm, id: Date.now(), status: 'pending', date: new Date().toISOString() };
    setBills((prev) => [newBill, ...prev]);
    toast('Bill generated ✓', 'success');
    setBillForm(EMPTY_BILL);
    setModal(null);
  };

  const markPaid = (id) => {
    setBills((prev) => prev.map((b) => b.id === id ? { ...b, status: 'paid' } : b));
    toast('Payment recorded ✓', 'success');
  };

  const PAGE_TITLES = {
    overview: 'Reception Dashboard', doctors: 'Doctor Directory', register: 'Register Patient',
    patients: 'Patient Records', appointments: 'Appointments',
    billing: 'Billing & Payments', profile: 'My Profile',
  };

  // ════════════════════════════════════════════════════════
  // SECTION: OVERVIEW
  // ════════════════════════════════════════════════════════
  const renderOverview = () => (
    <>
      <div className="row g-3 mb-4">
        {[
          { icon: '👤', label: "Today's Registrations", value: stats?.todaysRegistrations, color: '#2563eb' },
          { icon: '📅', label: "Today's Appointments",  value: stats?.todaysAppointments,  color: '#0891b2' },
          { icon: '⏳', label: 'Pending Review',        value: stats?.pendingAppointments,  color: '#d97706' },
          { icon: '🚫', label: 'Rejected Today',        value: stats?.rejectedToday,        color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="col-sm-6 col-xl-3"><StatCard {...s} /></div>
        ))}
      </div>

      {/* Rejected appointments alert */}
      {rejectedAppts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <span style={{ fontSize: 20 }}>🚫</span>
            <h6 style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>
              {rejectedAppts.length} Rejected Appointment{rejectedAppts.length > 1 ? 's' : ''} — Action Required
            </h6>
          </div>
          {rejectedAppts.slice(0, 3).map((a) => (
            <div key={a._id} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 8, border: '1px solid #fecaca' }}>
              <div className="d-flex align-items-start justify-content-between gap-2">
                <div>
                  <strong>{a.patientName}</strong>
                  <span className="text-muted mx-2">·</span>
                  <span style={{ fontSize: 13 }}>{new Date(a.date).toLocaleDateString('en-IN')} at {a.timeSlot}</span>
                  <div style={{ fontSize: 13, color: '#991b1b', marginTop: 4 }}>
                    <i className="bi bi-x-circle me-1" />
                    <strong>{a.rejectionReasonType}</strong>
                    {a.rejectionReason !== a.rejectionReasonType && ` — ${a.rejectionReason}`}
                  </div>
                  {a.rejectedBy?.fullName && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>Rejected by {a.rejectedBy.fullName}</div>
                  )}
                </div>
                <div className="d-flex gap-2 flex-shrink-0">
                  <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
                    onClick={() => { setSelected(a); setModal('rejectionDetail'); }}>
                    Details
                  </button>
                  <button className="btn btn-sm btn-primary" style={{ borderRadius: 8 }}
                    onClick={() => { setSelected(a); setReschedForm({ date: '', timeSlot: '' }); setModal('reschedule'); }}>
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rejectedAppts.length > 3 && (
            <button className="btn btn-sm btn-outline-danger mt-1" style={{ borderRadius: 8 }}
              onClick={() => { setStatusFilter('rejected'); setSection('appointments'); }}>
              View all {rejectedAppts.length} rejections →
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="content-card mb-4">
        <div className="content-card-header"><h6 className="content-card-title">Quick Actions</h6></div>
        <div className="content-card-body">
          <div className="d-flex flex-wrap gap-2">
            {[
              { label: 'Book by Specialization', icon: 'bi-calendar-plus', action: () => openBookingWizard() },
              { label: 'Register Patient',       icon: 'bi-person-plus',   action: () => setSection('register') },
              { label: 'Browse Doctors',         icon: 'bi-person-badge',  action: () => setSection('doctors') },
              { label: 'Search Patient',         icon: 'bi-search',        action: () => setSection('patients') },
              { label: 'View Rejections',        icon: 'bi-x-circle',      action: () => { setStatusFilter('rejected'); setSection('appointments'); } },
              { label: 'Generate Bill',          icon: 'bi-receipt',       action: () => setModal('generateBill') },
            ].map(({ label, icon, action }) => (
              <button key={label} className="btn btn-outline-primary btn-sm" style={{ borderRadius: 8 }} onClick={action}>
                <i className={`bi ${icon} me-1`} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent appointments */}
      <div className="content-card">
        <div className="content-card-header">
          <h6 className="content-card-title">Recent Appointments</h6>
          <button className="btn btn-sm btn-primary" style={{ borderRadius: 8 }} onClick={() => setSection('appointments')}>View All</button>
        </div>
        <div className="table-responsive">
          <table className="hospital-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {appointments.slice(0, 6).map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.patientName}</strong></td>
                  <td>{a.doctorName}</td>
                  <td>{new Date(a.date).toLocaleDateString('en-IN')} {a.timeSlot}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: DOCTORS (search/filter/sort + schedule + book)
  // ════════════════════════════════════════════════════════
  const renderDoctors = () => (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box" style={{ maxWidth: 240 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search name, specialization…" value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)} />
        </div>
        <select className="form-select form-select-sm" style={{ width: 180, borderRadius: 8 }}
          value={doctorFilters.specialization}
          onChange={(e) => setDoctorFilters((p) => ({ ...p, specialization: e.target.value }))}>
          <option value="">All Specializations</option>
          {specializations.filter((s) => s.isActive).map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
        </select>
        <select className="form-select form-select-sm" style={{ width: 150, borderRadius: 8 }}
          value={doctorFilters.availabilityStatus}
          onChange={(e) => setDoctorFilters((p) => ({ ...p, availabilityStatus: e.target.value }))}>
          <option value="">Any Availability</option>
          {AVAILABILITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-select form-select-sm" style={{ width: 170, borderRadius: 8 }}
          value={`${doctorSort.sortBy}:${doctorSort.sortDir}`}
          onChange={(e) => { const [sortBy, sortDir] = e.target.value.split(':'); setDoctorSort({ sortBy, sortDir }); }}>
          <option value="name:asc">Name (A–Z)</option>
          <option value="name:desc">Name (Z–A)</option>
          <option value="experience:desc">Experience (high–low)</option>
          <option value="experience:asc">Experience (low–high)</option>
          <option value="fee:asc">Fee (low–high)</option>
          <option value="fee:desc">Fee (high–low)</option>
        </select>
        <button className="btn btn-primary ms-auto" style={{ borderRadius: 8 }} onClick={() => openBookingWizard()}>
          <i className="bi bi-calendar-plus me-1" />Book by Specialization
        </button>
      </div>

      <div className="content-card">
        {allDoctorsLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : allDoctors.length === 0
            ? <p className="text-muted text-center py-5 mb-0">No doctors match your filters.</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead><tr><th>Name</th><th>Specialization</th><th>Experience</th><th>Fee</th><th>Availability</th><th>Actions</th></tr></thead>
                  <tbody>
                    {allDoctors.map((d) => (
                      <tr key={d._id}>
                        <td><strong>{d.fullName}</strong><div style={{ fontSize: 12, color: '#94a3b8' }}>{d.department || '—'}</div></td>
                        <td>{d.specialization || '—'}</td>
                        <td>{d.experience != null ? `${d.experience} yrs` : '—'}</td>
                        <td>{d.consultationFee != null ? `₹${d.consultationFee}` : '—'}</td>
                        <td><StatusBadge status={d.availabilityStatus} /></td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }}
                              onClick={() => setScheduleDoctor(d)}>
                              <i className="bi bi-calendar3 me-1" />Schedule
                            </button>
                            {d.availabilityStatus === 'Available' && (
                              <button className="btn btn-sm btn-primary" style={{ borderRadius: 6 }}
                                onClick={() => openBookingWizard(d)}>
                                Book
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: REGISTER PATIENT
  // ════════════════════════════════════════════════════════
  const renderRegister = () => (
    <div className="content-card" style={{ maxWidth: 680 }}>
      <div className="content-card-header"><h6 className="content-card-title">Register New Patient</h6></div>
      <div className="content-card-body">
        <form onSubmit={handleRegisterPatient}>
          <div className="row g-3">
            {[
              { name: 'patientName',  label: 'Full Name *',    placeholder: 'First Last',         col: 6 },
              { name: 'patientAge',   label: 'Age',            placeholder: 'e.g. 35',            col: 6, type: 'number' },
              { name: 'patientPhone', label: 'Phone *',        placeholder: '10-digit number',    col: 6 },
              { name: 'patientEmail', label: 'Email',          placeholder: 'patient@email.com',  col: 6, type: 'email' },
            ].map(({ name, label, placeholder, col, type = 'text' }) => (
              <div key={name} className={`col-md-${col}`}>
                <label className="form-label">{label}</label>
                <input type={type} className="form-control" placeholder={placeholder} style={{ borderRadius: 10 }}
                  value={regForm[name]} onChange={(e) => setRegForm((p) => ({ ...p, [name]: e.target.value }))}
                  required={label.includes('*')} />
              </div>
            ))}
            <div className="col-md-6">
              <label className="form-label">Blood Group</label>
              <select className="form-select" style={{ borderRadius: 10 }}
                value={regForm.patientBloodGroup} onChange={(e) => setRegForm((p) => ({ ...p, patientBloodGroup: e.target.value }))}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => <option key={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Gender</label>
              <select className="form-select" style={{ borderRadius: 10 }}
                value={regForm.patientGender} onChange={(e) => setRegForm((p) => ({ ...p, patientGender: e.target.value }))}>
                <option value="">Select</option>
                {['Male', 'Female', 'Other'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Assigned Doctor</label>
              <select className="form-select" style={{ borderRadius: 10 }}
                value={regForm.doctorId}
                onChange={(e) => {
                  const d = allDoctors.find((x) => x._id === e.target.value);
                  setRegForm((p) => ({ ...p, doctorId: e.target.value, doctorName: d?.fullName ?? '' }));
                }}>
                <option value="">Select doctor</option>
                {allDoctors.map((d) => <option key={d._id} value={d._id}>{d.fullName} — {d.specialization}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Appointment Date</label>
              <input type="date" className="form-control" style={{ borderRadius: 10 }}
                value={regForm.date} onChange={(e) => setRegForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Time Slot</label>
              <select className="form-select" style={{ borderRadius: 10 }}
                value={regForm.timeSlot} onChange={(e) => setRegForm((p) => ({ ...p, timeSlot: e.target.value }))}>
                <option value="">Select time</option>
                {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Chief Complaint</label>
              <textarea rows={2} className="form-control" style={{ borderRadius: 10 }}
                placeholder="Describe the patient's main complaint"
                value={regForm.complaint} onChange={(e) => setRegForm((p) => ({ ...p, complaint: e.target.value }))} />
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }}>
              <i className="bi bi-person-check me-1" />Register Patient
            </button>
            <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setRegForm(EMPTY_REG)}>
              Clear
            </button>
          </div>
          <p className="text-muted mt-3 mb-0" style={{ fontSize: 12.5 }}>
            <i className="bi bi-info-circle me-1" />
            To book an appointment right away, use <button type="button" className="btn btn-link p-0" style={{ fontSize: 12.5 }} onClick={() => openBookingWizard()}>Book by Specialization</button> instead — it only shows doctors who are currently available.
          </p>
        </form>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: APPOINTMENTS
  // ════════════════════════════════════════════════════════
  const renderAppointments = () => (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box flex-grow-1" style={{ maxWidth: 280 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search patient or doctor…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="d-flex gap-1 flex-wrap">
          {['all','pending','approved','rejected','completed','cancelled'].map((f) => (
            <button key={f}
              className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ borderRadius: 8, textTransform: 'capitalize' }}
              onClick={() => { setStatusFilter(f); apptPag.setPage(1); }}>
              {f}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-primary ms-auto" style={{ borderRadius: 8 }}
          onClick={() => openBookingWizard()}>
          <i className="bi bi-calendar-plus me-1" />Book
        </button>
        <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }} onClick={fetchAppointments}>
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>

      <div className="content-card">
        {apptLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : apptPag.paginated.length === 0
            ? <p className="text-muted text-center py-5 mb-0">No appointments match your filters.</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead>
                    <tr><th>Patient</th><th>Doctor</th><th>Date & Time</th><th>Status</th><th>Rejection Info</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {apptPag.paginated.map((a) => (
                      <tr key={a._id} style={{ background: a.status === 'rejected' ? '#fff7f7' : undefined }}>
                        <td>
                          <strong>{a.patientName}</strong>
                          {a.patientPhone && <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.patientPhone}</div>}
                        </td>
                        <td>{a.doctorName}</td>
                        <td>
                          {new Date(a.date).toLocaleDateString('en-IN')}
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.timeSlot}</div>
                        </td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>
                          {a.status === 'rejected' ? (
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#991b1b' }}>{a.rejectionReasonType}</div>
                              {a.rejectedBy?.fullName && (
                                <div style={{ fontSize: 11.5, color: '#64748b' }}>By {a.rejectedBy.fullName}</div>
                              )}
                              {a.rejectedAt && (
                                <div style={{ fontSize: 11.5, color: '#64748b' }}>{new Date(a.rejectedAt).toLocaleDateString('en-IN')}</div>
                              )}
                            </div>
                          ) : <span className="text-muted" style={{ fontSize: 13 }}>—</span>}
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {a.status === 'rejected' && (
                              <>
                                <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }}
                                  onClick={() => { setSelected(a); setModal('rejectionDetail'); }}>
                                  Details
                                </button>
                                <button className="btn btn-sm btn-warning" style={{ borderRadius: 6 }}
                                  onClick={() => { setSelected(a); setReschedForm({ date: '', timeSlot: '' }); setModal('reschedule'); }}>
                                  Reschedule
                                </button>
                              </>
                            )}
                            {['pending', 'approved'].includes(a.status) && (
                              <>
                                <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }}
                                  onClick={() => { setSelected(a); setReschedForm({ date: '', timeSlot: '' }); setModal('reschedule'); }}>
                                  <i className="bi bi-calendar2-check" />
                                </button>
                                <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }}
                                  onClick={() => cancelAppt(a._id)}>
                                  Cancel
                                </button>
                              </>
                            )}
                            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }}
                              onClick={() => toast('Summary printed!', 'info')}>
                              <i className="bi bi-printer" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
        <div style={{ padding: '8px 16px 16px' }}>
          <Pagination page={apptPag.page} totalPages={apptPag.totalPages} onPage={apptPag.setPage} total={filteredAppts.length} perPage={8} />
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: PATIENTS
  // ════════════════════════════════════════════════════════
  const renderPatients = () => (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box flex-grow-1" style={{ maxWidth: 280 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search by name or phone…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className="btn btn-sm btn-primary ms-auto" style={{ borderRadius: 8 }} onClick={() => setSection('register')}>
          <i className="bi bi-person-plus me-1" />Register New
        </button>
      </div>
      <div className="content-card">
        {patiPag.paginated.length === 0
          ? <p className="text-muted text-center py-5 mb-0">
              No patients registered yet. <button className="btn btn-link p-0" onClick={() => setSection('register')}>Register the first patient →</button>
            </p>
          : (
            <div className="table-responsive">
              <table className="hospital-table">
                <thead><tr><th>Name</th><th>Age</th><th>Phone</th><th>Blood</th><th>Doctor</th><th>Registered</th><th>Actions</th></tr></thead>
                <tbody>
                  {patiPag.paginated.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.patientName}</strong></td>
                      <td>{p.patientAge ?? '—'}</td>
                      <td>{p.patientPhone ?? '—'}</td>
                      <td>{p.patientBloodGroup ? <span className="badge bg-danger">{p.patientBloodGroup}</span> : '—'}</td>
                      <td>{p.doctorName ?? '—'}</td>
                      <td>{new Date(p.registeredAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }}
                            onClick={() => { setSelected(p); setModal('editPatient'); }}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-sm btn-outline-info" style={{ borderRadius: 6 }}
                            onClick={() => openBookingWizard()}>
                            Book Appt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        <div style={{ padding: '8px 16px 16px' }}>
          <Pagination page={patiPag.page} totalPages={patiPag.totalPages} onPage={patiPag.setPage} total={filteredPatients.length} perPage={8} />
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: BILLING
  // ════════════════════════════════════════════════════════
  const renderBilling = () => (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => { setBillForm(EMPTY_BILL); setModal('generateBill'); }}>
          <i className="bi bi-receipt me-1" />Generate Bill
        </button>
      </div>
      <div className="content-card">
        {bills.length === 0
          ? <p className="text-muted text-center py-5 mb-0">No bills generated yet.</p>
          : (
            <div className="table-responsive">
              <table className="hospital-table">
                <thead><tr><th>Patient</th><th>Service</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.patientName}</strong></td>
                      <td>{b.service}</td>
                      <td>₹{Number(b.amount).toLocaleString('en-IN')}</td>
                      <td>{new Date(b.date).toLocaleDateString('en-IN')}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <div className="d-flex gap-1">
                          {b.status === 'pending' && (
                            <button className="btn btn-sm btn-success" style={{ borderRadius: 6 }} onClick={() => markPaid(b.id)}>
                              Mark Paid
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }}
                            onClick={() => toast('Bill printed!', 'info')}>
                            <i className="bi bi-printer" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: PROFILE
  // ════════════════════════════════════════════════════════
  const renderProfile = () => {
    const name  = localStorage.getItem('name')  ?? '';
    const email = localStorage.getItem('email') ?? '';
    return (
      <div className="content-card" style={{ maxWidth: 520 }}>
        <div className="content-card-header"><h6 className="content-card-title">Receptionist Profile</h6></div>
        <div className="content-card-body">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>
              {name.charAt(0)}
            </div>
            <div><h5 className="mb-1">{name}</h5><span className="navbar-role-badge role-receptionist">Receptionist</span></div>
          </div>
          {[['Full Name', name], ['Email', email]].map(([label, val]) => (
            <div className="mb-3" key={label}>
              <label className="form-label">{label}</label>
              <input className="form-control" defaultValue={val} style={{ borderRadius: 10 }} />
            </div>
          ))}
          <button className="btn btn-warning" style={{ borderRadius: 8 }} onClick={() => toast('Profile updated!', 'success')}>
            <i className="bi bi-floppy me-1" />Update Profile
          </button>
        </div>
      </div>
    );
  };

  const SECTIONS = { overview: renderOverview, doctors: renderDoctors, register: renderRegister, patients: renderPatients, appointments: renderAppointments, billing: renderBilling, profile: renderProfile };

  const linksWithBadge = SIDEBAR_LINKS.map((l) =>
    l.section === 'appointments' ? { ...l, badge: rejectedAppts.length } : l
  );

  return (
    <>
      <DashboardLayout sidebarLinks={linksWithBadge} activeSection={section} onSection={(s) => { setSection(s); setSearchTerm(''); setStatusFilter('all'); }} pageTitle={PAGE_TITLES[section]}>
        <p className="section-subheading">{section === 'overview' ? "Here's today's reception summary." : `Manage ${section}`}</p>
        {(SECTIONS[section] ?? renderOverview)()}
      </DashboardLayout>

      {/* Specialization-based Booking Wizard */}
      {modal === 'bookingWizard' && (
        <BookingWizard
          specializations={specializations}
          initialDoctor={wizardInitialDoctor}
          onClose={() => { setModal(null); setWizardInitialDoctor(null); }}
          onBooked={handleBooked}
          toast={toast}
        />
      )}

      {/* Doctor schedule viewer */}
      {scheduleDoctor && (
        <DoctorScheduleModal
          doctor={scheduleDoctor}
          onClose={() => setScheduleDoctor(null)}
          onBook={scheduleDoctor.availabilityStatus === 'Available' ? () => { openBookingWizard(scheduleDoctor); setScheduleDoctor(null); } : null}
        />
      )}

      {/* Rejection Detail Modal */}
      {modal === 'rejectionDetail' && selected && (
        <Modal title="Rejection Details" onClose={() => setModal(null)}>
          <div className="modal-custom-body">
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div className="mb-3">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginBottom: 4 }}>Patient</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.patientName}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{new Date(selected.date).toLocaleDateString('en-IN')} at {selected.timeSlot}</div>
              </div>
              <div className="mb-3">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginBottom: 4 }}>Reason Type</div>
                <div style={{ fontWeight: 600 }}>{selected.rejectionReasonType}</div>
              </div>
              <div className="mb-3">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginBottom: 4 }}>Detailed Reason</div>
                <div>{selected.rejectionReason}</div>
              </div>
              <div className="mb-3">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginBottom: 4 }}>Rejected By</div>
                <div>{selected.rejectedBy?.fullName ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginBottom: 4 }}>Rejected At</div>
                <div>{selected.rejectedAt ? new Date(selected.rejectedAt).toLocaleString('en-IN') : '—'}</div>
              </div>
            </div>
          </div>
          <div className="modal-custom-footer">
            <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Close</button>
            <button className="btn btn-primary" style={{ borderRadius: 8 }}
              onClick={() => { setReschedForm({ date: '', timeSlot: '' }); setModal('reschedule'); }}>
              <i className="bi bi-calendar2-check me-1" />Reschedule
            </button>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {modal === 'reschedule' && selected && (
        <Modal title={`Reschedule — ${selected.patientName}`} onClose={() => setModal(null)}>
          <form onSubmit={handleReschedule}>
            <div className="modal-custom-body">
              <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                <i className="bi bi-info-circle me-2 text-info" />
                Previous slot: {new Date(selected.date).toLocaleDateString('en-IN')} at {selected.timeSlot}
              </div>
              <div className="mb-3">
                <label className="form-label">New Date *</label>
                <input type="date" className="form-control" style={{ borderRadius: 10 }} required
                  value={reschedForm.date} onChange={(e) => setReschedForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label">New Time Slot *</label>
                <select className="form-select" style={{ borderRadius: 10 }} required
                  value={reschedForm.timeSlot} onChange={(e) => setReschedForm((p) => ({ ...p, timeSlot: e.target.value }))}>
                  <option value="">Select time</option>
                  {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-calendar2-check me-1" />}Reschedule
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Generate Bill Modal */}
      {modal === 'generateBill' && (
        <Modal title="Generate Bill" onClose={() => setModal(null)}>
          <form onSubmit={handleGenerateBill}>
            <div className="modal-custom-body">
              {[
                { name: 'patientName', label: 'Patient Name *', placeholder: 'Full name', type: 'text' },
                { name: 'service',     label: 'Service *',       placeholder: 'e.g. Consultation, X-Ray', type: 'text' },
                { name: 'amount',      label: 'Amount (₹) *',    placeholder: 'e.g. 1500', type: 'number' },
              ].map(({ name, label, placeholder, type }) => (
                <div className="mb-3" key={name}>
                  <label className="form-label">{label}</label>
                  <input type={type} className="form-control" placeholder={placeholder} style={{ borderRadius: 10 }} required
                    value={billForm[name]} onChange={(e) => setBillForm((p) => ({ ...p, [name]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }}>
                <i className="bi bi-receipt me-1" />Generate
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Patient Modal */}
      {modal === 'editPatient' && selected && (
        <Modal title={`Edit — ${selected.patientName}`} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); toast('Patient details updated!', 'success'); setModal(null); }}>
            <div className="modal-custom-body">
              {['patientName', 'patientAge', 'patientPhone', 'patientEmail'].map((f) => (
                <div className="mb-3" key={f}>
                  <label className="form-label">{f.replace('patient', '').replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input className="form-control" defaultValue={selected[f]} style={{ borderRadius: 10 }} />
                </div>
              ))}
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }}><i className="bi bi-floppy me-1" />Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
