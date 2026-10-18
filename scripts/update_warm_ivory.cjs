const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../careergoals-fox-university.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace the :root block
const oldRootRegex = /:root\s*\{[\s\S]*?--font-family:[^;]+;\s*\}/;

const newRoot = `:root {
      /* ==========================================================================
         DESIGN SYSTEM: WARM IVORY (#FAF7F0) & DEEP GREEN (#1B4D3E) PALETTE
         ========================================================================== */
      --bg: #FAF7F0;             /* main page & body background */
      --ivory: var(--bg);        /* semantic alias for background */
      --surface: #FFFFFF;        /* cards, panels, inputs */
      --surface-alt: #F3EEE2;    /* secondary panels, chips, hover states */
      --white: #FFFFFF;
      --border-soft: #E6DFCF;    /* soft border separating surfaces from ivory */
      --line: #E6DFCF;           /* border/divider line token */

      /* Text Tokens (calibrated for ivory #FAF7F0) */
      --text-primary: #1B4D3E;   /* deep green headings & primary text (8.85:1 contrast) */
      --text-body: #2B3A33;      /* body text (11.0:1 contrast) */
      --text-muted: #5C6B63;     /* secondary/muted text (5.19:1 contrast, exceeds 4.5:1) */
      --text-placeholder: #7A867F; /* placeholder text (3.53:1 contrast) */
      --link: #1B4D3E;           /* links & accents */
      --link-hover: #2E6B57;     /* slightly lighter green on hover (5.57:1 contrast) */

      /* Palette compatibility tokens */
      --forest: #1B4D3E;         /* deep green brand & primary buttons */
      --forest-hover: #2E6B57;   /* hover state */
      --gold: #B45309;           /* warm amber-gold with 4.52:1 contrast on ivory */
      --slate: #2B3A33;          /* legacy token mapped to body text */
      --mist: #F3EEE2;           /* legacy token mapped to surface-alt */
      --muted: #5C6B63;          /* legacy token mapped to secondary text */

      /* Button specific tokens */
      --btn-dark-bg: #1B4D3E;
      --btn-dark-text: #FAF7F0;
      --btn-light-bg: #FFFFFF;
      --btn-light-text: #1B4D3E;
      --btn-light-border: #E6DFCF;

      /* Status Colours */
      --status-success: #16A34A;
      --status-success-bg: #DCFCE7;
      --status-warning: #B45309;
      --status-warning-bg: #FEF3C7;
      --status-error: #B42318;
      --status-error-bg: #FEE4E2;

      /* Soft Shadows (No heavy black shadows) */
      --shadow-soft: 0 4px 16px rgba(27, 77, 62, 0.08);
      --shadow-card: 0 2px 8px rgba(27, 77, 62, 0.06);
      --shadow-dropdown: 0 10px 24px rgba(27, 77, 62, 0.08);
      --shadow-modal: 0 20px 40px rgba(27, 77, 62, 0.12);

      /* Standard Geometry & Typography */
      --radius-card: 12px;
      --radius-btn: 6px;
      --font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }`;

if (!oldRootRegex.test(content)) {
  console.error('Could not find old :root block');
  process.exit(1);
}

content = content.replace(oldRootRegex, newRoot);

// 2. Base styles for body, headings, placeholders, links
const oldBodyRegex = /body\s*\{[\s\S]*?webkit-font-smoothing:\s*antialiased;\s*\}/;
const newBody = `body {
      font-family: var(--font-family);
      font-weight: 400;
      color: var(--text-body);
      background-color: var(--bg);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }`;
content = content.replace(oldBodyRegex, newBody);

const oldHeadingsRegex = /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?color:\s*var\(--slate\);\s*\}/;
const newHeadings = `h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-family);
      font-weight: 600;
      line-height: 1.25;
      color: var(--text-primary);
    }

    p {
      color: var(--text-body);
    }

    ::placeholder {
      color: var(--text-placeholder);
      opacity: 1;
    }

    a {
      text-decoration: none;
      color: var(--link);
      transition: color 0.15s ease;
    }
    a:hover {
      color: var(--link-hover);
    }`;
content = content.replace(oldHeadingsRegex, newHeadings);

// 3. Update buttons
content = content.replace(
  /\.btn-forest\s*\{[\s\S]*?cursor:\s*pointer;\s*\}/,
  `.btn-forest {
      background-color: var(--btn-dark-bg);
      color: var(--btn-dark-text);
      font-weight: 600;
      font-size: 13.5px;
      padding: 10px 20px;
      border-radius: var(--radius-btn);
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
    }`
);

