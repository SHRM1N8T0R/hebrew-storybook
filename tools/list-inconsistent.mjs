// Words that were vowelled DIFFERENTLY in different places in the story. Sometimes that is right
// (the same letters read two ways), but a wrong guess shows up here, so it is the short list worth
// a native speaker's eye. Writes tools/review-inconsistent.json.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const NIKUD = /[֑-ׇ]/g
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const groups = {}
for (const [key, para] of Object.entries(cache)) {
  for (const w of para.split(/\s+/)) {
    const bare = w.replace(NIKUD, '').replace(PUNCT, '')
    const clean = w.replace(PUNCT, '')
    if (bare.length < 2) continue
    ;(groups[bare] = groups[bare] || {})[clean] = ((groups[bare] || {})[clean] || []).concat(key)
  }
}
const out = []
for (const [bare, readings] of Object.entries(groups)) {
  const forms = Object.keys(readings)
  if (forms.length > 1) out.push({ word: bare, readings: forms.map((f) => ({ vowelled: f, count: readings[f].length, first: readings[f][0] })) })
}
fs.writeFileSync(path.join(here, 'review-inconsistent.json'), JSON.stringify(out, null, 1))
console.log('distinct words', Object.keys(groups).length, '| read more than one way:', out.length)
out.slice(0, 40).forEach((o) => console.log(o.word, '=>', o.readings.map((r) => r.vowelled + ' x' + r.count).join('  |  ')))
