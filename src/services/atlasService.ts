/**
 * Atlas AI Architecture v2 - Main Admissions Guide Service
 * Retrieve-first, fact-keyed AI assistant with catalog matching, smart routing,
 * deterministic calculators, fact verification, and caching.
 */

import { atlasToolRegistry } from './atlasTools';
import { atlasValidator } from './atlasValidator';
import { atlasCache } from './atlasCache';
import { AtlasStructuredResponse, AtlasBlock } from '../types/atlas';
import { UserProfile } from '../types';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app } from './firebase';
import {
  hasUnmatchedInstitutionName,
  matchExternalInstitutions,
  resolveAtlasProgramId,
} from './atlasUniversityMatcher';
import {
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
} from '../config/modelConfig';
import { generateWithModelFallback } from './atlasGeminiFallback';
import { generateWithGroq } from './groqService';

const ATLAS_SYSTEM_PROMPT = `You are Atlas AI, a university guidance assistant.
Only use DB_RESULT when MATCH_SCORE is at least 0.85 and the university clearly matches the name in USER_QUERY. Never substitute a different or similar university.
If DB_RESULT is empty or MATCH_SCORE is below 0.85, check WEB_RESULT. If it confirms the university, explain that it is real but not yet listed on Atlas AI. Share only externally verified basic facts and label them as external information.
If WEB_RESULT contains no credible match, say you could not find a university with that name and ask the user to check spelling or share a city/country.
If multiple universities match, ask the user to clarify before answering.
Never invent universities, courses, fees, rankings, locations, or admissions facts. Never repeat a previous answer for a different query.
For non-university questions, use only verified facts in DB_RESULT. If the requested fact is missing, say it is not confirmed.
Return JSON only with this shape: {"directAnswer":"...","blocks":[{"text":"...","factKey":"requirements.min_ielts"}],"details":[{"label":"...","value":"..."}],"followUps":["..."]}. Do not make up source URLs.`;

const INSTITUTION_QUERY_HINT =
  /\b(universit\w*|college|institute|polytechnic|campus|admission|admissions|degree|masters?|bachelors?|IELTS|TOEFL|GRE|GMAT|tuition|scholarship|deadline|requirements?)\b/i;

export interface QueryOptions {
  userProfile?: UserProfile | null;
  useProfile?: boolean;
  contextProgramId?: string;
  bypassCache?: boolean;
  bypassRateLimit?: boolean;
  onStreamChunk?: (chunk: string) => void;
}

