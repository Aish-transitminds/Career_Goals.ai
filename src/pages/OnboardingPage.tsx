/**
 * AbroadPath AI - Onboarding & Student Profile Page
 * File: src/pages/OnboardingPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & Onboarding Expansion Specification
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile } from '../services/firestoreService';
import { useCatalog } from '../hooks/useCatalog';
import {
  GradingScale,
  DegreeLevel,
  BudgetPeriod,
  BudgetCoverage,
  EnglishTestType,
} from '../types';
import {
  validateProfileForm,
  buildUserProfileFromForm,
} from '../utils/profileValidation';
import {
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  Euro,
  Info,
  GraduationCap,
  Sparkles,
  Building2,
  Compass,
  FileCheck,
} from 'lucide-react';
import { convertEurToInr } from '../utils/currencyUtils';

const AVAILABLE_COUNTRIES = [
  { id: 'germany', name: 'Germany', desc: 'Tuition-free options, uni-assist, DAAD' },
  { id: 'ireland', name: 'Ireland', desc: 'English-speaking, 2-yr post-study visa, direct/PAC' },
  { id: 'uk', name: 'United Kingdom', desc: 'World-class universities, 1-year Master’s programs' },
];

const QUALIFICATION_OPTIONS = [
  "Bachelor's Degree",
  "Master's Degree",
  "High School / Secondary",
  "Diploma / Associate Degree",
  "Other",
];

const INTENDED_SUBJECT_OPTIONS = [
  { id: 'cs', label: 'Computer Science & Informatics', category: 'STEM' },
  { id: 'ai', label: 'Data Science & Artificial Intelligence', category: 'STEM' },
  { id: 'fashion', label: 'Fashion Design & Textile Arts', category: 'Creative' },
  { id: 'theatre', label: 'Theatre & Performing Arts', category: 'Creative' },
  { id: 'business', label: 'Business, Management & Economics', category: 'Business' },
  { id: 'engineering', label: 'Engineering (Mechanical / Electrical / Civil)', category: 'STEM' },
  { id: 'humanities', label: 'Arts, Humanities & Social Sciences', category: 'Humanities' },
  { id: 'sciences', label: 'Natural & Life Sciences', category: 'STEM' },
  { id: 'other', label: 'Other / Interdisciplinary Studies', category: 'Interdisciplinary' },
];

const DEGREE_LEVEL_OPTIONS: DegreeLevel[] = [
  "Master's",
  "Bachelor's",
  "PhD / Doctorate",
  "Diploma / Certificate",
];

const GRADING_SCALE_OPTIONS: { id: GradingScale; label: string; range: string; example: string }[] = [
  { id: '10.0', label: '10.0 Scale', range: '0.0 – 10.0', example: 'e.g. 8.2' },
  { id: '4.0', label: '4.0 Scale', range: '0.0 – 4.0', example: 'e.g. 3.65' },
  { id: '100%', label: 'Percentage (%)', range: '0 – 100%', example: 'e.g. 82.5' },
  { id: 'other', label: 'Other Scale', range: 'Custom', example: 'e.g. 1.7 (German)' },
];

export const OnboardingPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { universities } = useCatalog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Basic Information
  const [name, setName] = useState('');

  // A. Academic Background
  const [qualification, setQualification] = useState<string>("Bachelor's Degree");
  const [degreeTitle, setDegreeTitle] = useState<string>('');
  const [fieldOfStudy, setFieldOfStudy] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [gpa, setGpa] = useState<string>('');
  const [gpaScale, setGpaScale] = useState<GradingScale>('10.0');
  const [graduationYear, setGraduationYear] = useState<string>('');

  // B. Intended Studies
  const [intendedDegreeLevel, setIntendedDegreeLevel] = useState<DegreeLevel>("Master's");
  const [intendedSubject, setIntendedSubject] = useState<string>('Computer Science & Informatics');
  const [specialisation, setSpecialisation] = useState<string>('');
  const [targetIntakeYear, setTargetIntakeYear] = useState<string>('2026');
  const [targetIntakeSemester, setTargetIntakeSemester] = useState<string>('Fall / Winter');
  const [targetProgramId, setTargetProgramId] = useState<string>('');

  // C. English Proficiency
  const [englishTestTaken, setEnglishTestTaken] = useState<boolean>(false);
  const [englishTestType, setEnglishTestType] = useState<EnglishTestType>('IELTS');
  const [englishTestScore, setEnglishTestScore] = useState<string>('');
  const [englishTestDate, setEnglishTestDate] = useState<string>('');

  // D. Other Admission Tests
  const [otherTestsTaken, setOtherTestsTaken] = useState<boolean>(false);
  const [gre, setGre] = useState<string>('');
  const [gmat, setGmat] = useState<string>('');

  // E. Preferences & Budget
  const [targetCountries, setTargetCountries] = useState<string[]>(['germany']);
  const [budget, setBudget] = useState<string>('15000');
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>('annual');
  const [budgetCovers, setBudgetCovers] = useState<BudgetCoverage>('total_cost');
  const [scholarshipPreference, setScholarshipPreference] = useState<boolean>(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prepopulate if editing profile or user exists
  useEffect(() => {
    // Check URL query param for target program (e.g. /onboarding?program=tum_informatics)
    const urlProgram = searchParams.get('program');
    if (urlProgram) {
      setTargetProgramId(urlProgram);
    }

    if (profile) {
      setName(profile.name || '');

      // Academic Background
      if (profile.qualification) setQualification(profile.qualification);
      if (profile.degreeTitle) setDegreeTitle(profile.degreeTitle);
      if (profile.fieldOfStudy) setFieldOfStudy(profile.fieldOfStudy);
      if (profile.institution) setInstitution(profile.institution);
      if (profile.gpa !== null && profile.gpa !== undefined) {
        setGpa(String(profile.gpa));
      }
      if (profile.gpaScale) {
        setGpaScale(profile.gpaScale as GradingScale);
      }
      if (profile.graduationYear) {
        setGraduationYear(String(profile.graduationYear));
      }

      // Intended Studies
      if (profile.intendedDegreeLevel) {
        setIntendedDegreeLevel(profile.intendedDegreeLevel as DegreeLevel);
      }
      if (profile.intendedSubject) setIntendedSubject(profile.intendedSubject);
      if (profile.specialisation) setSpecialisation(profile.specialisation);
      if (profile.targetIntakeYear) setTargetIntakeYear(profile.targetIntakeYear);
      if (profile.targetIntakeSemester) setTargetIntakeSemester(profile.targetIntakeSemester);
      if (profile.targetProgramId && !urlProgram) setTargetProgramId(profile.targetProgramId);

      // English Proficiency (gracefully handle existing exams if englishTestTaken not explicitly saved)
      const hasSavedIelts = profile.exams?.ielts !== null && profile.exams?.ielts !== undefined;
      const hasSavedToefl = profile.exams?.toefl !== null && profile.exams?.toefl !== undefined;
      const hasSavedPte = profile.exams?.pte !== null && profile.exams?.pte !== undefined;
      const hasEnglishExam = hasSavedIelts || hasSavedToefl || hasSavedPte;

      const testTaken = profile.englishTestTaken !== undefined && profile.englishTestTaken !== null
        ? Boolean(profile.englishTestTaken)
        : hasEnglishExam;

      setEnglishTestTaken(testTaken);

      if (profile.englishTestType) {
        setEnglishTestType(profile.englishTestType as EnglishTestType);
      } else if (hasSavedIelts) {
        setEnglishTestType('IELTS');
      } else if (hasSavedToefl) {
        setEnglishTestType('TOEFL');
      } else if (hasSavedPte) {
        setEnglishTestType('PTE');
      }

      if (profile.englishTestScore !== null && profile.englishTestScore !== undefined) {
        setEnglishTestScore(String(profile.englishTestScore));
      } else if (hasSavedIelts) {
        setEnglishTestScore(String(profile.exams.ielts));
      } else if (hasSavedToefl) {
        setEnglishTestScore(String(profile.exams.toefl));
      } else if (hasSavedPte) {
        setEnglishTestScore(String(profile.exams.pte));
      }

      if (profile.englishTestDate) setEnglishTestDate(profile.englishTestDate);

      // Other Admission Tests (GRE / GMAT)
      const hasSavedGre = profile.exams?.gre !== null && profile.exams?.gre !== undefined;
      const hasSavedGmat = profile.exams?.gmat !== null && profile.exams?.gmat !== undefined;
      const otherTaken = profile.otherTestsTaken !== undefined && profile.otherTestsTaken !== null
        ? Boolean(profile.otherTestsTaken)
        : hasSavedGre || hasSavedGmat;

      setOtherTestsTaken(otherTaken);
      setGre(hasSavedGre ? String(profile.exams.gre) : '');
      setGmat(hasSavedGmat ? String(profile.exams.gmat) : '');

      // Preferences & Budget
      setTargetCountries(profile.targetCountries?.length ? profile.targetCountries : ['germany']);
      setBudget(profile.budget !== null && profile.budget !== undefined ? String(profile.budget) : '15000');
      if (profile.budgetPeriod) setBudgetPeriod(profile.budgetPeriod);
      if (profile.budgetCovers) setBudgetCovers(profile.budgetCovers);
      if (profile.scholarshipPreference !== undefined && profile.scholarshipPreference !== null) {
        setScholarshipPreference(profile.scholarshipPreference);
      }
    } else if (user) {
      setName(user.displayName || 'Student');
    }
  }, [user, profile, searchParams]);

  // Selected catalogue programme details (for adaptive requirements display)
  const selectedProgram = universities.find((u) => u.id === targetProgramId) || null;

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
    const errs = validateProfileForm({
      name,
      gpa,
      gpaScale,
      graduationYear,
      englishTestTaken,
      englishTestType,
      englishTestScore,
      otherTestsTaken,
      gre,
      gmat,
      targetCountries,
      budget,
    });

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

    const profileData = buildUserProfileFromForm(
      {
        name,
        qualification,
        degreeTitle,
        fieldOfStudy,
        institution,
        gpa,
        gpaScale,
        graduationYear,
        intendedDegreeLevel,
        intendedSubject,
        specialisation,
        targetIntakeYear,
        targetIntakeSemester,
        targetProgramId,
        englishTestTaken,
        englishTestType,
        englishTestScore,
        englishTestDate,
        otherTestsTaken,
        gre,
        gmat,
        targetCountries,
        budget,
        budgetPeriod,
        budgetCovers,
        scholarshipPreference,
      },
      user.uid,
      user.email || '',
      profile
    );

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
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8 font-poppins">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-[#FF5E00] uppercase tracking-wider">
          Student Profile Setup
        </span>
        <h1 className="text-3xl font-extrabold text-[#0B1026]">
          Academic Profile & Study Preferences
        </h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto">
          Configure your academic foundation, target disciplines, and test credentials to generate live-verified university matches.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[8px] shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8 hover:border-[#FF5E00]/60 transition-colors">
        
        {/* ========================================================= */}
        {/* SECTION 1: Personal Details                               */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <GraduationCap className="w-5 h-5 text-[#FF5E00]" />
            <h2 className="text-base font-bold text-[#0B1026]">1. Student Information</h2>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-[#0B1026]">
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
              className={`w-full px-4 py-2.5 rounded-[6px] border text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] text-sm ${
                errors.name ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: Academic Background (Task §2.A)                 */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#FF5E00]" />
              <h2 className="text-base font-bold text-[#0B1026]">2. Academic Background</h2>
            </div>
            <span className="text-xs text-slate-400">Score & scale stored separately</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Qualification */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Highest Completed or Current Qualification <span className="text-rose-500">*</span>
              </label>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              >
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Degree Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Degree Title <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. B.Tech, B.A., B.Sc."
                value={degreeTitle}
                onChange={(e) => setDegreeTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              />
            </div>

            {/* Field of Study */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prior Field of Study / Major <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Computer Science, Fashion Design, Drama"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              />
            </div>

            {/* Previous Institution */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Previous Institution / University <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. University of Delhi, TU Berlin"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              />
            </div>
          </div>

          {/* Academic Score & Explicit Grading Scale */}
          <div className="p-4 bg-slate-50/70 rounded-[6px] border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0B1026] uppercase tracking-wider">
                Academic Score & Grading Scale
              </label>
              <span className="text-xs text-slate-400">Leave score blank if unstated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Grading Scale Dropdown */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grading Scale
                </label>
                <select
                  value={gpaScale}
                  onChange={(e) => setGpaScale(e.target.value as GradingScale)}
                  className="w-full px-3 py-2 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
                >
                  {GRADING_SCALE_OPTIONS.map((scale) => (
                    <option key={scale.id} value={scale.id}>
                      {scale.label} ({scale.range})
                    </option>
                  ))}
                </select>
              </div>

              {/* Score Input */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Score / CGPA / % <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={
                    GRADING_SCALE_OPTIONS.find((s) => s.id === gpaScale)?.example || 'e.g. 8.2'
                  }
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  className={`w-full px-3 py-2 bg-white rounded-[6px] border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] ${
                    errors.gpa ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.gpa && <p className="text-xs text-rose-600 mt-1">{errors.gpa}</p>}
              </div>

              {/* Graduation Year */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Year <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="1970"
                  max="2035"
                  placeholder="e.g. 2024"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className={`w-full px-3 py-2 bg-white rounded-[6px] border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] ${
                    errors.graduationYear ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.graduationYear && (
                  <p className="text-xs text-rose-600 mt-1">{errors.graduationYear}</p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * Scores and grading systems are stored independently without automatic conversion to prevent misinterpretation (e.g. 8.2 / 10 vs 82%).
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: Intended Studies & Program Adaptation (§2.B, §3)*/}
        {/* ========================================================= */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#FF5E00]" />
              <h2 className="text-base font-bold text-[#0B1026]">3. Intended Studies</h2>
            </div>
            <span className="text-xs text-slate-400">Not hardcoded to CS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Intended Degree Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intended Degree Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={intendedDegreeLevel}
                onChange={(e) => setIntendedDegreeLevel(e.target.value as DegreeLevel)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              >
                {DEGREE_LEVEL_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {/* Intended Subject / Field of Study */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intended Subject / Field of Study <span className="text-rose-500">*</span>
              </label>
              <select
                value={intendedSubject}
                onChange={(e) => setIntendedSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              >
                {INTENDED_SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj.id} value={subj.label}>
                    {subj.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialisation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialisation / Sub-discipline <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Distributed Systems, Apparel Merchandising, Dramaturgy"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
              />
            </div>

            {/* Target Intake (Year & Semester) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intake Year
                </label>
                <select
                  value={targetIntakeYear}
                  onChange={(e) => setTargetIntakeYear(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester
                </label>
                <select
                  value={targetIntakeSemester}
                  onChange={(e) => setTargetIntakeSemester(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
                >
                  <option value="Fall / Winter">Fall / Winter</option>
                  <option value="Spring / Summer">Spring / Summer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Pre-Selected Target Programme from Catalogue */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target University Programme <span className="text-slate-400 font-normal">(optional catalogue focus)</span>
            </label>
            <select
              value={targetProgramId}
              onChange={(e) => setTargetProgramId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
            >
              <option value="">General search / Not yet decided on a specific university</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.program} ({u.countryId.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* ADAPTIVE PROGRAMME & SUBJECT REQUIREMENTS BANNER (§3) */}
          {intendedSubject.includes('Fashion Design') && (
            <div className="p-4 bg-amber-50/80 rounded-[6px] border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Creative Admissions Notice: Portfolio & Design Concept Preparation</span>
              </div>
              <p className="leading-relaxed">
                Programmes in Fashion Design typically evaluate a creative design portfolio, garment sketches, and personal concept boards rather than standardized tests like GRE or GMAT.
              </p>
              <div className="pt-1.5 border-t border-amber-200/60 text-[11px] text-amber-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Catalogue Status:</strong> Detailed institutional criteria for Fashion Design are currently unconfirmed in our database; standard portfolio preparation is recommended.
                </span>
              </div>
            </div>
          )}

          {intendedSubject.includes('Theatre') && (
            <div className="p-4 bg-purple-50/80 rounded-[6px] border border-purple-200 text-xs text-purple-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-950">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Performing Arts Notice: Audition & Practical Assessment</span>
              </div>
              <p className="leading-relaxed">
                Admissions for Theatre & Performing Arts focus predominantly on live auditions, monologue submissions, or practical performance workshops. GRE and GMAT exams are generally waived.
              </p>
              <div className="pt-1.5 border-t border-purple-200/60 text-[11px] text-purple-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Catalogue Status:</strong> Audition dates and repertoire criteria are unconfirmed in the current catalogue; you will not be penalized for omitting GRE/GMAT scores.
                </span>
              </div>
            </div>
          )}

          {/* Specific Programme Adaptation if selected */}
          {selectedProgram && (
            <div className="p-4 bg-orange-50/50 rounded-[6px] border border-orange-200 text-xs text-[#0B1026] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B1026] flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[#FF5E00]" />
                  <span>Selected Programme Requirements: {selectedProgram.name}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${
                  selectedProgram.statementRequirements?.status === 'Verified'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  Status: {selectedProgram.statementRequirements?.status || 'Unknown'}
                </span>
              </div>
              <p className="text-slate-700">
                {selectedProgram.program} • {selectedProgram.tuition}
              </p>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>
                  <strong>Language Requirement:</strong> {selectedProgram.requirements.language_requirement || 'IELTS/TOEFL'}
                </div>
                <div>
                  <strong>GRE / GMAT:</strong>{' '}
                  {selectedProgram.requirements.gre_required === true
                    ? `GRE Required (min ${selectedProgram.requirements.min_gre || '310+'})`
                    : selectedProgram.requirements.gre_required === false
                    ? 'Not required'
                    : 'Unconfirmed / Programme-specific'}
                </div>
                {selectedProgram.statementRequirements?.summary && (
                  <div className="italic text-[#0B1026] pt-1">
                    "{selectedProgram.statementRequirements.summary}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SECTION 4: English Proficiency (Task §2.C)                */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0B1026]">4. English Proficiency</h2>
            <span className="text-xs text-slate-400">IELTS, TOEFL, PTE supported</span>
          </div>

          <label className="block text-sm font-semibold text-[#0B1026]">
            Have you taken an English proficiency test?
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setEnglishTestTaken(true)}
              className={`flex items-center justify-center gap-2 p-4 rounded-[6px] border font-medium text-sm transition-all ${
                englishTestTaken
                  ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] shadow-sm font-semibold ring-1 ring-[#FF5E00]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${englishTestTaken ? 'text-[#FF5E00]' : 'text-slate-400'}`} />
              <span>Yes, I have taken a test</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEnglishTestTaken(false);
                setEnglishTestScore('');
              }}
              className={`flex items-center justify-center gap-2 p-4 rounded-[6px] border font-medium text-sm transition-all ${
                !englishTestTaken
                  ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] shadow-sm font-semibold ring-1 ring-[#FF5E00]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <HelpCircle className={`w-5 h-5 ${!englishTestTaken ? 'text-[#FF5E00]' : 'text-slate-400'}`} />
              <span>No, not yet / MOI eligible</span>
            </button>
          </div>

          {/* Conditional English Test Fields */}
          {englishTestTaken ? (
            <div className="p-4 bg-slate-50/80 rounded-[6px] border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B1026] uppercase tracking-wider">
                  Test Details & Score
                </span>
                <span className="text-xs text-slate-400">Score is optional if pending</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Test Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Type
                  </label>
                  <select
                    value={englishTestType}
                    onChange={(e) => setEnglishTestType(e.target.value as EnglishTestType)}
                    className="w-full px-3 py-2 bg-white rounded-[6px] border border-slate-300 text-sm text-[#0B1026] focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
                  >
                    <option value="IELTS">IELTS Academic (0.0 – 9.0)</option>
                    <option value="TOEFL">TOEFL iBT (0 – 120)</option>
                    <option value="PTE">PTE Academic (10 – 90)</option>
                  </select>
                </div>

                {/* Score */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Overall Score <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    step={englishTestType === 'IELTS' ? '0.5' : '1'}
                    min={englishTestType === 'PTE' ? '10' : '0'}
                    max={englishTestType === 'IELTS' ? '9.0' : englishTestType === 'TOEFL' ? '120' : '90'}
                    placeholder={
                      englishTestType === 'IELTS'
                        ? 'e.g. 7.5'
                        : englishTestType === 'TOEFL'
                        ? 'e.g. 100'
                        : 'e.g. 70'
                    }
                    value={englishTestScore}
                    onChange={(e) => setEnglishTestScore(e.target.value)}
                    className={`w-full px-3 py-2 bg-white rounded-[6px] border text-sm text-[#0B1026] focus:outline-none focus:ring-2 focus:ring-[#FF5E00] ${
                      errors.englishScore ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {errors.englishScore && (
                    <p className="text-xs text-rose-600 mt-1">{errors.englishScore}</p>
                  )}
                </div>

                {/* Test Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Date <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={englishTestDate}
                    onChange={(e) => setEnglishTestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-[6px] border border-slate-300 text-sm text-[#0B1026] focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#FF5E00] shrink-0 mt-0.5" />
              <span>
                No English test score yet? You can continue without one. Many European universities admit students with English Medium of Instruction (MOI) certificates or offer conditional admission. Missing scores are never recorded as zero.
              </span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SECTION 5: Other Admission Tests (GRE / GMAT) (§2.D)      */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0B1026]">5. Other Admission Tests</h2>
            <span className="text-xs text-slate-400">GRE / GMAT (Conditional)</span>
          </div>

          <label className="block text-sm font-semibold text-[#0B1026]">
            Have you taken any other standardized admission test (e.g. GRE or GMAT)?
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setOtherTestsTaken(true)}
              className={`flex items-center justify-center gap-2 p-4 rounded-[6px] border font-medium text-sm transition-all ${
                otherTestsTaken
                  ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] shadow-sm font-semibold ring-1 ring-[#FF5E00]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${otherTestsTaken ? 'text-[#FF5E00]' : 'text-slate-400'}`} />
              <span>Yes, I have taken GRE / GMAT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOtherTestsTaken(false);
                setGre('');
                setGmat('');
              }}
              className={`flex items-center justify-center gap-2 p-4 rounded-[6px] border font-medium text-sm transition-all ${
                !otherTestsTaken
                  ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] shadow-sm font-semibold ring-1 ring-[#FF5E00]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <HelpCircle className={`w-5 h-5 ${!otherTestsTaken ? 'text-[#FF5E00]' : 'text-slate-400'}`} />
              <span>No / Not required for my programmes</span>
            </button>
          </div>

          {/* Conditional GRE / GMAT Inputs */}
          {otherTestsTaken ? (
            <div className="p-4 bg-slate-50/80 rounded-[6px] border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B1026] uppercase tracking-wider">
                  Aptitude Test Scores
                </span>
                <span className="text-xs text-slate-400">Leave blank if not taken</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* GRE Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GRE General (260 – 340) <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="260"
                    max="340"
                    placeholder="e.g. 320"
                    value={gre}
                    onChange={(e) => setGre(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-white rounded-[6px] border text-sm text-[#0B1026] focus:outline-none focus:ring-2 focus:ring-[#FF5E00] ${
                      errors.gre ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {errors.gre && <p className="text-xs text-rose-600 mt-1">{errors.gre}</p>}
                </div>

                {/* GMAT Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GMAT (200 – 800) <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="200"
                    max="800"
                    step="10"
                    placeholder="e.g. 680"
                    value={gmat}
                    onChange={(e) => setGmat(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-white rounded-[6px] border text-sm text-[#0B1026] focus:outline-none focus:ring-2 focus:ring-[#FF5E00] ${
                      errors.gmat ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {errors.gmat && <p className="text-xs text-rose-600 mt-1">{errors.gmat}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#FF5E00] shrink-0 mt-0.5" />
              <span>
                GRE and GMAT are generally only required for specific competitive programmes (e.g. TUM Informatics for certain international degrees). Most European Master's and humanities programmes waive them.
              </span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SECTION 6: Study Destinations & Budget (Task §2.E)        */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0B1026]">6. Preferences & Budget</h2>
            <span className="text-xs text-slate-400">Target countries & finances</span>
          </div>

          {/* Preferred Countries Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-[#0B1026]">
                Target Study Destinations <span className="text-rose-500">*</span>
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
                    className={`p-3.5 rounded-[6px] border text-left transition-all ${
                      isSelected
                        ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] shadow-sm ring-1 ring-[#FF5E00]/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{c.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#FF5E00]" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.desc}</p>
                  </button>
                );
              })}
            </div>
            {errors.countries && <p className="text-xs text-rose-600 mt-1">{errors.countries}</p>}
          </div>

          {/* Budget Input & Details */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-[#0B1026]">
                Budget Amount (in EUR €) <span className="text-rose-500">*</span>
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
                className="w-full pl-9 pr-4 py-2.5 rounded-[6px] border border-slate-300 text-[#0B1026] focus:outline-none focus:ring-2 focus:ring-[#FF5E00] text-sm"
              />
            </div>

            {/* Real-time Indian Rupee (INR) Side-by-Side Display */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200/80 rounded-[6px] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  🇮🇳 Approx. in Indian Rupees:
                </span>
                <span className="font-extrabold text-emerald-950 text-sm">
                  {convertEurToInr(budget).inrCompact}
                </span>
                <span className="text-emerald-700 text-[11px] font-medium hidden sm:inline">
                  ({convertEurToInr(budget).inrFormatted})
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded-[4px] self-start sm:self-auto">
                1 EUR ≈ ₹91.25
              </span>
            </div>

            {/* Budget Timeframe & Coverage Options (§2.E) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Timeframe
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBudgetPeriod('annual')}
                    className={`py-2 px-3 text-xs rounded-[6px] border font-medium transition-all ${
                      budgetPeriod === 'annual'
                        ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] font-semibold ring-1 ring-[#FF5E00]/30'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Annual (Per Year)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetPeriod('total')}
                    className={`py-2 px-3 text-xs rounded-[6px] border font-medium transition-all ${
                      budgetPeriod === 'total'
                        ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] font-semibold ring-1 ring-[#FF5E00]/30'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Total Programme
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBudgetCovers('total_cost')}
                    className={`py-2 px-3 text-xs rounded-[6px] border font-medium transition-all ${
                      budgetCovers === 'total_cost'
                        ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] font-semibold ring-1 ring-[#FF5E00]/30'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tuition & Living
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetCovers('tuition_only')}
                    className={`py-2 px-3 text-xs rounded-[6px] border font-medium transition-all ${
                      budgetCovers === 'tuition_only'
                        ? 'border-[#FF5E00] bg-orange-50/50 text-[#0B1026] font-semibold ring-1 ring-[#FF5E00]/30'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tuition Only
                  </button>
                </div>
              </div>
            </div>

            {/* Scholarship Preference Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={scholarshipPreference}
                  onChange={(e) => setScholarshipPreference(e.target.checked)}
                  className="rounded border-slate-300 text-[#FF5E00] focus:ring-[#FF5E00] w-4 h-4"
                />
                <span>Actively seeking university scholarship or DAAD/government funding opportunities</span>
              </label>
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
                  className={`text-xs px-3 py-1.5 rounded-[6px] border transition-colors ${
                    budget === preset.val
                      ? 'bg-[#0B1026] border-[#0B1026] text-white font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {errors.budget && <p className="text-xs text-rose-600 mt-1">{errors.budget}</p>}
          </div>
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] font-semibold text-base shadow-md transition-all disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Saving Profile...' : 'Save & View University Matches'}</span>
            <ArrowRight className="w-5 h-5 text-[#0B1026]" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default OnboardingPage;
