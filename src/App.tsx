/**
 * AbroadPath AI - Main Application Component with Lazy-Loaded Routes
 * File: src/App.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R5) & PROJECT.md
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/common/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PageLoadingFallback } from './components/common/PageLoadingFallback';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AIAssistantWidget } from './components/assistant/AIAssistantWidget';

// Lazy-loaded route components (R1: "Lazy-load all routes")
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'));
const MatchesPage = React.lazy(() => import('./pages/MatchesPage'));
const CountryGuidePage = React.lazy(() => import('./pages/CountryGuidePage'));
const ApplicationTrackerPage = React.lazy(() => import('./pages/ApplicationTrackerPage'));
const RejectionRoadmapPage = React.lazy(() => import('./pages/RejectionRoadmapPage'));
const LetterHelperPage = React.lazy(() => import('./pages/LetterHelperPage'));

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={<PageLoadingFallback message="Loading view..." />}>
          <Routes>
            {/* Public Landing & Sign-In */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected Core Flow (Milestone 2) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <MatchesPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Secondary Screens (Milestone 3) */}
            <Route
              path="/countries"
              element={
                <ProtectedRoute>
                  <CountryGuidePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/countries/:id"
              element={
                <ProtectedRoute>
                  <CountryGuidePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tracker"
              element={
                <ProtectedRoute>
                  <ApplicationTrackerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roadmap"
              element={
                <ProtectedRoute>
                  <RejectionRoadmapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roadmap/:appId"
              element={
                <ProtectedRoute>
                  <RejectionRoadmapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/letter-helper"
              element={
                <ProtectedRoute>
                  <LetterHelperPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Global Floating AI Assistant Widget (R1, R5) */}
        <AIAssistantWidget />
      </AppLayout>
    </ErrorBoundary>
  );
};

export default App;
