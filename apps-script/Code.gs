/**
 * CSP Learning-Medium Experiment — cloud data store (Google Apps Script + Google Sheet)
 *
 * Setup (once, ~5 minutes — full steps in README.md):
 *   1. Create a new Google Sheet → Extensions → Apps Script → paste this whole file.
 *   2. Change ADMIN_KEY below to your own secret (you type it to open the results view).
 *   3. Deploy → New deployment → type "Web app"
 *        Execute as: Me      Who has access: Anyone
 *   4. Copy the Web app URL (ends in /exec) into SCRIPT_URL at the top of index.html.
 *
 * Participants never sign in: the script runs as YOU and only appends rows to your sheet.
 */

const ADMIN_KEY = 'change-me-please';   // <-- CHANGE THIS
const SHEET_NAME = 'Responses';
const MEDIA = ['text', 'video', 'audio'];

// Column order = CSV column order. medium, score, percent come first so the
// sheet can go straight into a one-way ANOVA.
const HEADERS = [
  'medium', 'score', 'total', 'percent', 'timestamp', 'name', 'participant_id',
  'exposure_seconds', 'quiz_seconds', 'tab_switches', 'speech_overruns',
  'interrupted', 'tech_issue', 'assignment_source', 'answers', 'received_at'
];

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'assign') return json_(assign_());
  if (p.action === 'results') {
    if (p.key !== ADMIN_KEY) return json_({ ok: false, error: 'bad_key' });
    return json_({ ok: true, rows: readRows_() });
  }
  return json_({ ok: true, service: 'csp-experiment' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }

  let records;
  if (body.action === 'import') {
    if (body.key !== ADMIN_KEY) return json_({ ok: false, error: 'bad_key' });
    records = body.records || [];
  } else {
    records = [body.record];
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_();
    const idCol = HEADERS.indexOf('participant_id') + 1;
    const last = sheet.getLastRow();
    const existing = new Set(
      last > 1 ? sheet.getRange(2, idCol, last - 1, 1).getValues().map(r => String(r[0])) : []
    );
    let added = 0, duplicates = 0, rejected = 0;
    records.forEach(r => {
      const row = clean_(r);
      if (!row) { rejected++; return; }
      if (existing.has(row.participant_id)) { duplicates++; return; }
      sheet.appendRow(HEADERS.map(h => row[h]));
      existing.add(row.participant_id);
      added++;
    });
    return json_({ ok: true, added, duplicates, rejected });
  } finally {
    lock.releaseLock();
  }
}

/** Permuted-block randomisation (blocks of 3) keeps the three groups balanced. */
function assign_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const props = PropertiesService.getScriptProperties();
    let block = JSON.parse(props.getProperty('block') || '[]');
    if (!block.length) {
      block = MEDIA.slice();
      for (let i = block.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [block[i], block[j]] = [block[j], block[i]];
      }
    }
    const medium = block.shift();
    props.setProperty('block', JSON.stringify(block));
    return { ok: true, medium };
  } finally {
    lock.releaseLock();
  }
}

function clean_(r) {
  if (!r || MEDIA.indexOf(r.medium) === -1) return null;
  const total = Number(r.total);
  const score = Number(r.score);
  if (!Number.isInteger(total) || total < 1 || total > 100) return null;
  if (!Number.isInteger(score) || score < 0 || score > total) return null;
  const id = String(r.participant_id || '').slice(0, 40);
  if (!id) return null;
  const num = v => (v === '' || v == null || isNaN(Number(v)) ? '' : Number(v));
  return {
    medium: r.medium,
    score: score,
    total: total,
    percent: Math.round((score / total) * 1000) / 10,
    timestamp: safe_(r.timestamp, 40),
    name: safe_(r.name, 40),
    participant_id: id,
    exposure_seconds: num(r.exposure_seconds),
    quiz_seconds: num(r.quiz_seconds),
    tab_switches: num(r.tab_switches),
    speech_overruns: num(r.speech_overruns),
    interrupted: num(r.interrupted),
    tech_issue: safe_(r.tech_issue, 10),
    assignment_source: safe_(r.assignment_source, 20),
    answers: safe_(r.answers, 80),
    received_at: new Date().toISOString()
  };
}

/** Trim, cap length, and stop spreadsheet formula injection. */
function safe_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function readRows_() {
  const values = getSheet_().getDataRange().getDisplayValues();
  const head = values.shift() || [];
  return values.map(v => {
    const o = {};
    head.forEach((h, i) => (o[h] = v[i]));
    return o;
  });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('This script is not attached to a Sheet. Open your Google Sheet and use ' +
      'Extensions → Apps Script from inside it, then paste the code there.');
  }
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Reuse the blank default tab ("Sheet1") rather than adding a second tab.
    const sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0) {
      sheet = sheets[0].setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange('1:1').setFontWeight('bold');
    // Keep text columns (timestamps, names, IDs, answers) exactly as sent.
    ['A:A', 'E:G', 'M:P'].forEach(a => sheet.getRange(a).setNumberFormat('@'));
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run once from the editor to create the header row and authorise the script. */
function setup() {
  const sheet = getSheet_();
  sheet.activate();
  Logger.log('Ready: tab "%s" in "%s" has headers: %s', SHEET_NAME,
    SpreadsheetApp.getActiveSpreadsheet().getName(), sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join(', '));
}
