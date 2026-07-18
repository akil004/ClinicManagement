import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login              from './pages/Login.jsx';
import ChangePassword      from './pages/ChangePassword.jsx';
import AdminDashboard     from './pages/AdminDashboard.jsx';
import DoctorDashboard    from './pages/DoctorDashboard.jsx';
import ReceptionDashboard from './pages/ReceptionDashboard.jsx';

/**
 * RoleGate — redirects to /login if no token or wrong role, and forces a
 * doctor/receptionist logging in with a temporary password to the
 * Change Password page before they can reach their dashboard.
 */
const RoleGate = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user?.token)                       return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role))  return <Navigate to="/login" replace />;
  if (user.mustChangePassword)            return <Navigate to="/change-password" replace />;
  return children;
};

/**
 * ChangePasswordGate — only reachable while authenticated. Once the forced
 * password change is complete, further visits redirect to the user's
 * dashboard instead of showing the form again.
 */
const ChangePasswordGate = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user?.token) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Navigate to="/login" replace />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/change-password" element={<ChangePasswordGate><ChangePassword /></ChangePasswordGate>} />

        <Route path="/admin-dashboard"
          element={<RoleGate allowedRoles={['administrator']}><AdminDashboard /></RoleGate>} />

        <Route path="/doctor-dashboard"
          element={<RoleGate allowedRoles={['doctor']}><DoctorDashboard /></RoleGate>} />

        <Route path="/reception-dashboard"
          element={<RoleGate allowedRoles={['receptionist']}><ReceptionDashboard /></RoleGate>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
