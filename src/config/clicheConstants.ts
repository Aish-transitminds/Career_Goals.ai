/**
 * AbroadPath AI - Letter Helper Cliché, Boilerplate & Pedagogy Constants
 * File: src/config/clicheConstants.ts
 *
 * Configurable list of generic clichés, AI boilerplate expressions,
 * vague intensifiers, and fictional pedagogical examples for statement of purpose coaching.
 */

// AI Boilerplate and formulaic academic clichés
export const AI_BOILERPLATE_PATTERNS: string[] = [
  'testament to',
  'delve into',
  'delving into',
  'beacon of',
  'tapestry',
  'rich tapestry',
  'ever since i was',
  'ever since childhood',
  'since my childhood',
  'from a young age',
  'as long as i can remember',
  "in today's fast-paced world",
  "in today's rapidly changing world",
  'in the contemporary era',
  'realm of',
  'plethora',
  'myriad',
  'paradigm shift',
  'foster a',
  'furthermore, it is crucial',
  'harness the power of',
  'poised to',
  'pivotal role',
  'cornerstone of',
  'unwavering passion',
  'insatiable curiosity',
  'boundless curiosity',
  'stepping stone',
  'embark on a journey',
  'indelible mark',
  'unparalleled opportunity',
  'humble beginnings',
  'fervent desire',
  'deep-seated passion',
  'sparked my fascination',
];

// Vague intensifiers and unsupported self-proclamations
export const VAGUE_INTENSIFIER_PATTERNS: string[] = [
  'very passionate',
  'deeply passionate',
  'extremely passionate',
  'truly passionate',
  'always loved',
  'always had a passion',
  'hard-working',
  'hard working',
  'hardworking',
  'quick learner',
  'fast learner',
  'highly motivated',
  'born leader',
  'natural problem solver',
  'perfectionist',
  'great team player',
  'dream university',
  'prestigious university',
  'world-renowned institution',
  'undisputed leader',
  'tireless worker',
];

// Common English stopwords to ignore when analyzing meaningful word repetition
export const STOP_WORDS = new Set<string>([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'am', 'are', 'was', 'were', 'been', 'being', 'had', 'has', 'having',
]);

// Fictional pedagogical examples for the 6 sections (Weak vs Stronger pattern)
// Strictly fictional, labeled for pedagogical comparison only (not for copying).
export interface SectionCoachingContent {
  sectionId: string;
  whatCommitteesLookFor: string;
  wordBudgetGuide: { words: number; note: string };
  reflectionQuestions: string[];
  weakPattern: {
    label: string;
    text: string;
    whyItWeakens: string;
  };
  strongerPattern: {
    label: string;
    text: string;
    whyItWorks: string;
  };
}

