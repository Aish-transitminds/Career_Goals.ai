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
    <div className="space-y-12 py-2 sm:py-6 font-sans">
      {/* 3. Hero Section: Dark navy gradient, bold 2-line headline, orange + ghost CTAs, and white 'Your applications' card */}
      <section className="bg-gradient-to-br from-[#0B1026] via-[#111736] to-[#151B3A] rounded-2xl p-6 sm:p-10 lg:p-12 text-white shadow-2xl border border-[#151B3A]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151B3A] border border-[#FF5E00]/40 text-[#FF5E00] text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>CareerGoals &bull; Study Abroad Guide</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight">
              Navigate Global Admissions<br />
              <span className="text-[#FF5E00]">With Verified Facts</span>, Not Guesses.
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Real admission criteria directly from official university portals in Germany, Ireland, and the UK. Live verification, automated change alerts, and zero AI hallucinations.
            </p>

            {/* CTAs: Orange CTA + Ghost CTA */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {user ? (
                <button
                  onClick={handleNavigateApp}
                  className="px-6 py-3 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] font-semibold text-sm transition-all shadow-md inline-flex items-center gap-2"
                >
                  <span>{profile ? 'Go to University Matches' : 'Complete Your Profile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleMockSignIn('standard')}
                    disabled={isSubmitting || loading}
                    className="px-6 py-3 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] font-semibold text-sm transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSignIn}
                    disabled={isSubmitting || loading}
                    className="px-5 py-3 rounded-[6px] border-2 border-white/40 hover:border-white text-white font-semibold text-sm transition-all inline-flex items-center gap-2"
                  >
                    {/* Google SVG */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span>Google Sign In</span>
                  </button>
                </>
              )}
            </div>

            {authError && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-400 text-rose-200 text-xs rounded-[6px]">
                {authError}
              </div>
            )}
          </div>

          {/* Right Column: White 'Your applications' card with Verified / Changed / In progress badges */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="bg-white rounded-xl p-5 text-slate-900 shadow-2xl border border-slate-200 max-w-sm w-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E00] animate-pulse"></span>
                  <h3 className="font-semibold text-sm text-[#0B1026]">Your Applications</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                  Fall 2026
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Application 1: Changed */}
                <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-slate-900">Technical University of Munich</p>
                    <p className="text-[11px] text-slate-500">M.Sc. Informatics</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Changed
                  </span>
                </div>

                {/* Application 2: Verified */}
                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-slate-900">Heidelberg University</p>
                    <p className="text-[11px] text-slate-500">M.Sc. Data &amp; CompSci</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Verified
                  </span>
                </div>

                {/* Application 3: In progress */}
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-slate-900">University of Oxford</p>
                    <p className="text-[11px] text-slate-500">M.Sc. Adv. Computer Science</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    In progress
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Portal Sync
                </span>
                <span className="text-[#FF5E00] font-semibold">100% Provenance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Four-Block Feature Strip alternating orange (#FF5E00) and navy (#0B1026 / #151B3A) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block 1: Orange */}
        <div className="bg-[#FF5E00] text-[#0B1026] p-6 rounded-[6px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-black/10 text-[#0B1026] flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-[#0B1026]">Verified requirements</h3>
            <p className="text-xs text-[#0B1026]/90 leading-relaxed">
              Direct from official university portals. No crowdsourced guesses or obsolete cutoffs.
            </p>
          </div>
        </div>

        {/* Block 2: Navy */}
        <div className="bg-[#0B1026] text-white p-6 rounded-[6px] shadow-sm flex flex-col justify-between border border-[#151B3A]">
          <div>
            <div className="w-10 h-10 rounded-lg bg-white/10 text-[#FF5E00] flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-white">Live change detection</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automated crawlers audit portal rule changes daily. Instant alerts for revised criteria.
            </p>
          </div>
        </div>

        {/* Block 3: Orange */}
        <div className="bg-[#FF5E00] text-[#0B1026] p-6 rounded-[6px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-black/10 text-[#0B1026] flex items-center justify-center mb-4">
              <CalendarClock className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-[#0B1026]">Application tracking</h3>
            <p className="text-xs text-[#0B1026]/90 leading-relaxed">
              Milestone timeline and automated follow-ups. +1, +3, and +7 days post-submission check-ins.
            </p>
          </div>
        </div>

        {/* Block 4: Navy-2 */}
        <div className="bg-[#151B3A] text-white p-6 rounded-[6px] shadow-sm flex flex-col justify-between border border-slate-700">
          <div>
            <div className="w-10 h-10 rounded-lg bg-white/10 text-[#FF5E00] flex items-center justify-center mb-4">
              <Compass className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-white">Rejection roadmaps</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Turn admission setbacks into actionable strategies. Peer-tier alternatives and score improvement plans.
            </p>
          </div>
        </div>
      </section>

      {/* 5. A Three-Step "Shortlist to Submission" Section */}
      <section className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[#FF5E00] font-bold text-xs uppercase tracking-wider">
            Clear Guidance Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#0B1026]">
            From Shortlist to Submission in Three Steps
          </h2>
          <p className="text-slate-600 text-sm">
            A structured, transparent roadmap engineered for global master's applicants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-[#FF5E00]/25 absolute top-4 right-4">
              01
            </span>
            <div className="w-9 h-9 rounded-[6px] bg-[#0B1026] text-[#FF5E00] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-semibold text-base text-[#0B1026]">Deterministic Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Input your GPA, test scores (IELTS/GRE), and budget. The mathematical engine evaluates criteria into transparent fit tiers (Strong, Possible, Reach, Prep needed) without LLM guessing.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-[#FF5E00]/25 absolute top-4 right-4">
              02
            </span>
            <div className="w-9 h-9 rounded-[6px] bg-[#0B1026] text-[#FF5E00] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-semibold text-base text-[#0B1026]">Requirements &amp; SOP Planner</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access university-specific questions, exact word limits, and AI anti-rewrite guidelines. Craft authentic essays with an 8-point pre-submission analytical writing checker.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-[#FF5E00]/25 absolute top-4 right-4">
              03
            </span>
            <div className="w-9 h-9 rounded-[6px] bg-[#0B1026] text-[#FF5E00] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-semibold text-base text-[#0B1026]">Track &amp; Submit Confidently</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Log application progress, receive automated +1, +3, +7 day check-in reminders, confirm German blocked accounts or Irish visa funding, and execute rejection roadmaps if needed.
            </p>
          </div>
        </div>
      </section>

      {/* R4 Privacy Pledge Card */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 bg-[#0B1026] text-[#FF5E00] rounded-[6px] shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[#0B1026]">
                Student Privacy Commitment: No Personal Data Shared with AI
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-semibold">
                R4 Invariant
              </span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              <strong>
                No student personal data (such as your name, test scores, target countries, budget, or application documents) is ever transmitted to any external Large Language Model.
              </strong>{' '}
              Your profile is stored exclusively under your private Firestore UID.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 500-Character Universal Input Cap
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Private UID Scoping
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> "Delete My Data" Right
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
