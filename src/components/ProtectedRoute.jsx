import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRole }) {
  const userRole = localStorage.getItem('userRole');

  // 1. If not logged in at all, redirect to login
  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  // 2. If logged in but trying to access a page they don't have permission for
  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // 3. Everything is fine, render the dashboard page
  return children;
}