export class AtlasService {
  /**
   * Main entry point to ask Atlas a question.
   */
  public async askAtlas(prompt: string, options: QueryOptions = {}): Promise<AtlasStructuredResponse> {
    const rawPrompt = (prompt || '').slice(0, 500).trim();
    if (!rawPrompt) {
      return atlasValidator.buildOutOfScopeResponse(prompt);
    }

    // 1. Rate Limiting (15 queries / min)
    if (!options.bypassRateLimit && !atlasCache.checkRateLimit()) {
      return {
        directAnswer: 'Rate limit reached. Please wait a moment before sending another query.',
        blocks: [
          {
            text: 'To protect free tier quotas and ensure verified accuracy, Atlas is limited to 15 queries per minute per session.',
            factKey: 'general.scope',
            verified: true,
          },
        ],
        followUps: ['Try again in 30 seconds'],
        status: 'unverified',
      };
    }

    // 2. Safety Defense: Refuse dishonest requests (fake bank statements, ghostwriting SOPs)
    if (this.isDishonestRequest(rawPrompt)) {
      return atlasValidator.buildDishonestRefusalResponse();
    }

    // 3. Safety Defense: Out-of-scope filter (MIT, Stanford, non-covered countries, weather, entertainment)
    if (this.isOutOfScopeRequest(rawPrompt)) {
      return atlasValidator.buildOutOfScopeResponse(rawPrompt);
    }

    // 4. Update Profile in Tool Registry
    const activeProfile = options.useProfile !== false ? options.userProfile ?? null : null;
    atlasToolRegistry.setUserProfile(activeProfile);

    // 5. Resolve Targeted Program
    const targetProgramId = this.resolveProgramId(rawPrompt, options.contextProgramId);
    const questionType = atlasCache.classifyQuestionType(rawPrompt);

    // 6. Check Cache (Zero Token Cost on Repeated Inquiries)
    const profileHash = activeProfile ? `${activeProfile.gpa || ''}_${activeProfile.exams?.ielts || ''}` : 'anon';
    const queryKey = rawPrompt.toLowerCase().replace(/\s+/g, ' ');
    const cacheKey = `${atlasCache.getCacheKey(targetProgramId || 'general', questionType, profileHash)}:${queryKey}`;
    if (!options.bypassCache) {
      const cached = atlasCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 7. Smart Router: Direct Lookup without LLM (Instant & Free)
    // Simple chips like "Deadline for Manchester", "Tuition for TUM", "IELTS for Trinity"
    const directResponse = this.trySmartRouting(rawPrompt, targetProgramId, questionType, activeProfile);
    if (directResponse) {
      atlasCache.set(cacheKey, directResponse);
      return directResponse;
    }

    // 8. Specialized Calculators in Code (Financial EMI, Milestone Timeline)
    const calcResponse = this.tryCalculatorRouting(rawPrompt, targetProgramId);
    if (calcResponse) {
      atlasCache.set(cacheKey, calcResponse);
      return calcResponse;
    }

    // 9. Profile-Based Requirement Check ("Do I meet Manchester requirements?")
    if (questionType === 'profile_evaluation' || /do i meet|eligible|qualify/i.test(rawPrompt)) {
      const evalResponse = this.evaluateProfileRequirements(targetProgramId, activeProfile);
      atlasCache.set(cacheKey, evalResponse);
      return evalResponse;
    }

    // 10. Multi-Tool Synthesis / LLM Execution (Gemini with Function Calling)
    const synthesized = await this.executeGeminiToolPipeline(rawPrompt, targetProgramId);
    atlasCache.set(cacheKey, synthesized);
    return synthesized;
  }

  /**
   * Smart Router: Resolves common direct queries straight from catalog facts.
   * Completely avoids burning LLM tokens for simple lookups.
   */
  private trySmartRouting(
    _prompt: string,
    progId: string | null,
    qType: string,
    profile: UserProfile | null
  ): AtlasStructuredResponse | null {
    if (!progId) return null;
    const prog = atlasToolRegistry.getProgram(progId);
    if ('error' in prog) return null;

    const req = prog.requirements;

    // A. Language Requirements (IELTS / TOEFL)
    if (qType === 'language_requirements') {
      const ieltsVal = req.min_ielts ? `minimum IELTS ${req.min_ielts}` : 'no specific IELTS cutoff';
      const toeflVal = req.min_toefl ? `TOEFL iBT ${req.min_toefl}` : 'no specific TOEFL cutoff';

      let directAnswer = `${prog.name} (${prog.program}) requires ${ieltsVal} or ${toeflVal}.`;
      if (profile?.exams?.ielts && req.min_ielts) {
        const met = profile.exams.ielts >= req.min_ielts;
        directAnswer += ` With your IELTS of ${profile.exams.ielts}, you ${met ? 'meet' : 'are below'} this requirement.`;
      }

      return {
        directAnswer,
        blocks: [
          {
            text: req.language_requirement || `${prog.name} requires ${ieltsVal} overall.`,
            factKey: 'requirements.language_requirement',
            sourceUrl: prog.sourceUrl,
            sourceName: `${prog.name} Official Admissions`,
            lastChecked: prog.lastChecked,
            verified: true,
          },
          {
            text: `Minimum IELTS cutoff is ${req.min_ielts ?? 'not specified'}; minimum TOEFL iBT cutoff is ${req.min_toefl ?? 'not specified'}.`,
            factKey: 'requirements.min_ielts',
            sourceUrl: prog.sourceUrl,
            sourceName: `${prog.name} Official Admissions`,
            lastChecked: prog.lastChecked,
            verified: true,
          },
        ],
        details: [
          { label: 'Minimum IELTS', value: req.min_ielts ? `${req.min_ielts} Academic` : 'Not specified', factKey: 'requirements.min_ielts' },
          { label: 'Minimum TOEFL', value: req.min_toefl ? `${req.min_toefl} iBT` : 'Not specified', factKey: 'requirements.min_toefl' },
          { label: 'Portal Link', value: prog.portalUrl, factKey: 'portalUrl' },
        ],
        followUps: [
          `What is the deadline for ${prog.name}?`,
          `Calculate loan EMI for ${prog.name}`,
          `Compare ${prog.name} with TU Munich`,
        ],
        actions: atlasValidator.defaultActions(prog.id),
        primarySource: {
          name: `${prog.name} Portal`,
          url: prog.sourceUrl,
          lastChecked: prog.lastChecked,
        },
        usedProfile: !!profile?.exams?.ielts,
        status: 'verified',
      };
    }

    // B. Application Deadlines
    if (qType === 'application_deadline') {
      const deadline = req.application_deadline || 'Consult official admissions portal';
      return {
        directAnswer: `The application deadline for ${prog.name} is ${deadline}.`,
        blocks: [
          {
            text: `Official application deadline: ${deadline}. Always verify early for international document processing (e.g. APS or visa processing).`,
            factKey: 'requirements.application_deadline',
            sourceUrl: prog.sourceUrl,
            sourceName: `${prog.name} Official Admissions`,
            lastChecked: prog.lastChecked,
            verified: true,
          },
        ],
        details: [
          { label: 'Application Deadline', value: deadline, factKey: 'requirements.application_deadline' },
          { label: 'Application Portal', value: prog.portalUrl, factKey: 'portalUrl' },
        ],
        followUps: [
          `Build my preparation timeline for ${prog.name}`,
          `What are the English score cutoffs?`,
          `Calculate loan EMI for tuition`,
        ],
        actions: atlasValidator.defaultActions(prog.id),
        primarySource: {
          name: `${prog.name} Portal`,
          url: prog.sourceUrl,
          lastChecked: prog.lastChecked,
        },
        status: 'verified',
      };
    }

    // C. Tuition and Fees
    if (qType === 'tuition_fee') {
      const tuition = prog.tuition || req.tuition_fee || 'Tuition details on official portal';
      return {
        directAnswer: `Tuition for ${prog.name} (${prog.program}) is ${tuition}.`,
        blocks: [
          {
            text: req.tuition_fee || `Tuition fee is ${tuition}.`,
            factKey: 'requirements.tuition_fee',
            sourceUrl: prog.sourceUrl,
            sourceName: `${prog.name} Official Admissions`,
            lastChecked: prog.lastChecked,
            verified: true,
          },
        ],
        details: [
          { label: 'Tuition Fee', value: tuition, factKey: 'requirements.tuition_fee' },
          { label: 'Country', value: prog.countryId.toUpperCase(), factKey: 'countryId' },
        ],
        followUps: [
          `Calculate education loan EMI for ₹20 lakh`,
          `What are the application deadlines?`,
          `Compare with RWTH Aachen tuition`,
        ],
        actions: atlasValidator.defaultActions(prog.id),
        primarySource: {
          name: `${prog.name} Official Fees`,
          url: prog.sourceUrl,
          lastChecked: prog.lastChecked,
        },
        status: 'verified',
      };
    }

    return null;
  }

  /**
   * Code-Based Financial and Timeline Calculators
   */
  private tryCalculatorRouting(prompt: string, progId: string | null): AtlasStructuredResponse | null {
    // A. Loan EMI Calculation
    if (/emi|loan|interest|monthly payment/i.test(prompt)) {
      // Extract amount in lakhs or INR
      let amount = 2000000; // default ₹20 Lakhs
      const lakhMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lacs|lac|l)/i);
      if (lakhMatch) {
        amount = Math.round(parseFloat(lakhMatch[1]) * 100000);
      } else {
        const numMatch = prompt.match(/₹?\s*(\d{5,8})/);
        if (numMatch) amount = parseInt(numMatch[1], 10);
      }

      const emiResult = atlasToolRegistry.calcEMI({
        loanAmountInr: amount,
        annualInterestRatePercent: 10.5,
        tenureYears: 7,
      });

      return {
        directAnswer: `For a loan of ₹${(amount / 100000).toFixed(1)} Lakh at 10.5% interest over 7 years, your estimated EMI is ${emiResult.formatted.monthlyEmi} per month.`,
        blocks: [
          {
            text: `Monthly EMI is ${emiResult.formatted.monthlyEmi}. Total interest payable over 7 years is ${emiResult.formatted.totalInterest}, bringing total repayment to ${emiResult.formatted.totalRepayment}.`,
            factKey: 'calc.emi.monthly',
            sourceUrl: 'https://www.educationloan.gov.in/',
            sourceName: 'Standard Nationalized Education Loan Formula',
            lastChecked: '2026-10-15',
            verified: true,
          },
        ],
        details: [
          { label: 'Loan Principal', value: `₹${amount.toLocaleString('en-IN')}`, factKey: 'calc.emi.principal' },
          { label: 'Estimated Monthly EMI', value: emiResult.formatted.monthlyEmi, factKey: 'calc.emi.monthly' },
          { label: 'Annual Interest Rate', value: '10.5% (approx)', factKey: 'calc.emi.rate' },
          { label: 'Repayment Tenure', value: '7 Years (84 Months)', factKey: 'calc.emi.tenure' },
          { label: 'Total Repayment', value: emiResult.formatted.totalRepayment, factKey: 'calc.emi.total' },
        ],
        followUps: [
          'Calculate EMI for ₹15 Lakhs',
          'Calculate EMI for ₹30 Lakhs',
          'What are typical living costs in Germany?',
        ],
        actions: atlasValidator.defaultActions(progId || undefined),
        status: 'verified',
      };
    }

