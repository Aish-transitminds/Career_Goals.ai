/**
 * Atlas AI Architecture v2 - Function Calling Tools & Deterministic Calculators
 * All math, timelines, and profile checks are executed in code.
 * Gemini calls these tools or receives their pre-computed outputs.
 */

import { University, Country, UserProfile } from '../types';
import seedUniversities from '../data/universities.json';
import seedCountries from '../data/countries.json';
import {
  RequirementEvaluationResult,
  SearchProgramsParams,
  CompareProgramsParams,
  CalcEMIParams,
  BuildTimelineParams,
} from '../types/atlas';

export class AtlasToolRegistry {
  private universities: University[] = seedUniversities as unknown as University[];
  private countries: Country[] = seedCountries as unknown as Country[];
  private currentUserProfile: UserProfile | null = null;

  public setCatalog(universities: University[], countries: Country[]) {
    if (universities && universities.length > 0) this.universities = universities;
    if (countries && countries.length > 0) this.countries = countries;
  }

  public getCountry(id: string) {
    return this.countries.find((c) => c.id.toLowerCase() === id.toLowerCase()) || null;
  }

  public setUserProfile(profile: UserProfile | null) {
    this.currentUserProfile = profile;
  }

  /**
   * Tool 1: searchPrograms(country, degree, budget)
   * Returns concise program summaries matching criteria.
   */
  public searchPrograms(params: SearchProgramsParams = {}) {
    const { country, degree, budgetMaxEur } = params;
    return this.universities
      .filter((u) => {
        if (country && u.countryId.toLowerCase() !== country.toLowerCase()) return false;
        if (degree && !u.program.toLowerCase().includes(degree.toLowerCase())) return false;
        if (budgetMaxEur !== undefined && budgetMaxEur !== null) {
          // Parse rough tuition numeric
          const match = u.tuition.match(/€?([0-9,]+)/);
          if (match) {
            const num = parseInt(match[1].replace(/,/g, ''), 10);
            if (num > budgetMaxEur) return false;
          }
        }
        return true;
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        countryId: u.countryId,
        program: u.program,
        tuition: u.tuition,
        minIelts: u.requirements.min_ielts,
        deadline: u.requirements.application_deadline,
        sourceUrl: u.sourceUrl,
        lastChecked: u.lastChecked,
      }));
  }

  /**
   * Tool 2: getProgram(id)
   * Returns exact fact-keyed program record for admissions facts.
   */
  public getProgram(id: string) {
    const cleanId = id.trim().toLowerCase();
    const u = this.universities.find(
      (item) => item.id.toLowerCase() === cleanId || item.name.toLowerCase().includes(cleanId)
    );
    if (!u) {
      return { error: `Program with ID or name '${id}' was not found in verified catalog.` };
    }

    return {
      id: u.id,
      name: u.name,
      countryId: u.countryId,
      program: u.program,
      tuition: u.tuition,
      portalUrl: u.portalUrl,
      sourceUrl: u.sourceUrl,
      lastChecked: u.lastChecked,
      lastChanged: u.lastChanged || u.lastChecked,
      ruleChanged: u.ruleChanged,
      verificationNote: u.verificationNote || 'Verified on official admissions portal',
      requirements: {
        min_ielts: u.requirements.min_ielts,
        min_toefl: u.requirements.min_toefl,
        gre_required: u.requirements.gre_required,
        gmat_required: u.requirements.gmat_required,
        min_gre: u.requirements.min_gre ?? null,
        language_requirement: u.requirements.language_requirement,
        application_deadline: u.requirements.application_deadline,
        tuition_fee: u.requirements.tuition_fee,
        notes: u.requirements.notes,
      },
    };
  }

  /**
   * Tool 3: compare(ids)
   * Returns structured comparison matrix for 2-4 universities.
   */
  public compare(params: CompareProgramsParams) {
    const ids = params.programIds || [];
    const results = ids.map((id) => this.getProgram(id));
    return {
      comparedCount: results.length,
      programs: results,
    };
  }

  /**
   * Tool 4: calcEMI(loanAmountInr, annualInterestRatePercent, tenureYears)
   * Math calculated purely in code!
   */
  public calcEMI(params: CalcEMIParams) {
    const principal = params.loanAmountInr;
    const ratePercent = params.annualInterestRatePercent || 10.5;
    const tenureYears = params.tenureYears || 7;

    const monthlyRate = ratePercent / 12 / 100;
    const totalMonths = tenureYears * 12;

    // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    const emiMonthly = Math.round((principal * monthlyRate * factor) / (factor - 1));
    const totalPayable = emiMonthly * totalMonths;
    const totalInterest = totalPayable - principal;

    return {
      principalInr: principal,
      annualInterestRate: `${ratePercent}%`,
      tenureYears,
      totalMonths,
      monthlyEmiInr: emiMonthly,
      totalInterestInr: totalInterest,
      totalRepaymentInr: totalPayable,
      formatted: {
        monthlyEmi: `₹${emiMonthly.toLocaleString('en-IN')}`,
        totalRepayment: `₹${totalPayable.toLocaleString('en-IN')}`,
        totalInterest: `₹${totalInterest.toLocaleString('en-IN')}`,
      },
    };
  }

  /**
   * Tool 5: buildTimeline(targetDeadline, intakeStartDate)
   * Milestone dates computed backward from deadline in code.
   */
  public buildTimeline(params: BuildTimelineParams) {
    // Parse target date or use default for 2026/2027
    let deadlineDate: Date;
    if (params.targetDeadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
      deadlineDate = new Date(params.targetDeadline);
    } else {
      // Default to May 31, 2027 if string like "May 31 (Winter)"
      deadlineDate = new Date('2027-05-31');
    }

    const d = deadlineDate.getTime();
    const DAY = 24 * 60 * 60 * 1000;

    const milestones = [
      {
        milestone: 'Target Application Deadline',
        date: deadlineDate.toISOString().split('T')[0],
        offset: 'Day 0',
        note: 'Submit official application and uploaded credentials.',
      },
      {
        milestone: 'Final Document Review & Transcripts',
        date: new Date(d - 14 * DAY).toISOString().split('T')[0],
        offset: '2 weeks before deadline',
        note: 'Ensure degree certificates, transcripts, and APS/VPD (if Germany) are verified.',
      },
      {
        milestone: 'SOP & Letters of Recommendation Finalized',
        date: new Date(d - 45 * DAY).toISOString().split('T')[0],
        offset: '6 weeks before deadline',
        note: 'Complete university-specific motivation letter and collect sealed/online LoRs.',
      },
      {
        milestone: 'Language & GRE/GMAT Exam Completion',
        date: new Date(d - 90 * DAY).toISOString().split('T')[0],
        offset: '3 months before deadline',
        note: 'Last safe test date to ensure score delivery to portal before cutoff.',
      },
      {
        milestone: 'Shortlist & Document Preparation Kickoff',
        date: new Date(d - 180 * DAY).toISOString().split('T')[0],
        offset: '6 months before deadline',
        note: 'Finalize target course shortlist, check credit syllabus match, and open passport/exam booking.',
      },
    ];

    return {
      targetDeadline: params.targetDeadline,
      milestones,
    };
  }

  /**
   * Tool 6: getUserProfile()
   * Returns current active student test scores, budget, and qualifications.
   */
  public getUserProfile() {
    if (!this.currentUserProfile) {
      return {
        available: false,
        message: 'No student profile is currently saved in browser.',
      };
    }

    const p = this.currentUserProfile;
    return {
      available: true,
      name: p.name || 'Applicant',
      gpa: p.gpa ?? null,
      gpaScale: p.gpaScale || '10.0',
      qualification: p.qualification || null,
      fieldOfStudy: p.fieldOfStudy || null,
      budget: p.budget ?? null,
      targetCountries: p.targetCountries || [],
      exams: {
        ielts: p.exams?.ielts ?? null,
        toefl: p.exams?.toefl ?? null,
        gre: p.exams?.gre ?? null,
        gmat: p.exams?.gmat ?? null,
        pte: p.exams?.pte ?? null,
      },
    };
  }

  /**
   * Code-based Requirement Evaluator:
   * "Do I meet this requirement?" is 100% computed in code, not guessed by LLM.
   */
  public evaluateRequirements(programId: string): RequirementEvaluationResult | null {
    const prog = this.getProgram(programId);
    if ('error' in prog) return null;

    const profile = this.currentUserProfile;
    const req = prog.requirements;

    // IELTS check
    let ieltsMet: boolean | null = null;
    let ieltsNote = 'No IELTS score recorded in your profile.';
    if (req.min_ielts !== null && req.min_ielts !== undefined) {
      if (profile?.exams?.ielts !== null && profile?.exams?.ielts !== undefined) {
        ieltsMet = profile.exams.ielts >= req.min_ielts;
        ieltsNote = ieltsMet
          ? `Your IELTS ${profile.exams.ielts} meets the required ${req.min_ielts}.`
          : `Your IELTS ${profile.exams.ielts} is below the required ${req.min_ielts}.`;
      } else {
        ieltsNote = `Requires minimum IELTS ${req.min_ielts}. You haven't added a score yet.`;
      }
    } else {
      ieltsNote = 'No specific IELTS minimum required.';
    }

    // TOEFL check
    let toeflMet: boolean | null = null;
    let toeflNote = 'No TOEFL score recorded.';
    if (req.min_toefl !== null && req.min_toefl !== undefined) {
      if (profile?.exams?.toefl !== null && profile?.exams?.toefl !== undefined) {
        toeflMet = profile.exams.toefl >= req.min_toefl;
        toeflNote = toeflMet
          ? `Your TOEFL ${profile.exams.toefl} meets the required ${req.min_toefl}.`
          : `Your TOEFL ${profile.exams.toefl} is below the required ${req.min_toefl}.`;
      } else {
        toeflNote = `Requires minimum TOEFL ${req.min_toefl}.`;
      }
    }

    // GRE check
    let greMet: boolean | null = null;
    let greNote = 'GRE not required.';
    if (req.gre_required) {
      if (profile?.exams?.gre) {
        if (req.min_gre) {
          greMet = profile.exams.gre >= req.min_gre;
          greNote = greMet
            ? `Your GRE ${profile.exams.gre} meets the cutoff of ${req.min_gre}.`
            : `Your GRE ${profile.exams.gre} is below the cutoff of ${req.min_gre}.`;
        } else {
          greMet = true;
          greNote = `Your GRE ${profile.exams.gre} satisfies the mandatory GRE requirement.`;
        }
      } else {
        greMet = false;
        greNote = `Mandatory GRE is required${req.min_gre ? ` (min ${req.min_gre})` : ''}; none recorded in your profile.`;
      }
    }

    // GMAT check
    let gmatMet: boolean | null = null;
    let gmatNote = 'GMAT not required.';
    if (req.gmat_required) {
      if (profile?.exams?.gmat) {
        gmatMet = true;
        gmatNote = `Your GMAT score of ${profile.exams.gmat} is on file.`;
      } else {
        gmatMet = false;
        gmatNote = 'GMAT is required or recommended for this track; none recorded.';
      }
    }

    // GPA summary
    const gpaNote = profile?.gpa
      ? `Your GPA of ${profile.gpa} / ${profile.gpaScale || '10.0'} recorded.`
      : 'No GPA recorded in your profile.';

    // Overall summary sentence
    const unmetList: string[] = [];
    if (ieltsMet === false) unmetList.push('IELTS');
    if (greMet === false) unmetList.push('GRE');
    if (gmatMet === false) unmetList.push('GMAT');

    let overallSummary = '';
    if (unmetList.length === 0) {
      overallSummary = `You satisfy the confirmed requirements for ${prog.name} (${prog.program}).`;
    } else {
      overallSummary = `You meet some requirements, but your current scores do not meet the minimum for: ${unmetList.join(', ')}.`;
    }

    return {
      programId: prog.id,
      ielts: { required: req.min_ielts, user: profile?.exams?.ielts ?? null, met: ieltsMet, note: ieltsNote },
      toefl: { required: req.min_toefl, user: profile?.exams?.toefl ?? null, met: toeflMet, note: toeflNote },
      gre: { required: req.gre_required, user: profile?.exams?.gre ?? null, met: greMet, note: greNote },
      gmat: { required: req.gmat_required, user: profile?.exams?.gmat ?? null, met: gmatMet, note: gmatNote },
      gpa: { user: profile?.gpa ?? null, scale: profile?.gpaScale ?? null, note: gpaNote },
      overallSummary,
    };
  }
}

