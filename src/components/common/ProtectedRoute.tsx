/**
 * AbroadPath AI - Protected Route Guard
 * File: src/components/common/ProtectedRoute.tsx
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoadingFallback } from './PageLoadingFallback';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoadingFallback message="Verifying session..." />;
  }

  if (!user) {
    // Preserve attempted destination for post-login redirection
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