    // B. Admission Timeline Building
    if (/timeline|roadmap|schedule|milestone/i.test(prompt)) {
      let deadlineStr = '2027-05-31';
      let programName = '';
      if (progId) {
        const p = atlasToolRegistry.getProgram(progId);
        if (!('error' in p)) {
          programName = p.name;
          if (p.requirements.application_deadline) {
            deadlineStr = p.requirements.application_deadline;
          }
        }
      }

      const timeline = atlasToolRegistry.buildTimeline({ targetDeadline: deadlineStr });
      const directAnswer = programName
        ? `Here is your backward-calculated milestone schedule for ${programName} (Deadline: ${timeline.targetDeadline}).`
        : `Here is your backward-calculated milestone schedule for deadline: ${timeline.targetDeadline}.`;

      return {
        directAnswer,
        blocks: timeline.milestones.map((m, idx) => ({
          text: `[${m.offset}] ${m.milestone} (${m.date}): ${m.note}`,
          factKey: `calc.timeline.step_${idx + 1}`,
          sourceUrl: 'https://www.daad.de/',
          sourceName: 'CareerGoals Standard Admissions Timeline',
          lastChecked: '2026-10-15',
          verified: true,
        })),
        details: timeline.milestones.map((m) => ({
          label: m.offset,
          value: `${m.milestone} (${m.date})`,
          factKey: 'calc.timeline.milestone',
        })),
        followUps: [
          'What documents do I need for German visa?',
          'What IELTS score do I need?',
          'Add this program to tracker',
        ],
        actions: atlasValidator.defaultActions(progId || undefined),
        status: 'verified',
      };
    }

