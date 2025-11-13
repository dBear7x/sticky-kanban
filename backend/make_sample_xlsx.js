#!/usr/bin/env node
/**
 * make_sample_xlsx.js
 *
 * Small helper script to create a sample `letters.xlsx` under ./data for the backend.
 *
 * Usage:
 *   node make_sample_xlsx.js            -> creates ./data/letters.xlsx (won't overwrite existing file)
 *   node make_sample_xlsx.js --force    -> overwrite if file exists
 *   node make_sample_xlsx.js --out ./backend/data/sample.xlsx
 *
 * Notes:
 * - This script expects the `xlsx` npm package to be installed in the backend project:
 *     cd backend
 *     npm install xlsx
 *
 * - The generated workbook contains a first sheet with headers:
 *     id, letter
 *
 * - The backend is written to use the first sheet and the `letter` column (case-insensitive).
 */

const fs = require('fs');
const path = require('path');

function log(...args) {
  console.log('[make_sample_xlsx]', ...args);
}

function error(...args) {
  console.error('[make_sample_xlsx]', ...args);
}

// Simple argv parsing
const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const getArgValue = (name) => {
  const idx = argv.findIndex((a) => a === name);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return null;
};

const force = hasFlag('--force') || hasFlag('-f');
const outArg = getArgValue('--out') || getArgValue('-o');

// Default output path (relative to this script)
const DEFAULT_OUT = path.resolve(__dirname, 'data', 'letters.xlsx');
const outPath = outArg ? path.resolve(process.cwd(), outArg) : DEFAULT_OUT;

async function main() {
  // Try to require xlsx, but provide a helpful message if not installed
  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch (e) {
    error('The "xlsx" package is required to run this script but was not found.');
    log('Install it in the backend folder with:');
    console.log('  cd backend');
    console.log('  npm install xlsx');
    process.exit(1);
  }

  const outDir = path.dirname(outPath);
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    error('Failed to create directory:', outDir, e && e.message ? e.message : e);
    process.exit(1);
  }

  // If file exists and not forced, exit
  if (fs.existsSync(outPath) && !force) {
    log(`File already exists at "${outPath}". Use --force to overwrite.`);
    process.exit(0);
  }

  // Example rows
  const rows = [
    ['id', 'letter'],
    [1, 'Buy milk'],
    [2, 'Prepare slides for Monday demo'],
    ['', 'Call Alice regarding the API changes'],
    ['', 'Fix signup bug — validation on email field'],
    [5, 'Plan Q4 roadmap and priorities'],
    [6, 'Review PR #42 and leave feedback'],
    [7, 'Schedule team retro'],
  ];

  // Convert AOA (array of arrays) to worksheet, then to workbook
  const ws = xlsx.utils.aoa_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Letters');

  try {
    xlsx.writeFile(wb, outPath);
    log(`Sample Excel written to: ${outPath}`);
    log('Sheet: "Letters" with header columns: id, letter');
    log('You can now start the backend and point it to this file (default path: backend/data/letters.xlsx)');
  } catch (e) {
    error('Failed to write Excel file:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
