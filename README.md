# CareerGoals.ai 🎓 (AbroadPath)

> **Live Application**: [https://careergoals-296e4.web.app](https://careergoals-296e4.web.app)  
> **Submissions & Hackathon Edition**: October 2026

An intelligent, ethical study-abroad guidance platform that collects a student's profile, matches universities with deterministic fit-scoring, displays live-verified admission criteria, tracks applications with automated reminders, provides post-rejection recovery roadmaps, and features a factual AI assistant grounded exclusively in official data.

---

## 🌟 Key Features

1. **Deterministic University Matching (No Hallucinations)**:
   - Compares student test scores (IELTS, TOEFL, GRE, GMAT) against strict university criteria (`met` / `near` / `below`).
   - Strict `null` requirement policy: unconfirmed requirements are excluded from totals and clearly flagged as *"not confirmed"*.
   - Categorizes matches into **Strong Fit (≥90%)**, **Possible (60–89%)**, and **Reach (<60%)**.
   - Students without exam scores receive a dedicated **"Prep Needed"** guidance path.

2. **Official Source Verification & Live Change Detection**:
   - Every requirement displays a direct link to the official university portal, the audit date, and a *"Verify on the official site"* reminder.
   - Built-in demonstration record (`Technical University of Munich`) highlights real-time rule changes (`demoSeeded = true`) with prominent alert banners.

3. **Application Tracker & Login-Time Reminders**:
   - One-click application status tracking (`planned` ➔ `applied` ➔ `accepted` / `rejected`).
   - Automatically schedules Day +1, Day +3, and Day +7 follow-up reminders in an interactive notification drawer upon login.

4. **Rejection Recovery Roadmap & Static Financial Estimates**:
   - Diagnostic root-cause guidance and profile-filtered alternative university recommendations.
   - Static tuition & living cost breakdown labeled explicitly as *"estimate, not financial advice"*.

5. **Self-Guided Letter Helper (100% Ethical)**:
   - 6-part structural outline, guiding prompts, and a submission checklist for Statements of Purpose (SOP).
   - **Zero AI-generated letters**: Empowering students to write in their own authentic voice.

6. **Grounding Floating AI Assistant**:
   - Floating widget with a 500-character universal input limit.
   - Answers questions strictly using factual Firestore catalog data with a mandatory verification disclaimer footer on every response.

7. **Student Privacy (R4 Compliant)**:
   - Zero student personal data (names, test scores, or documents) is ever sent to any third-party LLM.
   - One-click **"Delete My Data"** cascading purge.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide Icons
- **Routing**: `React.lazy()` route-level code splitting across all 7 views
- **Authentication**: Firebase Authentication (Google Sign-In) with mock fallback
- **Database & Security**: Cloud Firestore with strict type and score-boundary security rules (`firestore.rules`)
- **Hosting**: Firebase Hosting with immutable caching
- **Live Data Ingestion Pipeline**: Python 3.11 with:
  - `robots.txt` compliance check (`urllib.robotparser`)
  - SHA-256 content hashing to bypass LLM calls on unchanged pages
  - Gemini 1.5 Flash structured extraction with exponential backoff on HTTP 429
  - Strict Pydantic schema validation & change detection
- **Automation**: GitHub Actions cron workflow (`.github/workflows/data_pipeline.yml`)

---

## 🔒 Security & Privacy Guardrails

- **Zero API Keys in Client / Git**: All secrets are stored exclusively in GitHub Actions secrets or local `.env` files.
- **Strict Firestore Rules**:
  - `countries` and `universities` are read-only to authenticated users (writes restricted to backend pipeline).
  - Student data under `users/{uid}` is strictly isolated to the authenticated owner.
  - Hard score limits enforced in database rules: IELTS (0–9), TOEFL (0–120), GRE (260–340), GMAT (200–800).

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Aish-transitminds/Career_Goals.ai.git
cd Career_Goals.ai
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in your Firebase public web configuration in .env
```

### 3. Run Dev Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🧪 Automated Testing

AbroadPath AI includes 101 automated unit and stress tests:
- `matchEngine.test.ts`: 56 assertions covering met/near/below scoring, null policies, and fit tiers.
- `reminderEngine.test.ts`: 21 assertions verifying deterministic timeline calculations.
- `sparkFallbackEngine.test.ts`: 24 assertions testing entity aliasing and prompt sanitization.

---

## 👥 Contributors & Collaborators

- **Primary Repository**: [Aish-transitminds/Career_Goals.ai](https://github.com/Aish-transitminds/Career_Goals.ai)
- **Collaborator**: [@kdrd004](https://github.com/kdrd004)