content = content.replace(
  /\.btn-forest:hover\s*\{[\s\S]*?box-shadow:[^;]+;\s*\}/,
  `.btn-forest:hover {
      background-color: var(--forest-hover);
      box-shadow: var(--shadow-soft);
    }`
);

content = content.replace(
  /\.btn-forest-on-ivory\s*\{[\s\S]*?cursor:\s*pointer;\s*\}/,
  `.btn-forest-on-ivory {
      background-color: var(--btn-light-bg);
      color: var(--btn-light-text);
      font-weight: 600;
      font-size: 13.5px;
      padding: 10px 22px;
      border-radius: var(--radius-btn);
      border: 1px solid var(--btn-light-border);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      cursor: pointer;
    }`
);

content = content.replace(
  /\.btn-forest-on-ivory:hover\s*\{[\s\S]*?transform:\s*translateY\(-1px\);\s*\}/,
  `.btn-forest-on-ivory:hover {
      background-color: var(--surface-alt);
      border-color: var(--forest);
      transform: translateY(-1px);
    }`
);

content = content.replace(
  /\.btn-ghost\s*\{[\s\S]*?cursor:\s*pointer;\s*\}/,
  `.btn-ghost {
      background-color: var(--btn-light-bg);
      color: var(--btn-light-text);
      font-weight: 600;
      font-size: 13.5px;
      padding: 9px 20px;
      border-radius: var(--radius-btn);
      border: 1px solid var(--btn-light-border);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      cursor: pointer;
    }`
);

content = content.replace(
  /\.btn-ghost:hover\s*\{[\s\S]*?color:\s*var\(--white\);\s*\}/,
  `.btn-ghost:hover {
      background-color: var(--surface-alt);
      border-color: var(--forest);
      color: var(--forest-hover);
    }`
);

// 4. Update sticky-nav shadow
content = content.replace(
  /box-shadow:\s*0\s*4px\s*16px\s*rgba\(22,\s*78,\s*59,\s*0\.25\);/,
  'box-shadow: 0 4px 16px rgba(27, 77, 62, 0.08);'
);

// 5. Update dropdown shadows
content = content.replace(
  /box-shadow:\s*0\s*12px\s*28px\s*rgba\(0,\s*0,\s*0,\s*0\.15\);/g,
  'box-shadow: var(--shadow-dropdown);'
);

content = content.replace(
  /box-shadow:\s*0\s*20px\s*40px\s*rgba\(0,\s*0,\s*0,\s*0\.2\);/g,
  'box-shadow: var(--shadow-modal);'
);

content = content.replace(
  /box-shadow:\s*0\s*16px\s*32px\s*rgba\(15,\s*58,\s*43,\s*0\.22\);/,
  'box-shadow: var(--shadow-soft);'
);

content = content.replace(
  /box-shadow:\s*0\s*10px\s*25px\s*-4px\s*rgba\(22,\s*78,\s*59,\s*0\.45\);/,
  'box-shadow: var(--shadow-soft);'
);

content = content.replace(
  /box-shadow:\s*0\s*20px\s*40px\s*rgba\(22,\s*78,\s*59,\s*0\.25\);/,
  'box-shadow: var(--shadow-modal);'
);

// 6. Update Hero section
content = content.replace(
  /\.hero-section\s*\{[\s\S]*?overflow:\s*hidden;\s*\}/,
  `.hero-section {
      background-color: var(--bg);
      color: var(--text-body);
      padding: 56px 0 64px;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid var(--border-soft);
    }`
);

content = content.replace(
  /\.hero-section::before\s*\{[\s\S]*?pointer-events:\s*none;\s*\}/,
  `.hero-section::before {
      display: none;
    }`
);

content = content.replace(
  /\.hero-tag\s*\{[\s\S]*?margin-bottom:\s*16px;\s*\}/,
  `.hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: var(--surface);
      color: var(--forest);
      border: 1px solid var(--border-soft);
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }`
);

content = content.replace(
  /\.hero-headline\s*\{[\s\S]*?letter-spacing:\s*-0\.5px;\s*\}/,
  `.hero-headline {
      font-size: 40px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }`
);

content = content.replace(
  /\.hero-subtext\s*\{[\s\S]*?max-width:\s*540px;\s*\}/,
  `.hero-subtext {
      font-size: 15px;
      color: var(--text-body);
      opacity: 0.95;
      line-height: 1.6;
      margin-bottom: 28px;
      max-width: 540px;
    }`
);

