const fs = require('fs');

const html = fs.readFileSync('careergoals-fox-university.html', 'utf8');

// 1. Validate scripts syntax
const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
console.log(`Analyzing ${scriptMatches.length} script tags...`);

scriptMatches.forEach((m, idx) => {
  const code = m[1].trim();
  if (!code) return;
  try {
    new Function(code);
    console.log(`Script ${idx}: Syntax is 100% valid!`);
  } catch (err) {
    console.error(`Script ${idx} syntax error:`, err);
    process.exit(1);
  }
});

// 2. Validate all getElementById targets
const idRegex = /getElementById\(['"]([a-zA-Z0-9_\-]+)['"]\)/g;
const ids = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
  ids.add(match[1]);
}

console.log(`Checking ${ids.size} unique getElementById target IDs against HTML markup...`);
const missing = [];
for (const id of ids) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missing.push(id);
  }
}

if (missing.length > 0) {
  console.error('MISSING IDs:', missing);
  process.exit(1);
} else {
  console.log(`All ${ids.size} getElementById target IDs exist in the HTML!`);
}
