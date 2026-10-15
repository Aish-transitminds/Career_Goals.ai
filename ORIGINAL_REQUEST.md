# Original User Request

## 2026-10-15T14:13:01Z

Build "AbroadPath AI" — a study-abroad guide web app for a hackathon (submission deadline: 18 Oct 2026, today is 15 Oct 2026). The app collects a student's exam profile, suggests universities/countries with live-verified requirements from official sources, tracks application status with reminders, and provides a next-step roadmap after rejection. **Free tools only. Working demo of the core flow with real verified data.**

Working directory: c:\Users\Admin\Desktop\AI
Integrity mode: demo

## Requirements

### R1. Full-stack web application with core flow
Build a responsive web app using React + Vite + Tailwind + Firebase (Auth with Google sign-in, Firestore, Hosting). Implement these screens: landing/sign-in, onboarding (exam profile with GRE/GMAT/TOEFL/IELTS scores, preferred countries, budget), university matches (ranked by fit score), country guides (verified requirements with source URLs and dates), application tracker with login-time reminders, rejection roadmap with alternatives, letter helper (structure/prompts/checklist only — no AI-generated text), and a floating AI assistant widget. Lazy-load all routes.

### R2. Data integrity and verification
Every requirement shown to users must carry: sourceUrl, lastChecked date, and a "verify on the official site" note. Values not clearly stated by the source must be `null` and displayed as "not confirmed" — never guess or fill from memory. Seed data for 3 countries and ~10 universities must be sourced from official pages with real URLs and dates. Include one demo-seeded record with `demoSeeded = true` flag showing a before/after change (e.g., gmat_required null → true) for change-detection demonstration.

### R3. Live data pipeline with GitHub Actions
Python script run by a GitHub Actions cron job that: reads a `sources.json` whitelist of 5 official pages, checks robots.txt (in code, skipping disallowed URLs), fetches pages, computes content hashes, calls Gemini free-tier Flash only when content changes, validates extracted JSON against a strict schema, and writes to Firestore via Admin SDK. On extraction failure: preserve last known values and set `extractionFailed = true`. Detect rule changes and flag them with `ruleChanged`, `changedFields`, `previousValues`. Back off on 429 errors. Service account key stored in GitHub Actions secrets only.

### R4. Security and privacy
No API keys in frontend or git. Firestore rules: countries/universities read-only for authenticated users, no client writes; user data scoped to own uid with field type and score range validation (IELTS 0–9, TOEFL 0–120, GRE 260–340, GMAT 200–800). No student personal data sent to any LLM. 500-char input cap in UI and assistant. "Delete my data" button that removes user document and subcollections. Privacy note on landing page. `.env.example` committed, `.env` and service account files gitignored.

### R5. AI assistant via Firebase AI Logic
Floating chat widget (bottom-right) that answers questions using only Firestore country/university data, through Firebase AI Logic with App Check. If Firebase AI Logic does not work on the free Spark plan, fall back to a retrieval-only assistant (keyword search over Firestore + templated answers). Every answer must include a "verify on the official site" footer.

## Acceptance Criteria

### Core Flow (end-to-end)
- [ ] User can sign in with Google, complete onboarding (exams yes/no, scores, countries, budget), and see ranked university matches
- [ ] Matching logic: score-based ranking using met/near/below per requirement, `null` requirements excluded from scoring and shown as "not confirmed", labels Strong fit (≥0.9) / Possible (0.6–0.89) / Reach (<0.6), students with no exams see "Prep needed"
- [ ] Country guide shows language needs, document checklist, costs, official portal link, verified badge with source URL and date
- [ ] "Rule changed" banner appears on university/country pages when `ruleChanged = true`
- [ ] Application tracker: "I have applied" button sets status, login-time reminders generated from `appliedAt` (+1, +3, +7 days)
- [ ] Rejection path: mark as rejected → see next-step roadmap with alternative universities and static cost/loan estimate table (labeled "estimate, not financial advice")
- [ ] Letter helper shows structure outline, prompts, checklist, and sending tips — no AI-generated letter text
- [ ] AI assistant responds using only Firestore data, with "verify on the official site" footer