export const atlasToolRegistry = new AtlasToolRegistry();

/**
 * Gemini Function Calling Declarations
 * Passed in the `tools` parameter of the Gemini 2.5 Flash API request.
 */
export const GEMINI_ATLAS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'searchPrograms',
        description: 'Search admissions catalog by country (germany, ireland, uk), degree, or max budget in EUR.',
        parameters: {
          type: 'OBJECT',
          properties: {
            country: { type: 'STRING', enum: ['germany', 'ireland', 'uk'], description: 'Country filter' },
            degree: { type: 'STRING', description: 'Degree keyword, e.g. Computer Science, Informatics, Data' },
            budgetMaxEur: { type: 'NUMBER', description: 'Maximum tuition budget in EUR per year/semester' },
          },
        },
      },
      {
        name: 'getProgram',
        description: 'Retrieve verified official admissions facts, requirements, tuition, and deadlines for a specific university program.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING', description: 'Program identifier or university name (e.g. tum_informatics, manchester_cs)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'compare',
        description: 'Compare 2 to 4 university programs side by side.',
        parameters: {
          type: 'OBJECT',
          properties: {
            programIds: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Array of program IDs to compare',
            },
          },
          required: ['programIds'],
        },
      },
      {
        name: 'calcEMI',
        description: 'Calculate education loan monthly EMI and total repayment in INR using deterministic financial formulas.',
        parameters: {
          type: 'OBJECT',
          properties: {
            loanAmountInr: { type: 'NUMBER', description: 'Principal loan amount in Indian Rupees (INR)' },
            annualInterestRatePercent: { type: 'NUMBER', description: 'Annual interest rate percentage (e.g. 10.5)' },
            tenureYears: { type: 'NUMBER', description: 'Loan repayment tenure in years (e.g. 7)' },
          },
          required: ['loanAmountInr'],
        },
      },
      {
        name: 'buildTimeline',
        description: 'Compute admission milestone dates backward from an application deadline.',
        parameters: {
          type: 'OBJECT',
          properties: {
            targetDeadline: { type: 'STRING', description: 'Deadline date string (YYYY-MM-DD or descriptive like May 31)' },
            intakeStartDate: { type: 'STRING', description: 'Optional semester start date' },
          },
          required: ['targetDeadline'],
        },
      },
      {
        name: 'getUserProfile',
        description: 'Fetch the active student profile (GPA, IELTS/TOEFL scores, GRE/GMAT, budget) for personalized requirement evaluation.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ],
  },
];
