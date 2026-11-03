import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';
import patientsApi from '../api/patients.js';
import useDebounce from '../hooks/useDebounce.js';
import { todayInputValue, isPastDate, formatDate } from '../utils/dateHelper.js';

const DEFAULT_TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

/**
 * BookingWizard — implements the Receptionist appointment booking workflow
 * requested by the hospital:
 *   1. Select Doctor Specialization
 *   2. Show only doctors in that specialization
 *   3. Show only doctors whose Availability Status is "Available"
 *   4. Show the doctor's available dates/time slots
 *   5. Select an already-REGISTERED patient (registration and booking are
 *      kept as separate steps — a patient must be registered and approved
 *      before an appointment can be booked for them)
 *
 * `initialDoctor` lets a caller jump straight to step 3 (e.g. "Book" from a
 * doctor row that's already been searched/filtered elsewhere).
 */
export default function BookingWizard({ specializations, onClose, onBooked, toast, initialDoctor }) {
  const [step, setStep] = useState(initialDoctor ? 3 : 1);
  const [specialization, setSpecialization] = useState(initialDoctor?.specialization ?? '');
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctor, setDoctor] = useState(initialDoctor ?? null);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [complaint, setComplaint] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Step 5: search for an existing REGISTERED patient ───
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const debouncedPatientQuery = useDebounce(patientQuery, 300);

  const fetchAvailableDoctors = useCallback(async (spec) => {
    setDoctorsLoading(true);
    try {
      const { data } = await api.get('/employees/doctors', {
        params: { specialization: spec, availabilityStatus: 'Available', status: 'active', limit: 50 },
      });
      setDoctors(data.employees ?? []);
    } catch {
      toast?.('Could not load doctors for this specialization', 'error');
    } finally {
      setDoctorsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (specialization && step === 2) fetchAvailableDoctors(specialization);
  }, [specialization, step, fetchAvailableDoctors]);

  useEffect(() => {
    if (step !== 5 || !debouncedPatientQuery.trim()) { setPatientResults([]); return; }
    let cancelled = false;
    setPatientSearching(true);
    patientsApi.search(debouncedPatientQuery.trim())
      .then(({ data }) => { if (!cancelled) setPatientResults(data.patients ?? []); })
      .catch(() => { if (!cancelled) toast?.('Could not search patients', 'error'); })
      .finally(() => { if (!cancelled) setPatientSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedPatientQuery, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseSpecialization = (name) => { setSpecialization(name); setStep(2); };
  const chooseDoctor = (d) => { setDoctor(d); setTimeSlot(''); setStep(4); };

  const timeSlotOptions = doctor?.availableTimeSlots?.length ? doctor.availableTimeSlots : DEFAULT_TIME_SLOTS;

  const goToPatientInfo = () => {
    if (!date || !timeSlot) { toast?.('Please choose a date and time slot', 'error'); return; }
    if (isPastDate(date)) { toast?.('Cannot book an appointment in the past', 'error'); return; }
    setStep(5);
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { toast?.('Please select a registered patient', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/appointments', {
        patientId: selectedPatient._id,
        doctorId: doctor._id,
        doctorName: doctor.fullName,
        date, timeSlot, complaint,
      });
      toast?.('Appointment booked ✓', 'success');
      onBooked?.();
    } catch (err) {
      toast?.(err.response?.data?.message ?? 'Could not book appointment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const STEP_LABELS = ['Specialization', 'Doctor', 'Availability', 'Date & Time', 'Select Patient'];

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-custom" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-custom-header">
          <h5 className="modal-custom-title">Book Appointment by Specialization</h5>
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {/* Step indicator */}
        <div className="d-flex gap-2 px-3 pt-3" style={{ fontSize: 12 }}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === (step === 3 ? 2 : step === 5 ? 4 : step) || (n === 2 && step === 3);
            return (
              <div key={label} className="d-flex align-items-center gap-1" style={{ opacity: n <= (step >= 4 ? 4 : step) ? 1 : 0.4 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: n <= (step >= 4 ? 4 : step) ? '#2563eb' : '#e2e8f0',
                  color: n <= (step >= 4 ? 4 : step) ? '#fff' : '#64748b', fontWeight: 700, fontSize: 11,
                }}>{n}</span>
                <span className="d-none d-md-inline">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1: choose specialization */}
        {step === 1 && (
          <div className="modal-custom-body">
            <p className="text-muted mb-3" style={{ fontSize: 13.5 }}>Select the specialization the patient needs.</p>
            <div className="row g-2">
              {specializations.filter((s) => s.isActive).map((s) => (
                <div className="col-md-4 col-6" key={s._id}>
                  <button type="button" className="btn btn-outline-primary w-100" style={{ borderRadius: 10, fontSize: 13 }}
                    onClick={() => chooseSpecialization(s.name)}>
                    {s.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: choose doctor (already filtered to specialization + Available) */}
        {(step === 2 || step === 3) && (
          <div className="modal-custom-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="text-muted mb-0" style={{ fontSize: 13.5 }}>
                Available <strong>{specialization}</strong> doctors
              </p>
              <button className="btn btn-sm btn-link p-0" onClick={() => setStep(1)}>Change specialization</button>
            </div>
            {doctorsLoading
              ? <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
              : doctors.length === 0
                ? <p className="text-muted text-center py-4 mb-0">No available doctors in this specialization right now.</p>
                : (
                  <div className="d-flex flex-column gap-2">
                    {doctors.map((d) => (
                      <button key={d._id} type="button" onClick={() => chooseDoctor(d)}
                        className="d-flex justify-content-between align-items-center"
                        style={{ border: '1px solid #e2e4f0', borderRadius: 10, padding: '10px 14px', background: '#fafaff', textAlign: 'left' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{d.fullName}</div>
                          <div style={{ fontSize: 12.5, color: '#64748b' }}>{d.department || d.specialization} · {d.experience != null ? `${d.experience} yrs exp.` : ''}</div>
                        </div>
                        <div className="text-end">
                          {d.consultationFee != null && <div style={{ fontWeight: 700, fontSize: 13 }}>₹{d.consultationFee}</div>}
                          <span className="badge-status badge-active">Available</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
            }
          </div>
        )}

        {/* Step 4: date & time (doctor already chosen) */}
        {step === 4 && doctor && (
          <div className="modal-custom-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="mb-0" style={{ fontSize: 13.5 }}>
                Booking with <strong>{doctor.fullName}</strong> ({doctor.specialization})
              </p>
              {!initialDoctor && <button className="btn btn-sm btn-link p-0" onClick={() => setStep(2)}>Change doctor</button>}
            </div>
            {doctor.availableDays?.length > 0 && (
              <div className="mb-3" style={{ fontSize: 12.5, color: '#64748b' }}>
                <i className="bi bi-info-circle me-1" />Works on: {doctor.availableDays.join(', ')}
              </div>
            )}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Date *</label>
                <input type="date" className="form-control" style={{ borderRadius: 10 }} required
                  min={todayInputValue()} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Time Slot *</label>
                <select className="form-select" style={{ borderRadius: 10 }} required
                  value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                  <option value="">Select time</option>
                  {timeSlotOptions.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: select a REGISTERED patient & confirm */}
        {step === 5 && (
          <form onSubmit={handleBook}>
            <div className="modal-custom-body modal-custom-scroll">
              <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                <i className="bi bi-info-circle me-2 text-info" />
                {doctor.fullName} ({doctor.specialization}) — {date ? formatDate(date) : ''} at {timeSlot}
              </div>

              {!selectedPatient ? (
                <>
                  <label className="form-label">Search Registered Patient *</label>
                  <input
                    className="form-control mb-2"
                    style={{ borderRadius: 10 }}
                    placeholder="Search by name, phone, or patient ID…"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    autoFocus
                  />
                  <p className="text-muted mb-2" style={{ fontSize: 12.5 }}>
                    <i className="bi bi-info-circle me-1" />
                    Only patients whose registration has been approved appear here. New patients must
                    be registered and approved first, from Pending Registrations.
                  </p>
                  {patientSearching ? (
                    <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary" /></div>
                  ) : patientQuery.trim() && patientResults.length === 0 ? (
                    <p className="text-muted text-center py-3 mb-0">No registered patients match that search.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {patientResults.map((p) => (
                        <button key={p._id} type="button" onClick={() => setSelectedPatient(p)}
                          className="d-flex justify-content-between align-items-center"
                          style={{ border: '1px solid #e2e4f0', borderRadius: 10, padding: '10px 14px', background: '#fafaff', textAlign: 'left' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.fullName}</div>
                            <div style={{ fontSize: 12.5, color: '#64748b' }}>{p.patientId} · {p.phone}{p.age ? ` · ${p.age} yrs` : ''}</div>
                          </div>
                          <span className="badge-status badge-active">Registered</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, padding: '12px 16px' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedPatient.fullName}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>
                        {selectedPatient.patientId} · {selectedPatient.phone}
                        {selectedPatient.age ? ` · ${selectedPatient.age} yrs` : ''}
                        {selectedPatient.gender ? ` · ${selectedPatient.gender}` : ''}
                        {selectedPatient.bloodGroup ? ` · ${selectedPatient.bloodGroup}` : ''}
                      </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-link p-0" onClick={() => { setSelectedPatient(null); setPatientQuery(''); }}>
                      Change
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <label className="form-label">Chief Complaint</label>
                <textarea rows={2} className="form-control" style={{ borderRadius: 10 }}
                  value={complaint} onChange={(e) => setComplaint(e.target.value)} />
              </div>
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setStep(4)}>Back</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }} disabled={saving || !selectedPatient}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-calendar-check me-1" />}Book Appointment
              </button>
            </div>
          </form>
        )}

        {/* Footer nav for steps 1-4 */}
        {step !== 5 && (
          <div className="modal-custom-footer">
            <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={onClose}>Cancel</button>
            {step === 4 && (
              <button type="button" className="btn btn-primary" style={{ borderRadius: 8 }} onClick={goToPatientInfo}>
                Next: Select Patient
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