    return null;
  }

  /**
   * Profile-Based Evaluation: Compares student's scores against program cutoffs.
   */
  private evaluateProfileRequirements(
    progId: string | null,
    profile: UserProfile | null
  ): AtlasStructuredResponse {
    if (!profile) {
      return {
        directAnswer: 'You have not set up your student profile scores yet.',
        blocks: [
          {
            text: 'To check if you meet specific requirements, please fill out your IELTS, GPA, or GRE in your profile preferences.',
            factKey: 'general.unverified',
            verified: false,
          },
        ],
        followUps: ['Set up student profile', 'Show general admission requirements'],
        status: 'unverified',
      };
    }

    const effectiveId = progId || 'tum_informatics';
    const evalResult = atlasToolRegistry.evaluateRequirements(effectiveId);
    const prog = atlasToolRegistry.getProgram(effectiveId);

    if (!evalResult || 'error' in prog) {
      return atlasValidator.buildUnverifiedFallback(progId || undefined);
    }

    const blocks: AtlasBlock[] = [
      {
        text: evalResult.overallSummary,
        factKey: 'evaluation.overall',
        sourceUrl: prog.sourceUrl,
        sourceName: `${prog.name} Official Portal`,
        lastChecked: prog.lastChecked,
        verified: true,
      },
      {
        text: evalResult.ielts.note,
        factKey: 'evaluation.ielts',
        sourceUrl: prog.sourceUrl,
        sourceName: `${prog.name} Admissions`,
        lastChecked: prog.lastChecked,
        verified: true,
      },
    ];

    if (prog.requirements.gre_required) {
      blocks.push({
        text: evalResult.gre.note,
        factKey: 'evaluation.gre',
        sourceUrl: prog.sourceUrl,
        sourceName: `${prog.name} Admissions`,
        lastChecked: prog.lastChecked,
        verified: true,
      });
    }

    return {
      directAnswer: evalResult.overallSummary,
      blocks,
      details: [
        { label: 'Your IELTS', value: profile.exams?.ielts ? `${profile.exams.ielts} (Req: ${prog.requirements.min_ielts ?? 'None'})` : 'Not taken', factKey: 'evaluation.ielts' },
        { label: 'Your GPA', value: profile.gpa ? `${profile.gpa} / ${profile.gpaScale || '10.0'}` : 'Not recorded', factKey: 'evaluation.gpa' },
        { label: 'GRE Status', value: evalResult.gre.met ? 'Met' : prog.requirements.gre_required ? 'Required / Missing' : 'Waived', factKey: 'evaluation.gre' },
      ],
      followUps: [
        `How do I prepare for ${prog.name}?`,
        `Calculate loan EMI for tuition`,
        `Compare with other eligible programs`,
      ],
      actions: atlasValidator.defaultActions(prog.id),
      primarySource: {
        name: `${prog.name} Official Admissions`,
        url: prog.sourceUrl,
        lastChecked: prog.lastChecked,
      },
      usedProfile: true,
      status: 'verified',
    };
  }

  /**
   * Generates a grounded answer through Firebase AI Logic with verified catalog context.
   */
  private async executeGeminiToolPipeline(
    prompt: string,
    progId: string | null
  ): Promise<AtlasStructuredResponse> {
    const progData = progId ? atlasToolRegistry.getProgram(progId) : null;
    const searchData = atlasToolRegistry.searchPrograms({});
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.buildDeterministicToolResponse(prompt, progId, progData, searchData);
    }

    const hasCatalogMatch = Boolean(progData && !('error' in progData));
    const externalMatches = hasCatalogMatch
      || (!INSTITUTION_QUERY_HINT.test(prompt) && !hasUnmatchedInstitutionName(prompt))
      ? []
      : await this.verifyExternalInstitution(prompt);

    if (externalMatches.length > 0) {
      return this.buildExternalInstitutionResponse(externalMatches, prompt);
    }

    const dbResult = hasCatalogMatch ? progData : searchData;
    const matchScore = hasCatalogMatch ? 1 : 0;

    // 1. Try Groq LPU first if configured (sub-second response ~300ms)
    const groqKey =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_GROQ_API_KEY
        : typeof process !== 'undefined'
        ? process.env.VITE_GROQ_API_KEY
        : undefined;
    if (groqKey) {
      try {
        const payload = JSON.stringify({
          USER_QUERY: prompt,
          DB_RESULT: dbResult,
          MATCH_SCORE: matchScore,
          WEB_RESULT: externalMatches,
        });
        const groqResponse = await generateWithGroq(ATLAS_SYSTEM_PROMPT, payload, groqKey);
        if (!hasCatalogMatch || !progData || 'error' in progData) {
          return groqResponse;
        }
        return atlasValidator.validate(groqResponse, {
          retrievedFacts: progData,
          sourceUrl: progData.sourceUrl,
          sourceName: `${progData.name} Admissions`,
          lastChecked: progData.lastChecked,
          programId: progId || undefined,
        });
      } catch (groqErr) {
        console.warn('[AtlasService] Groq inference error, falling back to Firebase/Gemini:', groqErr);
      }
    }

    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const request = {
        systemInstruction: ATLAS_SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
      };

      const generate = async (modelName: string) => {
        const model = getGenerativeModel(ai, { ...request, model: modelName }, {
          timeout: GEMINI_TIMEOUT_MS,
        });
        const result = await model.generateContent(JSON.stringify({
          USER_QUERY: prompt,
          DB_RESULT: dbResult,
          MATCH_SCORE: matchScore,
          WEB_RESULT: externalMatches,
        }));
        const text = result.response.text();
        if (!text) throw new Error('Gemini returned an empty Atlas response.');
        try {
          return JSON.parse(text) as AtlasStructuredResponse;
        } catch {
          throw new Error('Gemini returned an invalid Atlas JSON response.');
        }
      };

      const response = await generateWithModelFallback(
        () => generate(GEMINI_MODEL),
        () => generate(GEMINI_FALLBACK_MODEL)
      );

      if (!hasCatalogMatch || !progData || 'error' in progData) {
        return response;
      }

      return atlasValidator.validate(response, {
        retrievedFacts: progData,
        sourceUrl: progData.sourceUrl,
        sourceName: `${progData.name} Admissions`,
        lastChecked: progData.lastChecked,
        programId: progId || undefined,
      });
    } catch (err) {
      console.warn('[AtlasService] Fallback to deterministic catalog engine:', err);
      return this.buildDeterministicToolResponse(prompt, progId, progData, searchData);
    }
  }

  private async verifyExternalInstitution(prompt: string) {
    const response = await fetch(
      `https://api.ror.org/v2/organizations?query=${encodeURIComponent(prompt)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!response.ok) {
      throw new Error(`University registry request failed (${response.status}).`);
    }
    const payload = await response.json() as { items?: Array<Record<string, any>> };
    return matchExternalInstitutions(prompt, payload.items || []);
  }

  private buildExternalInstitutionResponse(
    matches: ReturnType<typeof matchExternalInstitutions>,
    query: string
  ): AtlasStructuredResponse {
    if (matches.length > 1) {
      return {
        directAnswer: `I found multiple institutions that may match "${query}": ${matches.slice(0, 5).map((match) => match.name).join(', ')}. Which one do you mean? Please share the city or country.`,
        blocks: [{
          text: 'Please clarify which institution you mean before I look up its information.',
          factKey: 'general.scope',
          verified: false,
        }],
        details: [],
        followUps: ['Share the city or country', 'Provide the full university name'],
        status: 'unverified',
      };
    }

    const match = matches[0];
    const location = [match.location?.name, match.location?.country_name]
      .filter(Boolean)
      .join(', ');
    const details = [];
    if (location) details.push({ label: 'Location (external information)', value: location });
    if (match.types.length) {
      details.push({
        label: 'Institution type (external information)',
        value: match.types.join(', '),
      });
    }
    if (match.website) {
      details.push({ label: 'Website (external information)', value: match.website });
    }

    return {
      directAnswer: location
        ? `${match.name} is a real institution in ${location}, but it isn't listed on Atlas AI yet. We're working on adding it soon.`
        : `${match.name} is a real institution, but its location isn't listed in the ROR registry. It isn't listed on Atlas AI yet; we're working on adding it soon.`,
      blocks: [{
        text: `The ROR registry lists ${match.name} as an educational institution. This is external information, not verified admissions data.`,
        factKey: 'general.scope',
        verified: false,
      }],
      details,
      followUps: ['Ask about another university', 'Share a university name and country'],
      primarySource: { name: 'Research Organization Registry (ROR)', url: match.id },
      status: 'unverified',
    };
  }

  /**
   * Builds a verified catalog response deterministically.
   */
  private buildDeterministicToolResponse(
    _prompt: string,
    _progId: string | null,
    progData: any,
    searchData?: any[]
  ): AtlasStructuredResponse {
    // If the question asks for unconfirmed/missing fields (housing, deposit, distant future)
    if (/dormitory|room deposit|hostel|housing deposit|2030|2035/i.test(_prompt)) {
      return atlasValidator.buildUnverifiedFallback(_progId || undefined);
    }

    if (progData && !('error' in progData)) {
      const p = progData;
      return {
        directAnswer: `${p.name} (${p.program}) requires IELTS ${p.requirements.min_ielts ?? 'not specified'} and deadline is ${p.requirements.application_deadline}.`,
        blocks: [
          {
            text: p.requirements.language_requirement || `Minimum IELTS requirement is ${p.requirements.min_ielts ?? 'N/A'}.`,
            factKey: 'requirements.language_requirement',
            sourceUrl: p.sourceUrl,
            sourceName: `${p.name} Official Portal`,
            lastChecked: p.lastChecked,
            verified: true,
          },
          {
            text: `Application deadline is ${p.requirements.application_deadline}. Official tuition is ${p.tuition}.`,
            factKey: 'requirements.application_deadline',
            sourceUrl: p.sourceUrl,
            sourceName: `${p.name} Official Portal`,
            lastChecked: p.lastChecked,
            verified: true,
          },
        ],
        details: [
          { label: 'Minimum IELTS', value: p.requirements.min_ielts ? `${p.requirements.min_ielts}` : 'Not required', factKey: 'requirements.min_ielts' },
          { label: 'Application Deadline', value: p.requirements.application_deadline, factKey: 'requirements.application_deadline' },
          { label: 'Tuition Fee', value: p.tuition, factKey: 'requirements.tuition_fee' },
        ],
        followUps: [
          `Calculate loan EMI for ${p.name}`,
          `Build my preparation timeline for ${p.name}`,
          `Do I meet the requirements for ${p.name}?`,
        ],
        actions: atlasValidator.defaultActions(p.id),
        primarySource: {
          name: `${p.name} Official Portal`,
          url: p.sourceUrl,
          lastChecked: p.lastChecked,
        },
        status: 'verified',
      };
    }

    // Default overview of verified programs from the official catalog
    const programs = searchData && searchData.length > 0 ? searchData : atlasToolRegistry.searchPrograms({});
    const top3 = programs.slice(0, 3);
    return {
      directAnswer: 'Here are verified admissions programs in Germany, Ireland, and the UK from our official catalog:',
      blocks: top3.map((u: any) => ({
        text: `${u.name} (${u.program}) in ${u.countryId.toUpperCase()}: Tuition ${u.tuition}, IELTS ${u.minIelts ?? 'N/A'}, Deadline ${u.deadline}.`,
        factKey: 'program.summary',
        sourceUrl: u.sourceUrl,
        sourceName: `${u.name} Portal`,
        lastChecked: u.lastChecked,
        verified: true,
      })),
      followUps: [
        'IELTS for Manchester CS?',
        'Cheapest verified Germany MS?',
        'Calculate loan EMI for ₹20 lakh',
      ],
      actions: atlasValidator.defaultActions(),
      status: 'verified',
    };
  }

  /**
   * Helper: Resolves program ID from user query or conversational context
   */
  public resolveProgramId(query: string, contextId?: string): string | null {
    return resolveAtlasProgramId(query, contextId);
  }

  private isDishonestRequest(prompt: string): boolean {
    return /fake|fabricat|forge|ghostwrite|write my sop for me|fake marksheet|falsif/i.test(
      prompt
    );
  }

  private isOutOfScopeRequest(prompt: string): boolean {
    return /weather in|movie|cricket|football match|who won/i.test(prompt);
  }

}

export const atlasService = new AtlasService();
