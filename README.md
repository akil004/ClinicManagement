# MERN Hospital Management System v7
### Patient Registration Workflow · Full Clinical Data Model (EHR) · Live Doctor Presence · Admin-Provisioned Staff Accounts · Specialization-Based Booking

---

## What's New in v7

| Feature | Details |
|---------|---------|
| **Patient Registration workflow** | New patients are created as **Pending** and must be **Approved** before an appointment can be booked for them. Administrator/Receptionist get separate **Pending Registrations** / **Registered Patients** / **Rejected** views with a full approve/reject audit trail (reason, who, when). |
| **Registration ≠ Appointment** | `Patient` (registration) and `Appointment` (booking) are fully separate MongoDB collections. `Appointment.patientId` references an already-*registered* `Patient`; registering someone never creates an appointment. |
| **Full clinical data model (EHR)** | Six new/rewritten collections — `Patient`, `MedicalRecord`, `Prescription`, `LabReport`, `PatientDocument`, `Billing` — every one referencing real patient/doctor/appointment ObjectIds. Nothing is hard-coded in React; everything is read from MongoDB via the API. |
| **Patient History aggregation** | `GET /api/patients/:id/history` combines appointments, medical records, prescriptions, lab reports, documents, and (role-permitting) billing into one chronological view for the doctor's "open patient" screen. |
| **Live Doctor presence** | Doctors are `isOnline` based on real login/heartbeat activity, not a hard-coded flag. A configurable inactivity timeout (`DOCTOR_ONLINE_TIMEOUT_MINUTES`) auto-marks a quiet doctor offline. Replaces the old standalone "Online Doctors" page — it's now a **Live Doctors** card directly on the Administrator Dashboard overview. |
| **Settings replaces Profile** | The separate "Profile" sidebar item is gone in all three roles. Account info + change-password now live under **Settings**. |
| **Server-computed billing** | `totalAmount` / `amountDue` are always calculated on the backend (`utils/billingHelper.js`) — the frontend can never dictate a bill total. |
| **Centralized constants & helpers** | Status/role/message strings live in `backend/constants/*.js` (mirrored on the frontend); date, age, billing, pagination, ID-generation, and validation logic all live in `backend/utils/*.js` — no scattered literals or copy-pasted regexes. |
| **Timezone-safe dates everywhere** | `utils/dateHelper.js` (backend) and `utils/dateHelper.js` (frontend) both resolve "today" via `APP_TIMEZONE`, so appointment dates never shift by a day regardless of server/browser timezone. Past-date booking is blocked on both ends. |
| **Realistic seed data** | `npm run seed` provisions the admin, 21 specializations, 5 doctors, 3 receptionists, 20 patients (mixed pending/registered), and 24+ appointments with medical records/prescriptions/lab reports/bills for every completed visit — all cross-referenced by real ObjectIds. |

*(Carried forward from v4: no public sign-up, admin-provisioned staff accounts with forced password change, specialization management, the specialization-based booking wizard, and doctor search/filter/sort.)*

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

## Data Model

```
User (auth + role-specific profile fields embedded — see note below)
 │
 ├─ role: administrator | doctor | receptionist
 └─ doctor-only: department, specialization, qualification, experience,
                 consultationFee, availabilityStatus, availableDays,
                 availableTimeSlots, isOnline, lastLoginAt, lastActiveAt

Patient  (registration record — registrationStatus: pending|registered|rejected)
 │
 ├──▶ Appointment.patientId
 ├──▶ MedicalRecord.patientId
 ├──▶ Prescription.patientId
 ├──▶ LabReport.patientId
 ├──▶ PatientDocument.patientId
 └──▶ Billing.patientId

Appointment  (own status: pending|approved|rejected|completed|cancelled|rescheduled)
 │
 ├──▶ MedicalRecord.appointmentId
 ├──▶ Prescription.appointmentId
 └──▶ Billing.appointmentId

MedicalRecord ──▶ Prescription.medicalRecordId
Specialization ──▶ Appointment.specializationId, User.specialization (by name)
```

> **Architecture note:** Doctor/Receptionist profile fields are stored directly on the `User` document (role-specific fields simply go unused for other roles) rather than in separate `Doctor`/`Receptionist` collections. This was a deliberate scoping decision to avoid a high-risk rewrite of auth, employee management, and every doctor-listing screen — all the data is still real, persisted, and queryable, just not split into three collections. Flagging it here in case that split is wanted later.