export const SECTION_COACHING_DATA: Record<string, SectionCoachingContent> = {
  intro: {
    sectionId: 'intro',
    whatCommitteesLookFor:
      'Faculty readers want an immediate, mature entry point. They look for the exact program you are targeting, followed by the specific technical question or intellectual catalyst that brought you to graduate study, without dramatic origin stories.',
    wordBudgetGuide: {
      words: 100,
      note: 'Approx. 80–120 words (guide only; verify program-specific instructions).',
    },
    reflectionQuestions: [
      'What concrete observation, experiment, or technical failure first compelled you to investigate this specific field beyond normal coursework?',
      'What specific question or gap in your current understanding do you plan to explore in this master’s program?',
      'If you had to summarize your academic purpose in one sentence without using words like "passion" or "dream", what would it be?',
    ],
    weakPattern: {
      label: 'Weak: Vague childhood nostalgia with no technical anchor',
      text: 'Ever since I was ten years old assembling my first toy circuits, technology has been my true calling. In today’s fast-paced world, artificial intelligence is transforming humanity, and my insatiable curiosity drives me to seek this prestigious degree.',
      whyItWeakens:
        'Relies on generic childhood cliches, broad buzzwords, and gives zero information about the student’s actual undergraduate focus or research questions.',
    },
    strongerPattern: {
      label: 'Stronger: Grounded academic catalyst with specific technical focus',
      text: '[Fictional Illustrative Example] While benchmarking latency on quantized neural networks for our embedded vision lab at State Tech University, I observed a 40% accuracy degradation when processing low-contrast sensor streams. This limitation led me to pursue the M.Sc. in Computer Science at University of Munich, focusing on efficient model compression and hardware-aware distributed inference.',
      whyItWorks:
        'Names the specific experiment, metric (40% degradation), subfield (model compression), and exact target program, establishing immediate scholarly credibility.',
    },
  },
  academic: {
    sectionId: 'academic',
    whatCommitteesLookFor:
      'Committees do not need a narrative repetition of your transcript. They evaluate depth of engagement: how you applied methodologies, handled edge cases, worked through technical setbacks, and produced verifiable outcomes.',
    wordBudgetGuide: {
      words: 200,
      note: 'Approx. 180–220 words (guide only; expand if your program stresses research experience).',
    },
    reflectionQuestions: [
      'What was the single most technically challenging project you led, and what specific architecture, tool, or mathematical theory did you implement?',
      'What went wrong during implementation, and what diagnostic steps did you take to troubleshoot or redesign the system?',
      'What quantifiable benchmark, test result, or concrete artifact (e.g. GitHub repository, benchmark score, paper preprint) resulted from your work?',
      'How does this undergraduate project directly prepare you for the advanced seminars in your target graduate syllabus?',
    ],
    weakPattern: {
      label: 'Weak: Laundry list of coursework with subjective praise',
      text: 'During my undergraduate studies, I took Data Structures, Operating Systems, and Machine Learning, scoring high marks in all of them. I was a hardworking student and completed a great project on facial recognition using Python, which taught me that I am a quick learner.',
      whyItWeakens:
        'Merely repeats course names already visible on the official transcript, praises oneself as a "quick learner", and describes the project with zero technical substance.',
    },
    strongerPattern: {
      label: 'Stronger: Evidenced project narrative detailing decisions and metrics',
      text: '[Fictional Illustrative Example] For my final-year capstone project, I engineered an anomaly-detection pipeline for simulated turbine telemetry. Utilizing PyTorch and Apache Kafka, I processed 25,000 sensor readings per second. When our initial baseline LSTM overfitted on periodic drift (0.71 F1-score), I introduced temporal convolutional blocks with attention pooling, elevating the F1-score to 0.89 while reducing inference memory overhead by 18%.',
      whyItWorks:
        'Quotes specific tools (PyTorch, Kafka), datasets (25k readings/sec), baseline challenges, the technical redesign decision, and verified percentage improvements.',
    },
  },
  why_course: {
    sectionId: 'why_course',
    whatCommitteesLookFor:
      'Readers assess curricular alignment. They check whether you have opened their module catalog, identified specific coursework or seminar tracks, and explained why this exact curriculum fills your specific knowledge gaps.',
    wordBudgetGuide: {
      words: 150,
      note: 'Approx. 130–170 words (guide only; balance evenly with institutional reasons).',
    },
    reflectionQuestions: [
      'Which exact two modules or seminar tracks in the course handbook align directly with your research or career goals?',
      'What specific concept or methodology taught in those modules is absent from your undergraduate training?',
      'How will the specific coursework structure (e.g., practical lab projects, seminar papers, master’s thesis) advance your intended thesis project?',
    ],
    weakPattern: {
      label: 'Weak: Generic praise that could apply to any syllabus in Europe',
      text: 'Your master’s curriculum offers an outstanding balance of theoretical knowledge and practical applications. The courses in AI and big data will give me the tools I need to succeed in my career and fulfill my lifelong dreams.',
      whyItWeakens:
        'Cites no specific module names or syllabi; could be sent to 20 different universities without changing a single word.',
    },
    strongerPattern: {
      label: 'Stronger: Curricular specificity referencing exact modules and skill gaps',
      text: '[Fictional Illustrative Example] To expand my background from heuristic data analysis to formal safety verification, I intend to take the elective module "Verification of Autonomous Systems" (IN2315) and the seminar in "Hardware-Software Co-Design". The hands-on laboratory in real-time embedded synthesis directly addresses my lack of formal training in FPGA verification, providing the exact foundation needed for my planned thesis on resilient robotics.',
      whyItWorks:
        'Identifies exact module titles and codes, acknowledges an honest knowledge gap (FPGA verification), and links the coursework directly to thesis plans.',
    },
  },
  why_university: {
    sectionId: 'why_university',
    whatCommitteesLookFor:
      'Faculty want to know why you belong at their specific institution. They look for awareness of active research chairs, specialized laboratory equipment, collaborative institutes, and distinct pedagogical approaches.',
    wordBudgetGuide: {
      words: 150,
      note: 'Approx. 130–170 words (guide only).',
    },
    reflectionQuestions: [
      'Which specific lab group, research chair, or institute at the university produces work you have read or admire?',
      'What recent paper or technical report from that group caught your attention, and what question did it leave you with?',
      'What practical facilities (e.g. compute clusters, cleanrooms, industrial partnerships) make this location uniquely suited for your work?',
    ],
    weakPattern: {
      label: 'Weak: Institutional flattery and tourism focus',
      text: 'Heidelberg is Germany’s oldest university, world-renowned for its heritage and beautiful city. Studying in Germany with its high standard of living and post-study opportunities has always been my top choice.',
      whyItWeakens:
        'Focuses on history, rankings, tourism, and immigration incentives rather than academic research and laboratory compatibility.',
    },
    strongerPattern: {
      label: 'Stronger: Research alignment with specific labs and faculty work',
      text: '[Fictional Illustrative Example] The interdisciplinary collaboration between the Chair for Database Systems and the Interdisciplinary Center for Scientific Computing (IWR) provides an ideal environment for my focus. Having studied Dr. K. Weber’s recent work on cache-conscious indexing for distributed graph databases, I am eager to contribute to the ongoing research in memory-tier optimization for non-volatile storage.',
      whyItWorks:
        'Identifies an actual research chair, a specific research theme (cache-conscious indexing), and demonstrates that the student has read the department’s literature.',
    },
  },
  career_goals: {
    sectionId: 'career_goals',
    whatCommitteesLookFor:
      'Committees value purposeful students who understand the employment or research landscapes they are entering. They look for logical progression from the master’s degree into specific industry engineering or doctoral tracks.',
    wordBudgetGuide: {
      words: 120,
      note: 'Approx. 100–140 words (guide only).',
    },
    reflectionQuestions: [
      'Immediately post-graduation, what specific role (e.g. Systems Engineer, Applied Researcher) will you target, and in what sector?',
      'Five years later, what complex problem or technical milestone do you aim to lead?',
      'How does completing this specific master’s degree act as the indispensable catalyst for that trajectory?',
    ],
    weakPattern: {
      label: 'Weak: Vague ambition without intermediate stepping stones',
      text: 'After graduation, I hope to work for a multinational technology giant as a leader, making significant impacts on the world, before eventually starting my own company in Silicon Valley.',
      whyItWeakens:
        'Offers grandiose generalizations without identifying the immediate technical function, industry sector, or realistic career pathway.',
    },
    strongerPattern: {
      label: 'Stronger: Realistic progression with concrete sector and technical targets',
      text: '[Fictional Illustrative Example] Following the completion of my master’s thesis, I plan to join an industrial research lab or automotive systems supplier as an Embedded Inference Engineer, working on ISO 26262-compliant vision controllers. Over the long term, I intend to lead systems architecture teams designing fail-safe machine learning runtimes for autonomous transportation.',
      whyItWorks:
        'Names specific roles, compliance standards (ISO 26262), and realistic industry niches that directly relate to the graduate curriculum.',
    },
  },
  conclusion: {
    sectionId: 'conclusion',
    whatCommitteesLookFor:
      'A crisp, confident close. Committees expect a succinct reiteration of your readiness to handle challenging coursework and research workloads, without emotional pleading.',
    wordBudgetGuide: {
      words: 80,
      note: 'Approx. 60–100 words (guide only).',
    },
    reflectionQuestions: [
      'In two sentences, how does your technical preparation and academic resilience make you an asset to the graduate student cohort?',
      'Have you confirmed that your closing is free of emotional appeals, apologies, or new biographical facts?',
    ],
    weakPattern: {
      label: 'Weak: Emotional pleading and apologies for weaknesses',
      text: 'I earnestly plead with the esteemed admissions committee to grant me this opportunity, as it would mean the world to my family and fulfill all my hopes. I promise to work harder than anyone else.',
      whyItWeakens:
        'Uses emotional pressure and pleading, which signals insecurity and contradicts professional academic standards.',
    },
    strongerPattern: {
      label: 'Stronger: Confident summary of contribution and scholarly readiness',
      text: '[Fictional Illustrative Example] Combining a rigorous foundation in systems programming with hands-on experience in telemetry pipeline engineering, I am well prepared for the academic demands of the M.Sc. in Computer Science. I look forward to contributing actively to the department’s collaborative research initiatives and thank the committee for their review.',
      whyItWorks:
        'Summarizes core strengths, conveys readiness without arrogance or pleading, and closes respectfully.',
    },
  },
};
