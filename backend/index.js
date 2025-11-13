/**
 * Kanban/backend/index.js
 *
 * Simple Express backend that reads letters from a fixed Excel file and exposes an API
 * for a frontend to poll.
 *
 * - Expects an Excel file at ./data/letters.xlsx by default (can override with EXCEL_PATH env var)
 * - Looks for a column named "letter" (case-insensitive) in the first sheet
 * - Caches the parsed result and only re-reads when the file modification time changes
 *
 * Usage:
 *   npm install
 *   node index.js
 *
 * Environment variables:
 *   PORT        - port to run the server on (default: 3000)
 *   EXCEL_PATH  - path to the Excel file (default: ./data/letters.xlsx)
 *
 * The API:
 *   GET /api/letters
 *     -> { letters: [{ id, text }], updatedAt, source }
 *
 *   GET /health
 *     -> { status: 'ok' }
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EXCEL_PATH = process.env.EXCEL_PATH || path.resolve(__dirname, 'data', 'letters.xlsx');

/**
 * Cache object to avoid re-reading the Excel file on every request.
 * Structure:
 *   {
 *     mtimeMs: number,
 *     updatedAt: ISO string,
 *     letters: Array<{id: number, text: string}>,
 *     source: string
 *   }
 */
let cache = {
  mtimeMs: 0,
  updatedAt: null,
  letters: [],
  source: EXCEL_PATH,
};

/**
 * Read and parse the Excel file from disk.
 * - Finds a header named 'letter' (case-insensitive)
 * - Returns an array of letter strings (trimmed, non-empty)
 */
function parseLettersFromWorkbook(workbook) {
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) return [];

  // Use the first sheet
  const sheet = workbook.Sheets[sheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Determine which key corresponds to 'letter' (case-insensitive)
  const headerKeys = Object.keys(raw[0]);
  const letterKey = headerKeys.find(k => /^letter$/i.test(k));

  // If there is no exact header 'letter', try to find a similar header
  // (e.g., "Letter", "LETTER", maybe "note" fallback)
  let chosenKey = letterKey;
  if (!chosenKey) {
    // Try to find any key that contains 'letter'
    chosenKey = headerKeys.find(k => /letter/i.test(k));
  }

  if (!chosenKey) {
    // No suitable column found
    return [];
  }

  // Map rows to trimmed non-empty strings
  const letters = raw
    .map((row) => {
      const value = row[chosenKey];
      if (value === null || value === undefined) return '';
      return String(value).trim();
    })
    .filter((v) => v.length > 0);

  return letters;
}

/**
 * Ensure the Excel file exists; read it if modified since last cache.
 * Updates the global cache and returns it.
 */
function ensureCacheUpdated() {
  try {
    const stat = fs.statSync(EXCEL_PATH);
    const mtimeMs = stat.mtimeMs || 0;

    if (cache.mtimeMs === mtimeMs && cache.updatedAt) {
      // No change
      return cache;
    }

    // Read and parse
    const workbook = xlsx.readFile(EXCEL_PATH);
    const letters = parseLettersFromWorkbook(workbook);

    const timestamp = new Date().toISOString();
    cache = {
      mtimeMs,
      updatedAt: timestamp,
      letters: letters.map((text, idx) => ({ id: idx + 1, text })),
      source: EXCEL_PATH,
    };

    console.log(`[index.js] Loaded ${cache.letters.length} letters from ${EXCEL_PATH} at ${timestamp}`);
    return cache;
  } catch (err) {
    // If file doesn't exist or can't be read, return empty cache (but preserve mtime to 0)
    if (err && (err.code === 'ENOENT' || err.code === 'EPERM')) {
      console.warn(`[index.js] Excel file not found at ${EXCEL_PATH} or not accessible`);
    } else {
      console.error('[index.js] Error reading Excel file:', err && err.message ? err.message : err);
    }

    cache = {
      mtimeMs: 0,
      updatedAt: new Date().toISOString(),
      letters: [],
      source: EXCEL_PATH,
    };
    return cache;
  }
}

/**
 * API: GET /api/letters
 * Returns the current letters. The frontend will poll this endpoint periodically.
 */
app.get('/api/letters', (req, res) => {
  const current = ensureCacheUpdated();
  // Return a randomized order? The frontend is responsible for layout/random placement.
  // Here we return the deterministic array; the frontend can shuffle if desired.
  res.json({
    letters: current.letters,
    updatedAt: current.updatedAt,
    source: path.basename(current.source),
  });
});

/**
 * Simple health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', now: new Date().toISOString() });
});

/**
 * Helpful log for root
 */
app.get('/', (req, res) => {
  res.send(
    `<h2>Kanban Backend</h2>
     <p>API endpoints:</p>
     <ul>
       <li><a href="/api/letters">/api/letters</a> - GET letters from Excel</li>
       <li><a href="/health">/health</a> - GET health</li>
     </ul>
     <p>Configured Excel path: <code>${EXCEL_PATH}</code></p>`
  );
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`[index.js] Server listening on http://localhost:${PORT}`);
  console.log(`[index.js] Excel file path: ${EXCEL_PATH}`);
  // Attempt initial load so errors show early
  ensureCacheUpdated();
});
