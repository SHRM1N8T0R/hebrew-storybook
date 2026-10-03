// Prints the distinct vowelled words of the story, in order of first appearance, each with a few words
// of context, in chunks. Used to write tools/glosses.json (word -> short English meaning, in context).
//   node tools/gloss-list.mjs <chunk> [size]      (chunk starts at 1; size defaults to 140)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const fix = fs.existsSync(path.join(here, 'nikud-overrides.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'nikud-overrides.json'), 'utf8')) : {}
const NIK = /[֑-ׇ]/g
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const keys = Object.keys(cache).sort((a, b) => { const [p1, k1] = a.split(':').map(Number), [p2, k2] = b.split(':').map(Number); return p1 - p2 || k1 - k2 })
const seen = new Map()
for (const key of keys) {
  const ws = cache[key].split(/\s+/)
  ws.forEach((w, n) => { const f = fix[key + ':' + n]; if (f) ws[n] = f })
  ws.forEach((w, n) => {
    const f = w.replace(PUNCT, '')
    if (!f || seen.has(f)) return
    const ctx = ws.slice(Math.max(0, n - 2), n + 3).map((x) => x.replace(NIK, '')).join(' ')
    seen.set(f, { ctx, key })
  })
}
const done = fs.existsSync(path.join(here, 'glosses.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'glosses.json'), 'utf8')) : {}
const list = [...seen.entries()].filter(([w]) => /[א-ת]/.test(w) && !done[w.normalize('NFC')])
const chunk = Number(process.argv[2] || 1), size = Number(process.argv[3] || 140)
const slice = list.slice(0, size)
console.log('words still without a meaning:', list.length, '| showing', Math.min(size, list.length))
for (const [w, { ctx }] of slice) console.log(w + ' | ' + ctx)
