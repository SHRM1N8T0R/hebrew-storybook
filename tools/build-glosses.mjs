// Reads tools/glosses/*.txt ("vowelled word | meaning", one per line) into tools/glosses.json and checks
// coverage against the story's distinct words. Reports missing words and glosses for words not in the story.
//   node tools/build-glosses.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const fix = fs.existsSync(path.join(here, 'nikud-overrides.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'nikud-overrides.json'), 'utf8')) : {}
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const words = []
const seen = new Set()
const keys = Object.keys(cache).sort((a, b) => { const [p1, k1] = a.split(':').map(Number), [p2, k2] = b.split(':').map(Number); return p1 - p2 || k1 - k2 })
for (const key of keys) {
  const ws = cache[key].split(/\s+/)
  ws.forEach((w, n) => { const f = fix[key + ':' + n]; if (f) ws[n] = f })
  for (const w of ws) { const f = w.replace(PUNCT, '').normalize('NFC'); if (f && /[א-ת]/.test(f) && !seen.has(f)) { seen.add(f); words.push(f) } }
}
const dir = path.join(here, 'glosses')
const out = {}
const dupes = []
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.txt')).sort()) {
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
    const i = line.indexOf(' | ')
    if (i < 0) continue
    const w = line.slice(0, i).trim().normalize('NFC'), g = line.slice(i + 3).trim()
    if (out[w] && out[w] !== g) dupes.push(w)
    out[w] = g
  }
}
const missing = words.filter((w) => !out[w])
const unknown = Object.keys(out).filter((w) => !seen.has(w))
fs.writeFileSync(path.join(here, 'glosses.json'), JSON.stringify(out, null, 1))
console.log('distinct words', words.length, '| glossed', words.length - missing.length, '| missing', missing.length, '| not in story', unknown.length, '| conflicting duplicates', dupes.length)
if (unknown.length) console.log('NOT IN STORY (typo in the key?):', unknown.slice(0, 20).join('  '))
if (process.argv[2] === 'missing') console.log(missing.join('\n'))
