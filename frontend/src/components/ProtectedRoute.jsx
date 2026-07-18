import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Checks that:
 *   1. A JWT exists in localStorage (user is authenticated)
 *   2. The stored role is in the allowedRoles array
 * Redirects to /login on failure.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;
