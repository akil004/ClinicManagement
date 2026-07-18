# MERN Clinic Management System


| Feature | Details |
|---------|---------|
| **No public sign-up** | The only public page is `/login`. Administrator, Doctor, and Receptionist accounts can no longer self-register. |
| **Admin-seeded Administrator** | The first Administrator account is created via `npm run seed:admin` (reads `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`). |
| **Employee Management** | Administrator can Add / Edit / Disable / Delete / Reset Password / View Details for Doctors and Receptionists. |
| **Temporary passwords + forced change** | New/reset accounts get a system-generated temporary password. First login redirects to `/change-password` and blocks all other routes (frontend **and** backend) until it's changed. |
| **Specialization Management** | Admin can Add / Edit / Delete specialization categories. 20 common categories (+ "Other") are seeded automatically on first run. |
| **Specialization-based booking wizard** | Receptionist flow: choose specialization → see only doctors in that specialization who are `Available` → pick date & time slot → enter patient info → book. |
| **Doctor search / filter / sort** | By specialization, department, availability, experience, fee, and name — both in Admin's Doctor Management and Receptionist's Doctor Directory. |
| **Specialization analytics** | Admin dashboard shows doctors-by-specialization, appointments-per-specialization, most-requested specialization, and a doctor availability summary. |
| **Doctor's own department/specialization + upcoming schedule** | Shown on the Doctor Dashboard overview and read-only profile. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router v6 |
| State | Context API (`AuthContext`) + React Hooks |
| UI | Bootstrap 5.3 + Bootstrap Icons (CDN) |
| HTTP | Axios with request/response interceptors |
| Backend | Node.js v18+ + Express 4 (ES6 modules) |
| Database | MongoDB Community Server (local) via Mongoose 8 |
| Auth | JWT — `authenticateUser` + `authorizeRoles(...roles)` + `blockIfMustChangePassword` |
| Passwords | bcryptjs, 10 salt rounds |

---

## Complete File Structure

```
project/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── seed/
│   │   ├── seedAdmin.js               NEW — creates/updates the Administrator (npm run seed:admin)
│   │   └── seedSpecializations.js     NEW — seeds default specialization categories (runs on boot)
│   ├── controllers/
│   │   ├── authController.js          login · change-password · me   (no public register)
│   │   ├── employeeController.js      NEW — Doctor & Receptionist CRUD + disable + reset password
│   │   ├── specializationController.js NEW — specialization CRUD
│   │   ├── appointmentController.js   full CRUD + reject/approve/complete
│   │   ├── dashboardController.js     per-role stats incl. specialization analytics
│   │   └── medicalRecordController.js CRUD + patient history aggregation
│   ├── middleware/
│   │   └── authMiddleware.js          authenticateUser · authorizeRoles · blockIfMustChangePassword
│   ├── models/
│   │   ├── User.js                    + doctor fields, isActive, mustChangePassword
│   │   ├── Specialization.js          NEW
│   │   ├── Appointment.js
│   │   └── MedicalRecord.js
│   ├── routes/
│   │   ├── authRoutes.js              /api/auth/login  /change-password  /me
│   │   ├── employeeRoutes.js          NEW — /api/employees/doctors|receptionists
│   │   ├── specializationRoutes.js    NEW — /api/specializations
│   │   ├── dashboardRoutes.js
│   │   ├── appointmentRoutes.js
│   │   └── medicalRecordRoutes.js
│   ├── .env
│   ├── package.json                   "type":"module" · npm run seed:admin
│   └── server.js
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                     RoleGate + ChangePasswordGate — no /signup route
        ├── index.css
        ├── api/axios.js
        ├── context/AuthContext.jsx     + mustChangePassword, clearMustChangePassword()
        ├── hooks/{usePagination,useDebounce}.js
        ├── components/
        │   ├── BookingWizard.jsx       NEW — 5-step specialization-based booking flow
        │   ├── DoctorScheduleModal.jsx NEW — read-only doctor schedule viewer
        │   ├── Toast.jsx / DashboardLayout.jsx / Pagination.jsx
        │   ├── RejectModal.jsx / AppointmentDetailModal.jsx / PatientHistoryModal.jsx
        │   └── RoleProtectedRoute.jsx / ProtectedRoute.jsx  (unused, kept for reference)
        └── pages/
            ├── Login.jsx                only public auth page
            ├── ChangePassword.jsx       NEW — forced first-login + voluntary password change
            ├── AdminDashboard.jsx       Employee Management + Specializations + analytics
            ├── DoctorDashboard.jsx      department/specialization + upcoming schedule + profile
            └── ReceptionDashboard.jsx   Doctor Directory + specialization Booking Wizard
```

---

## Prerequisites

- **Node.js** v18 or later
- **MongoDB Community Server** running locally on port 27017

Start MongoDB:
```bash
# Linux
sudo systemctl start mongod
# macOS
brew services start mongodb-community
# Windows — run as service or: mongod --dbpath "C:\data\db"
```

---

## Installation & First-Run Setup

### 1. Backend
```bash
cd project/backend
npm install
```

Edit `.env` and set the initial administrator credentials (defaults exist for local dev, but change them):
```
ADMIN_NAME=Hospital Administrator
ADMIN_EMAIL=admin@hospital.com
ADMIN_PASSWORD=Admin@12345
```

Seed the Administrator account (one-time, safe to re-run):
```bash
npm run seed:admin
```

Start the server:
```bash
npm run dev
```
Expected:
```
✅ MongoDB connected: mongodb://127.0.0.1:27017/hospital_management
🌱 Seeded 21 default specializations   (first run only)
🚀 Server running on http://localhost:5000
```

