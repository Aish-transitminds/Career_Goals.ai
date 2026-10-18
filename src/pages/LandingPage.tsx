/**
 * AbroadPath AI - Landing Page
 * File: src/pages/LandingPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & PROJECT.md
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { getUserApplications } from '../services/firestoreService';
import { Application } from '../types';
import ApplicationStatusCard from '../ApplicationStatusCard';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Compass,
  CalendarClock,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, profile, signInWithGoogle, signInWithMock, loading } = useAuth();
  const { universities } = useCatalog();
  const navigate = useNavigate();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userApplications, setUserApplications] = useState<Application[]>([]);

  // Fetch real tracker applications for logged in / mock user
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setUserApplications([]);
      return;
    }

    const loadApps = async () => {
      try {
        let apps: Application[] = [];
        if (user.isMock) {
          const saved = localStorage.getItem(`abroadpath_mock_apps_${user.uid}`);
          apps = saved ? JSON.parse(saved) : [];
        } else {
          try {
            apps = await getUserApplications(user.uid);
          } catch {
            const saved = localStorage.getItem(`abroadpath_mock_apps_${user.uid}`);
            apps = saved ? JSON.parse(saved) : [];
          }
        }
        if (isMounted) {
          setUserApplications(apps);
        }
      } catch (err) {
        console.warn('[LandingPage] Failed to fetch applications:', err);
      }
    };

    loadApps();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Map 3 most recent real applications onto "changed" | "verified" | "progress"
  const statusCardItems = useMemo(() => {
    if (!userApplications || userApplications.length === 0) {
      return [];
    }

    const sorted = [...userApplications].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.appliedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.appliedAt || 0).getTime();
      return timeB - timeA;
    });

    return sorted.slice(0, 3).map((app) => {
      const univ = universities.find((u) => u.id === app.universityId);
      const universityName = univ ? univ.name : app.universityId;
      const programmeName = univ ? univ.program : 'Graduate Studies';

      let status: 'changed' | 'verified' | 'progress' = 'progress';
      if (univ?.ruleChanged) {
        status = 'changed';
      } else if (app.status === 'accepted' || univ?.statementRequirements?.status === 'Verified') {
        status = 'verified';
      } else {
        status = 'progress';
      }

      return {
        id: app.id,
        university: universityName,
        programme: programmeName,
        status,
      };
    });
  }, [userApplications, universities]);

  // Compute real provenance percentage from official portal links in catalog
  const realProvenance = useMemo(() => {
    if (!universities || universities.length === 0) return undefined;
    const verifiedCount = universities.filter((u) => Boolean(u.sourceUrl)).length;
    const ratio = Math.round((verifiedCount / universities.length) * 100);
    return `${ratio}% Provenance`;
  }, [universities]);

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
      {/* 3. Hero Section: Forest background with soft radial glows, gold gradient highlight, and Atlas verification card */}
      <section className="relative overflow-hidden rounded-2xl p-6 sm:p-10 lg:p-12 text-white shadow-2xl border border-[#164e3b]/50 bg-gradient-to-br from-[#0b1e17] via-[#164e3b] to-[#0f3a2b] max-w-full contain-paint">
        {/* Soft radial glow backgrounds matching reference HTML */}
        <div
          className="absolute -top-28 -right-10 w-[420px] h-[420px] rounded-full pointer-events-none opacity-80"
          style={{
            background: 'radial-gradient(circle, rgba(222, 176, 98, 0.16) 0%, rgba(22, 78, 59, 0) 70%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full pointer-events-none opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(11, 30, 23, 0) 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider backdrop-blur-xs">
              <Shield className="w-3.5 h-3.5 text-[#deb062]" />
              <span>Verified Official Admissions</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.18]">
              Navigate Global Admissions<br />
              <span className="text-[#deb062]">With Verified Facts</span>, Not<br />
              Guesses.
            </h1>

            <p className="text-slate-200/90 text-sm sm:text-base leading-relaxed max-w-xl">
              Official entry requirements derived exclusively from institutional portals in Germany, Ireland, and the United Kingdom. Live verification, automated change alerts, and zero AI hallucinations.
            </p>

            {/* CTAs: Gold Primary + Ghost CTA */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {user ? (
                <button
                  onClick={handleNavigateApp}
                  className="px-6 py-3 rounded-lg bg-[#deb062] hover:bg-[#c99b4d] text-[#0b1e17] font-semibold text-sm transition-all shadow-md inline-flex items-center gap-2"
                >
                  <span>{profile ? 'Go to University Matches' : 'Complete Your Profile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleMockSignIn('standard')}
                    disabled={isSubmitting || loading}
                    className="px-6 py-3 rounded-lg bg-[#deb062] hover:bg-[#c99b4d] text-[#0b1e17] font-semibold text-sm transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSignIn}
                    disabled={isSubmitting || loading}
                    className="px-5 py-3 rounded-lg border-2 border-white/30 hover:border-white text-white font-semibold text-sm transition-all inline-flex items-center gap-2 bg-white/5 hover:bg-white/10"
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
              <div className="p-2.5 bg-rose-500/20 border border-rose-400 text-rose-200 text-xs rounded-lg">
                {authError}
              </div>
            )}
          </div>

          {/* Right Column: <ApplicationStatusCard /> */}
          <div className="lg:col-span-5 flex justify-center items-center w-full">
            <ApplicationStatusCard
              items={statusCardItems}
              cycle={new Date().getFullYear()}
              provenance={realProvenance}
            />
          </div>
        </div>
      </section>

      {/* 4. Four-Block Feature Strip: Warm Ivory & Deep Green Pillar Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block 1 */}
        <div className="bg-white rounded-xl p-6 border border-[#E6DFCF] shadow-xs hover:shadow-md hover:border-[#1B4D3E] transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[rgba(27,77,62,0.08)] text-[#1B4D3E] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-[#1B4D3E]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-[#1B4D3E] transition-colors">
              Verified requirements
            </h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Direct from official university portals. No crowdsourced guesses or obsolete cutoffs.
            </p>
          </div>
        </div>

        {/* Block 2 */}
        <div className="bg-white rounded-xl p-6 border border-[#E6DFCF] shadow-xs hover:shadow-md hover:border-[#1B4D3E] transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[rgba(27,77,62,0.08)] text-[#1B4D3E] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5 text-[#1B4D3E]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-[#1B4D3E] transition-colors">
              Live change detection
            </h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Automated crawlers audit portal rule changes daily. Instant alerts for revised criteria.
            </p>
          </div>
        </div>

        {/* Block 3 */}
        <div className="bg-white rounded-xl p-6 border border-[#E6DFCF] shadow-xs hover:shadow-md hover:border-[#1B4D3E] transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[rgba(27,77,62,0.08)] text-[#1B4D3E] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <CalendarClock className="w-5 h-5 text-[#1B4D3E]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-[#1B4D3E] transition-colors">
              Application tracking
            </h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Milestone timeline and automated follow-ups. +1, +3, and +7 days post-submission check-ins.
            </p>
          </div>
        </div>

        {/* Block 4 */}
        <div className="bg-white rounded-xl p-6 border border-[#E6DFCF] shadow-xs hover:shadow-md hover:border-[#1B4D3E] transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[rgba(27,77,62,0.08)] text-[#1B4D3E] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 text-[#1B4D3E]" />
            </div>
            <h3 className="font-semibold text-base mb-1 text-[#1B4D3E] transition-colors">
              Rejection roadmaps
            </h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Turn admission setbacks into actionable strategies. Peer-tier alternatives and score improvement plans.
            </p>
          </div>
        </div>
      </section>

      {/* 5. A Three-Step "Shortlist to Submission" Section */}
      <section className="bg-white rounded-2xl p-6 sm:p-10 border border-[#E6DFCF] shadow-xs space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[#B45309] font-bold text-xs uppercase tracking-wider">
            Clear Guidance Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1B4D3E]">
            From Shortlist to Submission in Three Steps
          </h2>
          <p className="text-[#5C6B63] text-sm">
            A structured, transparent roadmap engineered for global master's applicants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 bg-[#F3EEE2] rounded-xl border border-[#E6DFCF] space-y-3 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-[#1B4D3E]/10 absolute top-4 right-4">
              01
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#1B4D3E] text-[#FAF7F0] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-semibold text-base text-[#1B4D3E]">Deterministic Matching</h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Input your GPA, test scores (IELTS/GRE), and budget. The mathematical engine evaluates criteria into transparent fit tiers (Strong, Possible, Reach, Prep needed) without LLM guessing.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-[#F3EEE2] rounded-xl border border-[#E6DFCF] space-y-3 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-[#1B4D3E]/10 absolute top-4 right-4">
              02
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#1B4D3E] text-[#FAF7F0] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-semibold text-base text-[#1B4D3E]">Requirements &amp; SOP Planner</h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Access university-specific questions, exact word limits, and AI anti-rewrite guidelines. Craft authentic essays with an 8-point pre-submission analytical writing checker.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 bg-[#F3EEE2] rounded-xl border border-[#E6DFCF] space-y-3 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-[#1B4D3E]/10 absolute top-4 right-4">
              03
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#1B4D3E] text-[#FAF7F0] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-semibold text-base text-[#1B4D3E]">Track &amp; Submit Confidently</h3>
            <p className="text-xs text-[#5C6B63] leading-relaxed">
              Log application progress, receive automated +1, +3, +7 day check-in reminders, confirm German blocked accounts or Irish visa funding, and execute rejection roadmaps if needed.
            </p>
          </div>
        </div>
      </section>

      {/* R4 Privacy Pledge Card */}
      <section className="bg-white rounded-xl border border-[#E6DFCF] shadow-xs p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 bg-[#FAF7F0] text-[#1B4D3E] border border-[#E6DFCF] rounded-lg shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[#1B4D3E]">
                Student Privacy Commitment: No Personal Data Shared with AI
              </h2>
              <span className="bg-[#DCFCE7] text-[#16A34A] border border-[#86efac] text-[10px] px-2 py-0.5 rounded font-semibold">
                R4 Invariant
              </span>
            </div>
            <p className="text-[#5C6B63] text-xs leading-relaxed">
              <strong className="text-[#2B3A33]">
                No student personal data (such as your name, test scores, target countries, budget, or application documents) is ever transmitted to any external Large Language Model.
              </strong>{' '}
              Your profile is stored exclusively under your private Firestore UID.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-[#5C6B63] font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> 500-Character Universal Input Cap
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Private UID Scoping
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> "Delete My Data" Right
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