---

## Complete File Structure

```
project/
├── backend/
│   ├── config/
│   │   ├── db.js                      Mongo connection
│   │   └── env.js                     Centralized env config (port, JWT, timeouts, pagination, admin seed creds…)
│   ├── constants/
│   │   ├── roles.js                   USER_ROLES
│   │   ├── patientStatus.js           PATIENT_STATUS (pending/registered/rejected)
│   │   ├── appointmentStatus.js       APPOINTMENT_STATUS + REJECTION_REASON_TYPES
│   │   ├── billingStatus.js           PAYMENT_STATUS + PAYMENT_METHOD
│   │   ├── labReportStatus.js         LAB_REPORT_STATUS
│   │   ├── documentTypes.js           DOCUMENT_TYPE
│   │   ├── messages.js                Centralized response message strings
│   │   ├── status.js                  Backward-compatible barrel over the files above (+ DOCTOR_STATUS, AVAILABILITY_STATUS, DAYS_OF_WEEK)
│   │   └── index.js                   Barrel export of everything
│   ├── utils/
│   │   ├── dateHelper.js              formatDate/formatDateTime/isPastDate/isToday/dayRangeQuery… (APP_TIMEZONE-aware)
│   │   ├── ageHelper.js               calculateAge(dateOfBirth) — dateOfBirth is the source of truth, not the cached age field
│   │   ├── billingHelper.js           calculateBillTotals / derivePaymentStatus — backend always computes money math
│   │   ├── idHelper.js                generatePatientId/generateAppointmentId/generateRecordId/generatePrescriptionId/generateReportId/generateDocumentId/generateBillId/generateSpecializationId/generateTempPassword
│   │   ├── paginationHelper.js        parsePagination / buildPaginationMeta
│   │   ├── responseHelper.js          sendSuccess / sendError / asyncHandler
│   │   └── validationHelper.js        isValidEmail / isValidPhone / isNonEmptyString / isPositiveNumber
│   ├── models/
│   │   ├── User.js                    Auth + doctor/receptionist profile fields + isOnline/lastLoginAt/lastActiveAt
│   │   ├── Patient.js                 Registration record — identification, contact, emergency contact, medical history, registrationStatus
│   │   ├── Appointment.js             appointmentId, patientId ref, specializationId ref, rejection/cancellation/reschedule/completion audit fields
│   │   ├── MedicalRecord.js           patientId/doctorId/appointmentId refs, vitals (auto-computed BMI), diagnosis, follow-up
│   │   ├── Prescription.js            medicines[] array, refs to patient/doctor/appointment/medicalRecord
│   │   ├── LabReport.js               result/interpretation/status(pending|completed|reviewed)
│   │   ├── PatientDocument.js         file reference/URL (not the file itself — no GridFS in this project)
│   │   ├── Billing.js                 itemised charges + server-computed totalAmount/amountDue/paymentStatus
│   │   └── Specialization.js          specializationId, name, department
│   ├── controllers/
│   │   ├── authController.js          login/logout/heartbeat (drives doctor isOnline) · change-password · me
│   │   ├── patientController.js       create/pending/registered/rejected/approve/reject/search/update
│   │   ├── patientHistoryController.js  Aggregates appointments+records+prescriptions+labs+documents(+billing) for one patient
│   │   ├── appointmentController.js   full CRUD + approve/reject/complete/cancel/reschedule + stats
│   │   ├── medicalRecordController.js Create-per-consultation (never overwrites history)
│   │   ├── prescriptionController.js  Create/update/list, one-or-more medicines per prescription
│   │   ├── labReportController.js     Create/update/review
│   │   ├── patientDocumentController.js  Create/list/delete (stores fileUrl reference only)
│   │   ├── billingController.js       Create/update — totals always recomputed server-side
│   │   ├── employeeController.js      Doctor & Receptionist CRUD + disable + reset password + getOnlineDoctors
│   │   ├── specializationController.js Specialization CRUD
│   │   └── dashboardController.js     Per-role stats incl. specialization analytics
│   ├── middleware/
│   │   └── authMiddleware.js          authenticateUser · authorizeRoles · blockIfMustChangePassword
│   ├── routes/
│   │   ├── authRoutes.js              /api/auth/login · /logout · /heartbeat · /change-password · /me
│   │   ├── patientRoutes.js           /api/patients/... incl. /:id/history
│   │   ├── appointmentRoutes.js
│   │   ├── medicalRecordRoutes.js
│   │   ├── prescriptionRoutes.js
│   │   ├── labReportRoutes.js
│   │   ├── patientDocumentRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── employeeRoutes.js          incl. /doctors/online-status (admin-only, used by Live Doctors card)
│   │   ├── specializationRoutes.js
│   │   └── dashboardRoutes.js
│   ├── seed/
│   │   ├── seedAll.js                 Orchestrates every seed script below, in order (npm run seed)
│   │   ├── seedAdmin.js               Creates/updates the Administrator (npm run seed:admin)
│   │   ├── seedSpecializations.js     21 default specialization categories (runs on server boot too)
│   │   ├── seedStaff.js               5 sample doctors + 3 sample receptionists
│   │   ├── seedPatients.js            20 sample patients, mixed pending/registered
│   │   └── seedClinicalData.js        24+ appointments + medical records/prescriptions/lab reports/bills for completed visits
│   ├── .env / .env.example
│   ├── package.json                   "type":"module" · npm run seed
│   └── server.js                      Route mounting + doctor auto-offline sweep
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env / .env.example            VITE_API_URL
    └── src/
        ├── main.jsx
        ├── App.jsx                     RoleGate + ChangePasswordGate — no /signup route
        ├── index.css
        ├── api/
        │   ├── axios.js                Reads baseURL from VITE_API_URL
        │   └── patients.js             Patient registration API calls
        ├── constants/index.js          Mirrors backend constants (roles/statuses/messages)
        ├── utils/dateHelper.js         Mirrors backend dateHelper (APP timezone-aware formatting/validation)
        ├── context/AuthContext.jsx     + mustChangePassword, logout() pings /api/auth/logout
        ├── hooks/{usePagination,useDebounce}.js
        ├── components/
        │   ├── PatientRegistry.jsx     Pending/Registered/Rejected tabs — shared by Admin & Receptionist
        │   ├── LiveDoctorsCard.jsx     "Live Doctors" widget on the Admin Dashboard overview
        │   ├── PatientHistoryModal.jsx Tabbed medical history viewer (backed by /api/patients/:id/history)
        │   ├── BookingWizard.jsx       5-step specialization-based booking flow — Step 5 selects a *registered* patient
        │   ├── DoctorScheduleModal.jsx Read-only doctor schedule viewer
        │   ├── Modal.jsx               Shared modal shell
        │   ├── Toast.jsx / DashboardLayout.jsx / Pagination.jsx
        │   ├── RejectModal.jsx / AppointmentDetailModal.jsx
        │   └── RoleProtectedRoute.jsx / ProtectedRoute.jsx  (unused, kept for reference)
        └── pages/
            ├── Login.jsx                Only public auth page
            ├── ChangePassword.jsx       Forced first-login + voluntary password change
            ├── AdminDashboard.jsx       Pending Registrations · Patients · Live Doctors · analytics · Settings (no Profile)
            ├── DoctorDashboard.jsx      Appointments · patient-linked medical records/prescriptions · heartbeat ping · Settings
            └── ReceptionDashboard.jsx   Pending Registrations · Patients · specialization Booking Wizard · Settings
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
cp .env.example .env   # then edit values below
```

