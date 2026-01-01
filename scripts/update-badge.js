import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const README_FILE = path.join(__dirname, '../README.md');

// Colors
const COLOR_BRIGHTGREEN = 'brightgreen'; // 90-100%
const COLOR_GREEN = 'green';             // 80-90%
const COLOR_YELLOW = 'yellow';           // 60-80%
const COLOR_RED = 'red';                 // < 60%

function getColor(pct) {
  if (pct >= 90) return COLOR_BRIGHTGREEN;
  if (pct >= 80) return COLOR_GREEN;
  if (pct >= 60) return COLOR_YELLOW;
  return COLOR_RED;
}

try {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error(`Coverage file not found at: ${COVERAGE_FILE}`);
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const pct = coverage.total.lines.pct;
  const color = getColor(pct);
  
  // Badge format: ![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)
  const badgeRegex = /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[0-9.]+%25-[a-zA-Z]+\)/;
  const newBadge = `![Coverage](https://img.shields.io/badge/coverage-${pct}%25-${color})`;

  if (!fs.existsSync(README_FILE)) {
    console.error(`README file not found at: ${README_FILE}`);
    process.exit(1);
  }

  let readme = fs.readFileSync(README_FILE, 'utf8');
  
  if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, newBadge);
    fs.writeFileSync(README_FILE, readme);
    console.log(`Updated README badge to ${pct}% (${color})`);
  } else {
    console.warn('Coverage badge not found in README. Add ![Coverage](...) placeholder first.');
  }

} catch (error) {
  console.error('Failed to update coverage badge:', error);
  process.exit(1);
}