### Data Pipeline
- [ ] `sources.json` contains 5 real official page URLs
- [ ] Pipeline checks robots.txt before fetching and skips disallowed URLs
- [ ] LLM called only when content hash changes; hash-unchanged pages update `lastChecked` only
- [ ] Extraction output validated against schema; failures preserve last known values with `extractionFailed = true`
- [ ] Rule changes detected: `ruleChanged`, `changedFields`, `previousValues` written to Firestore
- [ ] GitHub Actions workflow file present and runs the pipeline successfully
- [ ] LLM calls wrapped in one swappable function; 429 errors trigger backoff

### Security
- [ ] `grep -r` of the repository finds no API keys, service account JSON, or secrets
- [ ] Firestore security rules deployed: countries/universities read-only for auth users, user data uid-scoped, score ranges validated
- [ ] "Delete my data" button functional — removes user doc and subcollections
- [ ] `.gitignore` covers `.env`, service account files, and `node_modules`

### Seed Data
- [ ] 3 countries and ~10 universities seeded with real sourceUrl, lastChecked dates
- [ ] No invented portal URLs, fees, or deadlines
- [ ] One record with `demoSeeded = true` and before/after values demonstrating change detection

### Verification
- [ ] A smoke-test script walks the core flow: sign in → onboard → match → apply → reject → roadmap, verifying each step produces expected UI state
- [ ] App deploys to Firebase Hosting and loads without console errors
- [ ] All routes are lazy-loaded

## Reference Material — Full Build Plan

The following is the complete build plan provided by the project owner. Follow it closely — it contains the data model, security rules, screen details, matching logic specifics, pipeline architecture, schedule, and constraints. Where it conflicts with the requirements above, the requirements above take precedence.

### Tech Stack
- Frontend: React + Vite + Tailwind, hosted on Firebase Hosting. Lazy-load routes.
- Auth: Firebase Auth (Google sign-in). Add the hosting domain to authorized domains.
- Database: Firestore
- Notifications: in-app only, generated on login/app open. FCM push is out of scope.
- Live data pipeline: Python script run by a GitHub Actions cron job (free), writes to Firestore with a service account stored in GitHub secrets.
- LLM: Gemini free-tier Flash model via Google AI Studio key. Wrap calls in one function so another free provider can be swapped in.
- AI assistant: Firebase AI Logic with App Check (Gemini called through Firebase, no raw key in client). If this doesn't work on the free Spark plan, fall back to retrieval-only (keyword search over Firestore + templated answers, no runtime LLM).
- Note: Firebase Cloud Functions need the Blaze plan (card required). The GitHub Actions route avoids this for the pipeline.

### Live Data Strategy

#### Legal and Ethical Guardrails
- Prefer official APIs, RSS, and open data over scraping.
- Use a whitelist of official pages only (university admission pages, DAAD, Study in Ireland, government portals).
- Check robots.txt and each site's terms before adding a URL. The scraper must also check robots.txt in code and skip disallowed URLs.
- Fetch rarely (daily or weekly), identify the bot with a User-Agent, never touch login-protected pages, add a delay between requests.
- Store extracted facts and the source link, not copied page text.
- Show "Verified on [date] - check the official page" in the UI.

#### Pipeline Steps
1. Read `sources.json` (whitelist: id, country, university, url, fields to extract).
2. Check robots.txt, fetch the URL, strip it to main text, compute a hash.
3. If hash unchanged: update `lastChecked` only.
4. If changed: send text to the LLM with a strict JSON schema, validate the output (types, ranges).
5. If validation fails or the LLM errors: keep the last known values, set `extractionFailed = true`, do not overwrite.
6. Compare with the previous values. If a field changed (example: GMAT now required), set `ruleChanged = true`, `changedFields`, `previousValues`.
7. Write to Firestore with `sourceUrl`, `lastChecked`, `lastChanged`.
8. Frontend shows a "Rule changed" banner to students targeting that university/country.
9. Cache: the LLM is only called when the hash changes. Back off on 429 errors.
10. Start with 5 sources. Add more only if time remains.

#### Extraction Schema
```json
{
  "gmat_required": true | false | null,
  "gre_required": true | false | null,
  "min_ielts": number | null,
  "min_toefl": number | null,
  "language_requirement": string | null,
  "tuition_fee": string | null,
  "application_deadline": string | null,
  "notes": string | null
}
```
Rule: if the page does not clearly state a value, return null. Never guess.

#### Demo Honesty Note
Real rule changes will not happen during the hackathon. For the demo, one university record is seeded with a before/after change (gmat_required null → true) and flagged `demoSeeded = true`. Say in the demo and submission text that this record demonstrates the change-detection flow, while the pipeline itself runs for real on the whitelisted pages.

