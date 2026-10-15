/**
 * AbroadPath AI - Landing Page
 * File: src/pages/LandingPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & PROJECT.md
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Compass,
  CalendarClock,
  GraduationCap,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, profile, signInWithGoogle, signInWithMock, loading } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      setIsSubmitting(true);
      await signInWithGoogle();
      if (profile) {
        navigate('/matches');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setAuthError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMockSignIn = async (preset: 'standard' | 'no-exams' | 'low-budget') => {
    try {
      setAuthError(null);
      setIsSubmitting(true);
      await signInWithMock(preset);
      navigate('/matches');
    } catch (err: any) {
      console.error('Mock sign in failed:', err);
      setAuthError(err.message || 'Failed to initialize mock session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateApp = () => {
    if (!profile) {
      navigate('/onboarding');
    } else {
      navigate('/matches');
    }
  };

  return (
    <div className="space-y-12 py-4 sm:py-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold uppercase tracking-wider">
          <GraduationCap className="w-4 h-4" />
          CareerGoals &bull; Study Abroad Guide
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Navigate Your Global Education with{' '}
          <span className="text-indigo-600 underline decoration-indigo-300">Verified Facts</span>,{' '}
          Not Guesses.
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
          Real admission requirements directly from official university portals in Germany, Ireland, and the UK.
          Live-verified data, automated rule-change alerts, and zero hallucinations.
        </p>

        {/* CTA Button Section */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <button
              onClick={handleNavigateApp}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all"
            >
              <span>{profile ? 'Go to University Matches' : 'Complete Your Profile'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleSignIn}
                disabled={isSubmitting || loading}
                className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-300 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {/* Google Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isSubmitting ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>

              <button
                onClick={() => handleMockSignIn('standard')}
                disabled={isSubmitting || loading}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
              >
                <span>Demo Student Login</span>
              </button>
            </div>
          )}
        </div>

        {authError && (
          <div className="max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {authError}
          </div>
        )}
      </div>

      {/* R4 Privacy Pledge Banner */}
      <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Student Privacy Commitment: No Personal Data Shared with AI
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                R4 Compliant
              </span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              CareerGoals strictly safeguards your personal information.{' '}
              <strong>
                No student personal data (such as your name, test scores, target countries, budget, or application documents) is ever transmitted to any external Large Language Model.
              </strong>{' '}
              Your profile is stored exclusively under your private Firestore UID. AI and automated pipelines only process publicly accessible university websites to verify requirements.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 500-Character Universal Input Cap
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Private UID Scoping
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> "Delete My Data" One-Click Right
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Feature Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pillar 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Live Verified Data</h3>
          <p className="text-sm text-slate-600">
            Every score requirement carries a verifiable source URL and lastChecked date. No invented cutoffs.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Rule Change Alerts</h3>
          <p className="text-sm text-slate-600">
            Automated pipeline detects changes (e.g. GMAT now required) and displays amber alert banners instantly.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Deterministic Matches</h3>
          <p className="text-sm text-slate-600">
            Clear mathematical matching (Strong, Possible, Reach, Prep needed). Unconfirmed requirements never penalize you.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Application Lifeline</h3>
          <p className="text-sm text-slate-600">
            Login-time in-app check-ins (+1, +3, +7 days), rejection recovery roadmaps, and structural letter guides.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
