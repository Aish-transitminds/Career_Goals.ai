# CareerGoals.ai (AbroadPath)

> **Live Application**: [https://careergoals-296e4.web.app](https://careergoals-296e4.web.app)

An intelligent, ethical, zero-hallucination study-abroad decision platform. Built for students targeting international master's programs, CareerGoals.ai combines deterministic client-side matching, verifiable source provenance, in-app milestone reminders, and an ethical SOP guide with strict privacy invariants.

---

## Architecture & Decision Flow

```mermaid
flowchart TD
    %% Subgraph 1: Zero-Hallucination Pipeline
    subgraph Pipeline ["1. Zero-Hallucination Data Pipeline"]
        direction TB
        A["Official University Portals"] --> B["Polite Crawler<br/>(robots.txt Compliant)"]
        B --> C["SHA-256 Change Detector"]
        C -->|Content Changed| D["Gemini Flash Extraction"]
        C -->|Unchanged| E["Refresh Audit Timestamp"]
        D --> F["Strict Pydantic Sanity Check"]
        F --> G[("Verified Firestore Catalog<br/>(Verbatim Quotes & Source Citations)")]
    end

    %% Subgraph 2: Deterministic Match & Scoring Engine
    subgraph Matching ["2. Deterministic Matching Engine"]
        direction TB
        H["Student Profile<br/>(GPA, Scores, Budget, Countries)"]
        G --> I["Requirement Scoring<br/>(Met / Near / Below Cutoffs)"]
        H --> I
        I --> J{"Fit Classification"}
        J -->|Score >= 0.90| K["Strong Fit"]
        J -->|Score 0.60 - 0.89| L["Possible"]
        J -->|Score < 0.60| M["Reach"]
        J -->|No Exams Taken| N["Prep Needed"]
    end

    %% Subgraph 3: Student Experience & Decision Hub
    subgraph Decision ["3. Student Decision Experience"]
        direction TB
        K --> O["Multi-Factor Reranker<br/>(35% Budget | 30% Margin | 25% Certainty | 10% Freshness)"]
        L --> O
        M --> O
        O --> P["Transparent University Cards<br/>('Ranked higher because...' Badge)"]
        N --> Q["Actionable Exam Prep Roadmap"]
        P --> R["In-App Milestone Tracker"]
        P --> S["Ethical SOP Writing Guide"]
    end
```

---

## Honest Project Scope

- **Primary Focus**: European graduate education with a core emphasis on **Germany** (public tuition-free universities, DAAD requirements, APS certificates, ECTS credit conversions), supplemented by representative institutions in **Ireland** and the **United Kingdom**.
- **Verified Institutions**: **11 fully audited university programs** cataloged with 100% verified source provenance (verbatim quotes, direct links, and audit dates).
- **Zero Hallucination Policy**: Every single admission requirement displays its official source link, verification date, and verbatim official snippet. Unconfirmed fields remain `null` and display *"Unconfirmed, verify on official portal"*. No LLM ever guesses or predicts missing requirements.

---

## How Matching & Reranking Work

### 1. Primary Fit Tier Formula (Deterministic)

Admission tiers are evaluated purely algorithmically:
$$\text{Base Score} = \frac{\sum \text{Evaluated Requirement Scores}}{\text{Number of Confirmed Requirements}}$$

- **Per-Requirement Scores**:
  - `1.0` (Met): Student score meets or exceeds requirement cutoff.
  - `0.5` (Near): Student score is within near margin (IELTS within 0.5, TOEFL within 5, GRE within 5, GMAT within 20).
  - `0.0` (Below): Student score is below cutoff.
  - *Null Exclusion*: Unconfirmed requirements are completely excluded from the denominator to avoid penalizing students for university data gaps.
- **Bonuses**: +0.05 Country Preference match, +0.05 Budget Fit (Total capped strictly at `1.00`).
- **Fit Tiers**:
  - **Strong Fit**: Final Score $\ge 0.90$ (90%+)
  - **Possible**: Final Score $0.60 - 0.89$ (60% – 89%)
  - **Reach**: Final Score $< 0.60$ (< 60%)
  - **Prep Needed**: Triggered when a student has not taken required exams or has missing mandatory exam scores. Rather than rejecting, the system outlines the specific exams needed.

### 2. Secondary Tier Reranking Formula (No LLM)

Within each tier, universities are reranked using a deterministic multi-factor weighted score defined in `TIER_RANK_WEIGHTS`:
$$\text{Rank Score} = 0.35 \times \text{BudgetFit} + 0.30 \times \text{ScoreMargin} + 0.25 \times \text{ConfirmedDataRatio} + 0.10 \times \text{Freshness}$$

- **Budget Fit (35%)**: Compares annual tuition against the student's declared INR/EUR budget (100% tuition-free programs earn maximum weight).
- **Score Margin (30%)**: Measures how comfortably the student exceeds the cutoffs.
- **Data Certainty (25%)**: Prioritizes institutions with fewer unconfirmed (null) requirements.
- **Data Freshness (10%)**: Favors recently verified institutional requirements.
- **Card Explanation**: Each university card displays a transparent *"Ranked higher because..."* badge citing the exact reason.

---

## Provenance & Verification

1. **Verbatim Snippets**: Every requirement in the catalog is stored alongside its verbatim quote from the university's official site.
2. **Sanity Range Enforcement**: All extracted values are validated against strict ranges:
   - IELTS: `0.0 – 9.0` (step 0.5)
   - TOEFL: `0 – 120`
   - GRE: `260 – 340`
   - GMAT: `200 – 800`
   - GPA: Validated strictly against its declared scale (e.g. 4.0, 10.0, 5.0)
3. **Weekly Change Detection**: Python scraper computes SHA-256 hashes of portal contents. Unchanged pages bypass LLM extraction. Detected changes trigger live alert banners in the UI (demonstrated live with TUM's GMAT rule update).

---

## Security & Privacy Invariants

- **Zero Student Data Sent to LLMs**: Neither student names, scores, documents, nor profiles are ever transmitted in LLM prompts.
- **Floating AI Assistant Lockdown**: Operates strictly on verified Firestore catalog facts. Queries outside the catalog (e.g. *"What is MIT's acceptance rate?"*) explicitly state that the information is not in the verified catalog and direct students to official portals.
- **Firestore Security Rules**: Authenticated owner-only access for `users/{uid}`, read-only for public catalog, with database-level score boundary checks.
- **Cascading Data Purge**: One-click *"Delete My Data"* purges all user profile, application, and notification documents immediately.

---

## Quickstart & Demo Profiles

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm 9+

### 2. Installation
```bash
git clone https://github.com/Aish-transitminds/Career_Goals.ai.git
cd Career_Goals.ai
npm install
```

### 3. Local Development Server
```bash
npm run dev
```

### 4. Run Automated Test Suites
```bash
npm run test:match       # 74 Match engine & reranking tests
npm run test:rules       # 206 Firestore security rules & hygiene tests
npm run test:assistant   # AI Assistant lockdown & out-of-catalog tests
npm run test:pipeline    # Scraper pipeline sanity & Pydantic validation tests
```

### 5. Production Build
```bash
npm run build
```

### Pre-Configured Demo Profiles
The landing page includes instant one-click demo logins:
1. **Standard Demo Student (`Alex Chen`)**: IELTS 7.5, GRE 320, Target: Germany/Ireland, Budget: €15,000. Demonstrates strong fits, criterion breakdowns, and live rule-change alerts.
2. **Prep Needed Demo (`Jordan Lee`)**: No exams taken yet (`examsTaken: false`). Demonstrates the educational "Prep Needed" path routing.
3. **Low Budget Demo (`Maria Santos`)**: Budget €3,000. Demonstrates budget reranking favoring tuition-free German universities.