// 7. Update Feature strip
content = content.replace(
  /\.feature-strip\s*\{[\s\S]*?width:\s*100%;\s*\}/,
  `.feature-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      width: 100%;
      background: var(--surface);
      border-bottom: 1px solid var(--border-soft);
    }`
);

content = content.replace(
  /\.feature-block\s*\{[\s\S]*?transition:\s*filter\s*0\.15s\s*ease;\s*\}/,
  `.feature-block {
      padding: 34px 28px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      background-color: var(--surface);
      border-right: 1px solid var(--border-soft);
      transition: background-color 0.15s ease;
    }`
);

content = content.replace(
  /\.feature-block:hover\s*\{[\s\S]*?filter:\s*brightness\(1\.04\);\s*\}/,
  `.feature-block:hover {
      background-color: var(--surface-alt);
    }`
);

content = content.replace(
  /\.block-forest\s*\{[\s\S]*?color:\s*var\(--ivory\);\s*\}/,
  `.block-forest {
      background-color: var(--surface);
      color: var(--text-body);
    }`
);

content = content.replace(
  /\.block-slate\s*\{[\s\S]*?color:\s*var\(--ivory\);\s*\}/,
  `.block-slate {
      background-color: var(--surface-alt);
      color: var(--text-body);
    }`
);

content = content.replace(
  /\.feature-icon-wrapper\s*\{[\s\S]*?background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);\s*\}/,
  `.feature-icon-wrapper {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-btn);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      background-color: rgba(27, 77, 62, 0.08);
    }`
);

content = content.replace(
  /\.feature-gold-icon\s*\{[\s\S]*?stroke:\s*var\(--gold\);\s*\}/,
  `.feature-gold-icon {
      color: var(--forest);
      stroke: var(--forest);
    }`
);

content = content.replace(
  /\.feature-title\s*\{[\s\S]*?color:\s*var\(--ivory\);\s*\}/,
  `.feature-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }`
);

content = content.replace(
  /\.feature-desc\s*\{[\s\S]*?color:\s*rgba\(250,\s*247,\s*240,\s*0\.88\);\s*\}/,
  `.feature-desc {
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--text-muted);
    }`
);

// 8. Update Footer
content = content.replace(
  /\.slate-footer\s*\{[\s\S]*?margin-top:\s*auto;\s*\}/,
  `.slate-footer {
      background-color: var(--surface-alt);
      color: var(--text-body);
      padding: 48px 0 24px;
      border-top: 1px solid var(--border-soft);
      margin-top: auto;
    }`
);

content = content.replace(
  /\.footer-col\s*h4\s*\{[\s\S]*?letter-spacing:\s*0\.5px;\s*position:\s*relative;\s*\}/,
  `.footer-col h4 {
      color: var(--text-primary);
      font-size: 13.5px;
      font-weight: 600;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: relative;
    }`
);

content = content.replace(
  /\.footer-col\s*h4::after\s*\{[\s\S]*?background-color:\s*var\(--gold\);\s*\}/,
  `.footer-col h4::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 22px;
      height: 2px;
      background-color: var(--forest);
    }`
);

content = content.replace(
  /\.footer-about\s*\{[\s\S]*?opacity:\s*0\.9;\s*\}/,
  `.footer-about {
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-muted);
    }`
);

content = content.replace(
  /\.footer-links\s*a\s*\{[\s\S]*?cursor:\s*pointer;\s*\}/,
  `.footer-links a {
      color: var(--text-muted);
      transition: color 0.15s ease, padding-left 0.15s ease;
      cursor: pointer;
    }`
);

content = content.replace(
  /\.footer-links\s*a:hover\s*\{[\s\S]*?padding-left:\s*3px;\s*\}/,
  `.footer-links a:hover {
      color: var(--forest);
      padding-left: 3px;
    }`
);

content = content.replace(
  /\.footer-bottom\s*\{[\s\S]*?gap:\s*12px;\s*\}/,
  `.footer-bottom {
      border-top: 1px solid var(--border-soft);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 12px;
    }`
);

fs.writeFileSync(filePath, content);
console.log('Successfully updated careergoals-fox-university.html');

// Also save downloadable copy to artifacts directory
const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\d87d5455-0f99-4398-8234-75dc8db07051';
const downloadPath = path.join(artifactDir, 'careergoals-warm-ivory.html');
fs.writeFileSync(downloadPath, content);
console.log('Saved downloadable HTML to:', downloadPath);