### Data Model (Firestore)
- `users/{uid}`: name, examsTaken (bool), exams { gre, gmat, toefl, ielts } with scores, targetCountries, budget, createdAt
- `countries/{id}`: name, languageNote, documents[], visaNote, costRange, portalUrl, sourceUrl, lastChecked
- `universities/{id}`: countryId, name, program, requirements{...}, tuition, portalUrl, sourceUrl, lastChecked, lastChanged, ruleChanged, changedFields[], previousValues{}, extractionFailed, demoSeeded
- `users/{uid}/applications/{id}`: universityId, status (planned | applied | accepted | rejected), appliedAt, updatedAt
- `users/{uid}/notifications/{id}`: message, createdAt, read, applicationId, dueAt

### Security Rules (Firestore)
- `countries` and `universities`: read for signed-in users, no client writes (pipeline uses the Admin SDK).
- `users/{uid}` and everything under it: read/write only if `request.auth.uid == uid`.
- Validate field types and score ranges in rules (IELTS 0-9, TOEFL 0-120, GRE 260-340, GMAT 200-800). Reject unknown status values.
- Cap text input at 500 chars in the UI and in the proxy.
- Add a "Delete my data" button that removes the user document and its subcollections.
- Add a short privacy note on the landing page.
- Final review: no keys in the repo or bundle, `.gitignore` covers env and service account files, dependencies audited.

### Screens
1. Landing + Google sign-in
2. Onboarding: "Have you taken any exams?" Yes shows GRE/GMAT/TOEFL/IELTS fields. No shows a prep guidance path. Then preferred countries and budget.
3. Matches: universities ranked by the matching rule, filtered by country.
4. Country guide: language needs, documents checklist, costs, official portal button, verified badge, rule-changed banner.
5. Application tracker: "I have applied" button sets status to applied and starts reminders.
6. Reminders: generated on login/app open from `appliedAt` (+1, +3, +7 days), written to `notifications` if not already present.
7. Next path after rejection: roadmap, cost and loan estimate (static table, labeled "estimate, not financial advice"), alternative universities.
8. Letter helper: structure outline, prompts, checklist and how to send. No AI-written letter.
9. Floating AI assistant (bottom-right), with a "verify on the official site" footer on every answer.

### Matching Logic (no ML)
- Compare student's score with each requirement: met / near (within small margin, e.g. IELTS 0.5) / below.
- If requirement is `null`, treat as unknown: exclude from total, show "requirement not confirmed".
- Score = requirements met / known requirements, plus country-preference bonus and budget-fit bonus.
- Labels: Strong fit (≥0.9), Possible (0.6–0.89), Reach (<0.6). Keep thresholds in one config constant.
- If student has no exams, show all as "Prep needed" with missing exams listed.

### Facts to Verify Before Seeding
- Ireland: CAO is mainly for undergraduate applications. Many postgraduate courses use PAC or direct university applications. Confirm the correct portal per program level.
- Germany: public universities are often tuition-free, but not always (some states charge non-EU students, some master's programs charge fees). Confirm per university, and whether uni-assist or direct application is used.
- Every portalUrl, deadline, fee and test requirement comes from the official page, with sourceUrl and lastChecked.

### Rules for the Build
- Free tools only. Prioritize efficiency, security, performance.
- Never put API keys in the frontend or in git. Keys live in GitHub Actions secrets or in the server-side proxy secrets only. Commit a `.env.example`, never `.env`.
- The app does NOT write letters for students. It gives structure, prompts, a checklist and sending tips. The student writes the text.
- Every requirement shown to a student must carry: source URL, lastChecked date, and a "verify on the official site" note.
- Do not send student personal data to any LLM. Only public page text (pipeline) and the student's question plus public Firestore facts (assistant) may be sent.
- A value that is not clearly stated by the source is `null` and shown as "not confirmed". Never guess, never fill from memory.
- Keep scope small. Finish the core flow before any extra feature.
- Seed data must be copied from official pages by hand, with sourceUrl and date. No invented portals, fees or deadlines.

### Demo Script (2 minutes)
1. Sign in, fill profile with sample scores
2. Show matches and pick Germany
3. Show the verified requirements, source link, date, and the "rule changed" banner (state that this record is a seeded demonstration)
4. Open the official portal, press "I have applied", show the reminder
5. Mark as rejected, show the next-path roadmap
6. Open the letter helper and the AI pop-up
