#!/usr/bin/env node
/**
 * Regenerates the narration files in /audio from the SEGMENTS script in index.html (macOS only:
 * uses the built-in `say` and `afconvert`). Run it again whenever you edit the script wording.
 *
 *   node tools/make-audio.js
 *
 * Output: audio/part-1.m4a … part-N.m4a, audio/check.m4a, and — for each part — the `dur` and `cues`
 * values to paste into SEGMENTS (cues = second at which each spoken piece starts, used to time the
 * slide callouts to the narration).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const VOICE = 'Samantha', RATE = '150';
const LEAD_PAUSE = 0.5, KEY_PAUSE = 0.6;   // seconds of silence after the part title / before the key point

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const block = html.match(/\/\* SEGMENTS-BEGIN \*\/([\s\S]*?)\/\* SEGMENTS-END \*\//);
if (!block) throw new Error('SEGMENTS-BEGIN/END markers not found in index.html');
const SEGMENTS = new Function(block[1] + '; return SEGMENTS;')();

const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const splitSentences = t => t.match(/[^.!?]+[.!?]+/g).map(s => s.trim());
const tmp = fs.mkdtempSync('/tmp/csp-audio-');
const dur = f => Number(execFileSync('afinfo', [f]).toString().match(/estimated duration: ([\d.]+)/)[1]);
const speak = (text, out) => execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', out, text]);
const encode = (aiff, m4a) => execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', aiff, m4a]);

fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });

SEGMENTS.forEach((seg, i) => {
  const lead = `Part ${NUMBERS[i]}. ${seg.title}.`;
  const key = `Key point: ${seg.key}`;
  const pieces = [lead, ...splitSentences(seg.text), key];
  // Whole narration in one file (natural flow), with explicit pauses.
  const full = `${lead} [[slnc ${LEAD_PAUSE * 1000}]] ${seg.text} [[slnc ${KEY_PAUSE * 1000}]] ${key}`;
  const aiff = path.join(tmp, `p${i + 1}.aiff`);
  speak(full, aiff);
  const total = dur(aiff);

  // Estimate where each piece starts: measure pieces alone, then scale to the real total.
  const lens = pieces.map((p, k) => { const f = path.join(tmp, `p${i + 1}-${k}.aiff`); speak(p, f); return dur(f); });
  const pauses = pieces.map((_, k) => (k === 0 ? LEAD_PAUSE : k === pieces.length - 2 ? KEY_PAUSE : 0));
  const scale = total / (lens.reduce((a, b) => a + b, 0) + pauses.reduce((a, b) => a + b, 0));
  let t = 0; const cues = [];
  pieces.forEach((_, k) => { cues.push(Math.round(t * 10) / 10); t += (lens[k] + pauses[k]) * scale; });

  encode(aiff, path.join(ROOT, 'audio', `part-${i + 1}.m4a`));
  console.log(`part ${i + 1}: dur: ${(Math.round(total * 10) / 10)}, cues: [${cues.join(', ')}]   (${pieces.length} pieces)`);
});

const chk = path.join(tmp, 'check.aiff');
speak('This is a sound check. If you can hear this clearly, you are ready.', chk);
encode(chk, path.join(ROOT, 'audio', 'check.m4a'));
console.log('sound check written');