### 2. Frontend
```bash
cd project/frontend
npm install
npm run dev
```
Open `http://localhost:5173`

### 3. Log in
1. Go to `/login` and sign in with the seeded Administrator credentials.
2. From **Doctors** / **Receptionists**, click **Add Doctor** / **Add Receptionist** — a temporary password is generated and shown once. Share it with the staff member.
3. That staff member logs in with the temporary password and is forced to set a new one before reaching their dashboard.

---

## Authentication Workflow

- There is **no public sign-up**. `/signup` no longer exists.
- The Administrator account is seeded directly into the database (`npm run seed:admin`).
- Only the Administrator can create Doctor and Receptionist accounts, via **Employee Management**.
- New accounts (and password resets) receive a system-generated temporary password and `mustChangePassword: true`.
- On first login with a temporary password, the user is redirected to `/change-password` and **cannot** reach any dashboard or call any protected API until they change it (enforced by the `blockIfMustChangePassword` middleware on the backend, and by `RoleGate` on the frontend).
- Nobody can choose or change their own role — it's always fixed by which admin endpoint created the account.
- Disabling a Doctor/Receptionist (`isActive: false`) immediately blocks their login and any existing token.

---

## API Reference

All routes except `/api/auth/login` require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Access | Body |
|--------|-------|--------|------|
| POST | `/api/auth/login` | Public | `{email, password}` → `{token, user: {..., mustChangePassword}}` |
| POST | `/api/auth/change-password` | Authenticated | `{currentPassword, newPassword, confirmNewPassword}` |
| GET | `/api/auth/me` | Authenticated | Own profile (includes doctor fields when applicable) |

### Employee Management (administrator only, unless noted)

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/employees/doctors` | Also allowed for receptionist. Query: `search, specialization, department, availabilityStatus, minExperience, maxExperience, minFee, maxFee, status(active|disabled|all), sortBy(name|experience|fee|createdAt), sortDir(asc|desc), page, limit` |
| GET | `/api/employees/doctors/:id` | Also allowed for receptionist |
| POST | `/api/employees/doctors` | Creates doctor, returns `{employee, temporaryPassword}` |
| PUT | `/api/employees/doctors/:id` | Edit doctor fields |
| PATCH | `/api/employees/doctors/:id/disable` | `{isActive}` — toggles if omitted |
| PATCH | `/api/employees/doctors/:id/reset-password` | Returns new `{temporaryPassword}` |
| DELETE | `/api/employees/doctors/:id` | |
| GET/POST/PUT/PATCH/DELETE | `/api/employees/receptionists...` | Same shape, administrator-only throughout |

### Specializations

| Method | Route | Access |
|--------|-------|--------|
| GET | `/api/specializations` | Any authenticated role. `?activeOnly=true` to filter |
| POST | `/api/specializations` | administrator — `{name, description}` |
| PUT | `/api/specializations/:id` | administrator — `{name, description, isActive}` |
| DELETE | `/api/specializations/:id` | administrator — blocked if doctors still use it |

### Dashboard

| Method | Route | Role |
|--------|-------|------|
| GET | `/api/dashboard/admin` | administrator — incl. `doctorsBySpecialization`, `appointmentsBySpecialization`, `mostRequestedSpecialization`, `availabilitySummary` |
| GET | `/api/dashboard/doctor` | doctor — incl. `department`, `specialization`, `upcomingSchedule` |
| GET | `/api/dashboard/reception` | receptionist |

### Appointments

| Method | Route | Who | Notes |
|--------|-------|-----|-------|
| GET | `/api/appointments` | all | `?status=pending&date=2025-07-07&page=1&limit=20` |
| GET | `/api/appointments/:id` | all | |
| POST | `/api/appointments` | receptionist, admin | `{patientName, doctorId, doctorName, date, timeSlot, ...}` |
| PATCH | `/api/appointments/:id/approve` | doctor | own appointments only |
| PATCH | `/api/appointments/:id/reject` | doctor | requires `rejectionReasonType` |
| PATCH | `/api/appointments/:id/complete` | doctor | |
| PATCH | `/api/appointments/:id/cancel` | receptionist, admin | |
| PATCH | `/api/appointments/:id/reschedule` | receptionist, admin | `{date, timeSlot}` |
| GET | `/api/appointments/stats` | administrator | |

### Medical Records

| Method | Route | Who |
|--------|-------|-----|
| GET | `/api/medical-records?patientPhone=xxx` | all |
| GET | `/api/medical-records/patient/:patientPhone` | all |
| POST | `/api/medical-records` | doctor, admin |
| PUT | `/api/medical-records/:id` | doctor (own records only) |

---

## Specialization-Based Booking Workflow

```
Receptionist clicks "Book by Specialization"
        │
        ▼
Step 1 — choose a specialization (from admin-managed list)
        │
        ▼
Step 2 — only doctors in that specialization are shown
        │
        ▼
Step 3 — further filtered to Availability Status = "Available"
        │
        ▼
Step 4 — pick a date + one of the doctor's available time slots
        │
        ▼
Step 5 — enter patient info → POST /api/appointments
```

---

## Notes

- MongoDB database `hospital_management` is created automatically on first connection.
- The 20 default specialization categories (+ "Other") are seeded once, automatically, the first time the server starts against an empty collection. The Administrator can add, rename, deactivate, or delete them afterwards from **Specializations**.
- Deleting a specialization is blocked while any doctor is still assigned to it — deactivate it instead, or reassign the doctors first.
- Role-based route protection is enforced on **both** the frontend (`RoleGate`) and backend (`authorizeRoles`) for every dashboard and API route.
