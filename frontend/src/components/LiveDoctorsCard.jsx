import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';
import { formatDateTime } from '../utils/dateHelper.js';

const STATUS_DOT = {
  Available: '🟢',
  Busy:      '🟡',
  'On Leave': '🔴',
};

/**
 * LiveDoctorsCard — "Live Doctors" section on the Administrator Dashboard
 * overview. Shows only doctors who are *currently online*, derived from
 * real login/heartbeat activity (isOnline + lastActiveAt vs the
 * configurable DOCTOR_ONLINE_TIMEOUT_MINUTES) via the existing
 * GET /api/employees/doctors/online-status endpoint — no separate
 * mechanism or duplicate model, per project convention.
 *
 * Refreshes every 30s so admins see live status without reloading the page.
 */
export default function LiveDoctorsCard() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOnlineDoctors = useCallback(async () => {
    try {
      const { data } = await api.get('/employees/doctors/online-status', { params: { filter: 'online' } });
      setDoctors(data.doctors ?? []);
    } catch {
      // Non-critical widget — fail quietly and keep the last-known list.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineDoctors();
    const interval = setInterval(fetchOnlineDoctors, 30000);
    return () => clearInterval(interval);
  }, [fetchOnlineDoctors]);

  return (
    <div className="content-card h-100">
      <div className="content-card-header d-flex align-items-center justify-content-between">
        <h6 className="content-card-title mb-0">Live Doctors</h6>
        {!loading && (
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            🟢 {doctors.length} online
          </span>
        )}
      </div>
      <div className="content-card-body">
        {loading ? (
          <p className="text-muted mb-0" style={{ fontSize: 13.5 }}>Loading…</p>
        ) : doctors.length === 0 ? (
          <p className="text-muted mb-0" style={{ fontSize: 13.5 }}>No doctors are currently online.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {doctors.map((d) => (
              <div key={d._id} className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: 40, height: 40, borderRadius: '50%', background: '#e0e7ff', color: '#3730a3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 15, flexShrink: 0,
                  }}
                >
                  {d.fullName?.charAt(0) ?? '?'}
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2">
                    <strong style={{ fontSize: 14 }}>Dr. {d.fullName}</strong>
                    <span style={{ fontSize: 12 }}>🟢 Online</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.specialization ?? 'General'} · {STATUS_DOT[d.availabilityStatus] ?? ''} {d.availabilityStatus ?? '—'}
                    {d.email ? ` · ${d.email}` : ''}
                  </div>
                  {d.lastActiveAt && (
                    <div className="text-muted" style={{ fontSize: 11.5 }}>
                      Last active: {formatDateTime(d.lastActiveAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
