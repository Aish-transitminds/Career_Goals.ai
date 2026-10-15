/**
 * AbroadPath AI - Onboarding & Profile Page
 * File: src/pages/OnboardingPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & PROJECT.md
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';
import {
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Euro,
  Info,
} from 'lucide-react';

const AVAILABLE_COUNTRIES = [
  { id: 'germany', name: 'Germany', desc: 'Tuition-free options, uni-assist, DAAD' },
  { id: 'ireland', name: 'Ireland', desc: 'English-speaking, 2-yr post-study visa, direct/PAC' },
  { id: 'uk', name: 'United Kingdom', desc: 'World-class universities, 1-year Master’s programs' },
];

export const OnboardingPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [examsTaken, setExamsTaken] = useState<boolean>(false);
  const [gre, setGre] = useState<string>('');
  const [gmat, setGmat] = useState<string>('');
  const [toefl, setToefl] = useState<string>('');
  const [ielts, setIelts] = useState<string>('');
  const [targetCountries, setTargetCountries] = useState<string[]>(['germany']);
  const [budget, setBudget] = useState<string>('15000');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prepopulate if editing profile or user exists
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setExamsTaken(profile.examsTaken || false);
      setGre(profile.exams?.gre !== null && profile.exams?.gre !== undefined ? String(profile.exams?.gre) : '');
      setGmat(profile.exams?.gmat !== null && profile.exams?.gmat !== undefined ? String(profile.exams?.gmat) : '');
      setToefl(profile.exams?.toefl !== null && profile.exams?.toefl !== undefined ? String(profile.exams?.toefl) : '');
      setIelts(profile.exams?.ielts !== null && profile.exams?.ielts !== undefined ? String(profile.exams?.ielts) : '');
      setTargetCountries(profile.targetCountries?.length ? profile.targetCountries : ['germany']);
      setBudget(profile.budget !== null && profile.budget !== undefined ? String(profile.budget) : '15000');
    } else if (user) {
      setName(user.displayName || 'Student');
    }
  }, [user, profile]);

  const handleCountryToggle = (countryId: string) => {
    if (targetCountries.includes(countryId)) {
      if (targetCountries.length === 1) {
        return; // Retain at least one country
      }
      setTargetCountries(targetCountries.filter((id) => id !== countryId));
    } else {
      setTargetCountries([...targetCountries, countryId]);
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Please provide your name or preferred display handle.';
    } else if (name.length > 500) {
      errs.name = 'Name must be 500 characters or fewer.';
    }

    if (examsTaken) {
      if (gre !== '') {
        const val = Number(gre);
        if (isNaN(val) || val < 260 || val > 340) {
          errs.gre = 'GRE General score must be between 260 and 340.';
        }
      }

      if (gmat !== '') {
        const val = Number(gmat);
        if (isNaN(val) || val < 200 || val > 800) {
          errs.gmat = 'GMAT score must be between 200 and 800.';
        }
      }

      if (toefl !== '') {
        const val = Number(toefl);
        if (isNaN(val) || val < 0 || val > 120) {
          errs.toefl = 'TOEFL iBT score must be between 0 and 120.';
        }
      }

      if (ielts !== '') {
        const val = Number(ielts);
        if (isNaN(val) || val < 0.0 || val > 9.0) {
          errs.ielts = 'IELTS Academic score must be between 0.0 and 9.0.';
        }
      }
    }

    if (targetCountries.length === 0) {
      errs.countries = 'Please select at least one target country.';
    }

    if (budget !== '') {
      const val = Number(budget);
      if (isNaN(val) || val < 0) {
        errs.budget = 'Annual budget must be a positive number or 0.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) {
      setSubmitError('You must be signed in to save your profile.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const profileData: UserProfile = {
      uid: user.uid,
      name: name.trim().slice(0, 500),
      email: user.email || '',
      examsTaken: examsTaken,
      exams: {
        gre: examsTaken && gre !== '' ? Number(gre) : null,
        gmat: examsTaken && gmat !== '' ? Number(gmat) : null,
        toefl: examsTaken && toefl !== '' ? Number(toefl) : null,
        ielts: examsTaken && ielts !== '' ? Number(ielts) : null,
      },
      targetCountries: targetCountries,
      budget: budget !== '' ? Number(budget) : null,
      createdAt: profile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserProfile(profileData);
      await refreshProfile();
      navigate('/matches');
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setSubmitError(err.message || 'Failed to save profile to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
          Student Profile Setup
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Exam Profile & Target Preferences
        </h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto">
          Configure your standardized test scores and target destinations to generate live-verified university matches.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
        {/* Name with 500-char cap */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-900">
              Full Name or Display Handle <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">{name.length} / 500</span>
          </div>
          <input
            type="text"
            maxLength={500}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 500))}
            placeholder="e.g. Alex Chen"
            className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
              errors.name ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
            }`}
          />
          {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
        </div>

        {/* Exams Taken Toggle Question */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-900">
            Have you taken any standardized exams? (GRE, GMAT, TOEFL, IELTS)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setExamsTaken(true)}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-medium text-sm transition-all ${
                examsTaken
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${examsTaken ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Yes, I have taken exams</span>
            </button>

            <button
              type="button"
              onClick={() => setExamsTaken(false)}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-medium text-sm transition-all ${
                !examsTaken
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <HelpCircle className={`w-5 h-5 ${!examsTaken ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>No, not yet</span>
            </button>
          </div>
        </div>

        {/* Score Inputs vs Prep Guidance Path */}
        {examsTaken ? (
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Standardized Test Scores
              </h2>
              <span className="text-xs text-slate-400">Leave blank if test not taken</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GRE Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GRE General (260 – 340)
                </label>
                <input
                  type="number"
                  min="260"
                  max="340"
                  placeholder="e.g. 320"
                  value={gre}
                  onChange={(e) => setGre(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.gre ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.gre && <p className="text-xs text-rose-600 mt-1">{errors.gre}</p>}
              </div>

              {/* GMAT Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GMAT (200 – 800)
                </label>
                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="e.g. 680"
                  value={gmat}
                  onChange={(e) => setGmat(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.gmat ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.gmat && <p className="text-xs text-rose-600 mt-1">{errors.gmat}</p>}
              </div>

              {/* TOEFL Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TOEFL iBT (0 – 120)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 100"
                  value={toefl}
                  onChange={(e) => setToefl(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.toefl ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.toefl && <p className="text-xs text-rose-600 mt-1">{errors.toefl}</p>}
              </div>

              {/* IELTS Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IELTS Academic (0.0 – 9.0)
                </label>
                <input
                  type="number"
                  min="0"
                  max="9.0"
                  step="0.5"
                  placeholder="e.g. 7.0"
                  value={ielts}
                  onChange={(e) => setIelts(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.ielts ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.ielts && <p className="text-xs text-rose-600 mt-1">{errors.ielts}</p>}
              </div>
            </div>
          </div>
        ) : (
          /* PREP GUIDANCE PATH */
          <div className="p-5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex items-start gap-3">
              <BookOpen className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-indigo-950">
                  Prep Guidance Path Activated
                </h2>
                <p className="text-sm text-indigo-900 leading-relaxed">
                  No standardized exams yet? That's completely fine! Many universities in Germany and Ireland admit students based on their undergraduate curriculum, medium of instruction (MOI) letters, or offer conditional admissions while you prepare.
                </p>
              </div>
            </div>
            <div className="pt-2 text-xs text-indigo-800 flex items-center gap-2 border-t border-indigo-200">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Your university matches will display a <strong>"Prep needed"</strong> status with an itemized checklist of required tests.
              </span>
            </div>
          </div>
        )}

        {/* Preferred Countries Selection */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-900">
              Target Study Destinations
            </label>
            <span className="text-xs text-slate-400">Select at least one</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AVAILABLE_COUNTRIES.map((c) => {
              const isSelected = targetCountries.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCountryToggle(c.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{c.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.desc}</p>
                </button>
              );
            })}
          </div>
          {errors.countries && <p className="text-xs text-rose-600 mt-1">{errors.countries}</p>}
        </div>

        {/* Budget Input & Quick Presets */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-900">
              Annual Budget (EUR € for Tuition & Living)
            </label>
            <span className="text-xs text-slate-400">Use 0 for tuition-free search</span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Euro className="w-4 h-4" />
            </div>
            <input
              type="number"
              min="0"
              step="500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="15000"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: 'Tuition-Free / Low (< €5,000)', val: '5000' },
              { label: 'Moderate (€15,000)', val: '15000' },
              { label: 'Higher (€30,000)', val: '30000' },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setBudget(preset.val)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  budget === preset.val
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {errors.budget && <p className="text-xs text-rose-600 mt-1">{errors.budget}</p>}
        </div>

        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-md transition-all disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Saving Profile...' : 'Save & View University Matches'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default OnboardingPage;