Key values to set in `.env` (see `.env.example` for the full list):
```
MONGO_URI=mongodb://127.0.0.1:27017/hospital_management
JWT_SECRET=replace_this_with_a_long_random_secret_string
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata
DOCTOR_ONLINE_TIMEOUT_MINUTES=10
ADMIN_NAME=Hospital Administrator
ADMIN_EMAIL=admin@hospital.com
ADMIN_PASSWORD=Admin@12345
```

Seed the database (administrator + specializations + sample doctors/receptionists/patients/appointments/clinical data — safe to re-run, idempotent):
```bash
npm run seed
```

Or seed just the administrator, if you only want a clean/empty database otherwise:
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
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev
```
Open `http://localhost:5173`

### 3. Log in
1. Go to `/login` and sign in with the seeded Administrator credentials (from `.env`).
2. If you ran `npm run seed`, doctor/receptionist accounts are already created — see [Seeded Accounts](#seeded-accounts) below. Otherwise, from **Doctors** / **Receptionists**, click **Add Doctor** / **Add Receptionist** — a temporary password is generated and shown once.
3. New staff log in with the temporary password and are forced to set a new one before reaching their dashboard.

---

## Seeded Accounts

Running `npm run seed` creates these accounts (all with the temporary password `Staff@12345`, which must be changed on first login):

| Role | Email | Specialization |
|------|-------|-----------------|
| Doctor | anand.krishnan@hospital.com | Cardiologist |
| Doctor | sneha.reddy@hospital.com | General Physician |
| Doctor | vivek.nair@hospital.com | Orthopedic |
| Doctor | kavitha.suresh@hospital.com | Pediatrician |
| Doctor | rajesh.pillai@hospital.com | Dermatologist |
| Receptionist | meera.b@hospital.com | — |
| Receptionist | sanjay.v@hospital.com | — |
| Receptionist | priyanka.d@hospital.com | — |

The Administrator account uses whatever `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

---

## Authentication & Presence Workflow

- There is **no public sign-up**. `/signup` does not exist.
- The Administrator account is seeded directly into the database (`npm run seed:admin`, or `npm run seed`).
- Only the Administrator can create Doctor and Receptionist accounts, via **Employee Management**.
- New accounts (and password resets) receive a system-generated temporary password and `mustChangePassword: true`. The user is redirected to `/change-password` and cannot reach any dashboard or call any protected API until they change it — enforced by `blockIfMustChangePassword` on the backend and `RoleGate` on the frontend.
- Disabling a Doctor/Receptionist (`isActive: false`) immediately blocks their login and any existing token.
- **Doctor online presence:** login sets `isOnline=true` + `lastLoginAt`/`lastActiveAt`; the Doctor Dashboard pings `POST /api/auth/heartbeat` every 60s while open; logout sets `isOnline=false`. A backend sweep (`server.js`) auto-flips any doctor whose `lastActiveAt` has exceeded `DOCTOR_ONLINE_TIMEOUT_MINUTES` back to offline, so a closed browser tab doesn't leave a doctor stuck "online" forever.

---

## Patient Registration Workflow

```
Receptionist/Administrator clicks "Register Patient"
        │
        ▼
Patient created with registrationStatus = "pending"
        │                     (does NOT appear in Registered Patients,
        │                      no appointment is created)
        ▼
Administrator/Receptionist reviews in "Pending Registrations"
        │
        ├── Approve ──▶ registrationStatus = "registered" ──▶ now bookable
        │
        └── Reject  ──▶ registrationStatus = "rejected"
                          (rejectionReason/rejectedBy/rejectedAt stored —
                           record is kept, never deleted, for audit purposes)
```

An appointment can only be booked for a patient whose `registrationStatus` is `"registered"` — enforced in `appointmentController.createAppointment`, and reflected in the UI by `BookingWizard`'s patient-search step (it only searches registered patients).

---

## API Reference

All routes except `/api/auth/login` require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Access | Body |
|--------|-------|--------|------|
| POST | `/api/auth/login` | Public | `{email, password}` → `{token, user: {..., mustChangePassword}}` |
| POST | `/api/auth/logout` | Authenticated | Marks a doctor offline immediately |
| POST | `/api/auth/heartbeat` | Authenticated (doctor) | Refreshes `lastActiveAt` |
| POST | `/api/auth/change-password` | Authenticated | `{currentPassword, newPassword, confirmNewPassword}` |
| GET | `/api/auth/me` | Authenticated | Own profile (includes doctor fields when applicable) |

### Patients (registration)

| Method | Route | Access | Notes |
|--------|-------|--------|-------|
| POST | `/api/patients` | admin, receptionist | Creates with `registrationStatus: "pending"` |
| GET | `/api/patients/pending` | admin, receptionist | `?search=&page=&limit=` |
| GET | `/api/patients/registered` | admin, receptionist, doctor | `?search=&page=&limit=` |
| GET | `/api/patients/rejected` | admin, receptionist | |
| GET | `/api/patients/search?q=` | admin, receptionist, doctor | Registered patients only — used by the booking flow |
| GET | `/api/patients/:id` | admin, receptionist, doctor | |
| GET | `/api/patients/:id/history` | admin, receptionist, doctor | Aggregated history; billing omitted for doctors |
| PUT | `/api/patients/:id` | admin, receptionist | Edit registration details |
| PUT | `/api/patients/:id/approve` | admin, receptionist | |
| PUT | `/api/patients/:id/reject` | admin, receptionist | `{rejectionReason}` required |

### Employee Management (administrator only, unless noted)

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/employees/doctors` | Also allowed for receptionist. Query: `search, specialization, department, availabilityStatus, minExperience, maxExperience, minFee, maxFee, status(active\|disabled\|all), sortBy(name\|experience\|fee\|createdAt), sortDir(asc\|desc), page, limit` |
| GET | `/api/employees/doctors/online-status` | administrator only — `?filter=online\|offline\|all`. Backs the **Live Doctors** dashboard card |
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
| POST | `/api/specializations` | administrator — `{name, description, department}` |
| PUT | `/api/specializations/:id` | administrator — `{name, description, department, isActive}` |
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
| GET | `/api/appointments` | all | `?status=pending&date=2026-08-27&page=1&limit=20` |
| GET | `/api/appointments/:id` | all | |
| POST | `/api/appointments` | receptionist, admin | `{patientId, doctorId, doctorName, date, timeSlot, complaint, notes}` — `patientId` must reference a **registered** patient; past dates rejected |
| PATCH | `/api/appointments/:id/approve` | doctor | own appointments only |
| PATCH | `/api/appointments/:id/reject` | doctor | requires `rejectionReasonType` |
| PATCH | `/api/appointments/:id/complete` | doctor | records `completedBy`/`completedAt` |
| PATCH | `/api/appointments/:id/cancel` | receptionist, admin | records `cancellationReason`/`cancelledBy`/`cancelledAt` |
| PATCH | `/api/appointments/:id/reschedule` | receptionist, admin | `{date, timeSlot}` |
| GET | `/api/appointments/stats` | administrator | |

### Medical Records

| Method | Route | Who | Notes |
|--------|-------|-----|-------|
| GET | `/api/medical-records?patientId=&doctorId=` | all | |
| POST | `/api/medical-records` | doctor | Creates a **new** record per consultation — never overwrites history |
| PUT | `/api/medical-records/:id` | doctor (own records only) | |

### Prescriptions

| Method | Route | Who |
|--------|-------|-----|
| GET | `/api/prescriptions?patientId=&doctorId=` | all |
| GET | `/api/prescriptions/:id` | all |
| POST | `/api/prescriptions` | doctor — `{patientId, medicalRecordId?, diagnosis, medicines: [{medicineName, dosage, frequency, route, duration, quantity, instructions}]}` |
| PUT | `/api/prescriptions/:id` | doctor (own only) |

### Lab Reports

| Method | Route | Who |
|--------|-------|-----|
| GET | `/api/lab-reports?patientId=&status=` | all |
| POST | `/api/lab-reports` | doctor, admin |
| PUT | `/api/lab-reports/:id` | doctor, admin |
| PUT | `/api/lab-reports/:id/review` | doctor |

### Patient Documents

| Method | Route | Who | Notes |
|--------|-------|-----|-------|
| GET | `/api/documents?patientId=&documentType=` | all | |
| POST | `/api/documents` | admin, receptionist, doctor | Stores `fileUrl` reference only — no file bytes in MongoDB |
| DELETE | `/api/documents/:id` | admin, receptionist | |

### Billing

| Method | Route | Who | Notes |
|--------|-------|-----|-------|
| GET | `/api/billing?patientId=&paymentStatus=` | all | |
| POST | `/api/billing` | admin, receptionist | `totalAmount`/`amountDue`/`paymentStatus` always computed server-side |
| PUT | `/api/billing/:id` | admin, receptionist | Recomputes totals on every edit |

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
Step 4 — pick a date + one of the doctor's available time slots (past dates blocked)
        │
        ▼
Step 5 — search & select an already-REGISTERED patient → POST /api/appointments
```

---

## Notes

- MongoDB database `hospital_management` is created automatically on first connection.
- The 21 default specialization categories (+ "Other") are seeded once, automatically, the first time the server starts against an empty collection. The Administrator can add, rename, deactivate, or delete them afterwards from **Specializations**.
- Deleting a specialization is blocked while any doctor is still assigned to it — deactivate it instead, or reassign the doctors first.
- Role-based route protection is enforced on **both** the frontend (`RoleGate`) and backend (`authorizeRoles`) for every dashboard and API route.
- A rejected patient registration or a cancelled/rejected appointment is **never deleted** — both keep a full audit trail (`rejectedBy`, `rejectedAt`, `rejectionReason` / `cancelledBy`, `cancelledAt`, `cancellationReason`).
- All dates are handled through `utils/dateHelper.js` on both ends (never `new Date(string)` ad hoc) so appointment dates can't shift by a day across timezones, and past-date bookings are rejected consistently on the client and server.
