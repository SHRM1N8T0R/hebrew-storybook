// Applies tools/gender-fixes.json ("<storyId>|<page>:<paragraph>:<word index>" -> corrected word, without punctuation)
// into tools/nikud-overrides.json, keeping the punctuation of the original token. Review each fix against who is
// speaking to whom first (tools/scan-gender.mjs lists the candidates). Re-runnable.
//   node tools/apply-gender-fixes.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const fixes = JSON.parse(fs.readFileSync(path.join(here, 'gender-fixes.json'), 'utf8'))
const file = path.join(here, 'nikud-overrides.json')
const ov = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
let n = 0
for (const [k, to] of Object.entries(fixes)) {
  const i = k.lastIndexOf(':')
  const para = k.slice(0, i), w = Number(k.slice(i + 1))
  const tok = (cache[para] || '').split(/\s+/)[w]
  if (!tok) { console.error('no such word:', k); continue }
  const core = tok.replace(PUNCT, '')
  ov[k] = tok.replace(core, to)
  n++
}
fs.writeFileSync(file, JSON.stringify(ov, null, 1))
console.log('gender fixes applied:', n, '| total overrides:', Object.keys(ov).length)
