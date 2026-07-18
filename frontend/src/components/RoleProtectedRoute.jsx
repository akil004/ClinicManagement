import React from "react";
import { Navigate } from "react-router-dom";

/**
 * RoleProtectedRoute — explicit role-gating wrapper used in App.jsx.
 * Redirects to /login if the user is not authenticated or their role
 * does not match any of the allowedRoles.
 *
 * Usage:
 *   <RoleProtectedRoute allowedRoles={["administrator"]}>
 *     <AdminDashboard />
 *   </RoleProtectedRoute>
 */
function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default RoleProtectedRoute;
