// For every vocab entry that does not match a word on ITS OWN page, find what the page actually says
// (an inflected form of the entry) or where else the word appears. Writes tools/vocab-proposals.json.
//
//   node tools/vocab-audit.mjs
//
// Matching mirrors the app's findVocabForWord (exact, after stripping one prefix), then falls back to
// forms: plural/feminine suffixes for nouns and adjectives, and a root test for verbs (an entry is
// usually the infinitive, the story uses past/present). "likely" = a form I would accept, "maybe" =
// needs a native speaker's eye.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
const raw = html.match(/<script id="storiesData"[^>]*>([\s\S]*?)<\/script>/)[1]
const start = raw.indexOf('const STORIES = [')
let i = raw.indexOf('[', start), depth = 0, q = null, esc = false, end = -1
for (; i < raw.length; i++) {
  const c = raw[i]
  if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = null; continue }
  if (c === '"' || c === "'" || c === '`') { q = c; continue }
  if (c === '/' && raw[i + 1] === '/') { while (raw[i] !== '\n' && i < raw.length) i++; continue }
  if (c === '[') depth++
  else if (c === ']') { depth--; if (depth === 0) { end = i; break } }
}
const story = new Function(raw.slice(start, end + 1) + ';return STORIES')()[0]

const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const PREFIXES = ['לכש', 'וכש', 'וש', 'כש', 'ש', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ']
const strip = (w) => { const r = [w]; for (const p of PREFIXES) if (w.startsWith(p) && w.length > p.length + 1) r.push(w.slice(p.length)); return r }
const words = (t) => t.replace(PUNCT, ' ').split(/\s+/).filter(Boolean)
function exact(v, w) {
  const cs = strip(w)
  if (cs.includes(v)) return true
  for (const vc of strip(v)) for (const c of cs) if (vc === c && vc.length >= 3) return true
  return false
}
const SUF = ['ים', 'ות', 'ה', 'ת', 'ית', 'י', 'ו', 'ך', 'ם', 'ן', 'יה', 'ים', 'יות', 'ין']
function nounForm(v, w) {
  for (const c of strip(w)) {
    if (c === v) return true
    for (const s of SUF) {
      if (c === v + s) return true
      if (v.endsWith('ה') && c === v.slice(0, -1) + s) return true       // feminine -> plural
      if (v.endsWith('ת') && c === v.slice(0, -1) + s) return true
      if (v.endsWith('ה') && c === v.slice(0, -1) + 'ת') return true
    }
    if (v.endsWith('ן') && c === v.slice(0, -1) + 'נ' + 'ים') return true
  }
  return false
}
// verb: strip the infinitive ל (and the hif'il / hitpa'el / nif'al prefix), then test the remaining
// consonants as an ordered subsequence of a story word
function root(v) {
  let r = v.replace(/^ל/, '')
  r = r.replace(/^(הת|הי|הס|הש)/, (m) => m)              // keep: tested leniently below
  return r
}
function verbForm(v, w) {
  if (!v.startsWith('ל')) return null
  const core = v.slice(1)
  const variants = new Set([core])
  if (core.startsWith('הת')) variants.add(core.slice(2))
  if (core.startsWith('ה')) variants.add(core.slice(1))
  if (core.startsWith('נ')) variants.add(core.slice(1))
  for (const vr of variants) {
    if (vr.length < 2) continue
    for (const c of [w, ...strip(w)]) {
      // all of the core's letters, in order, with at most ONE letter missing, in a word of similar length
      if (c.length > vr.length + 4 || c.length < vr.length - 1) continue
      let k = 0, miss = 0
      for (const ch of vr) { const idx = c.indexOf(ch, k); if (idx < 0) miss++; else k = idx + 1 }
      if (miss <= (vr.length >= 4 ? 1 : 0)) return true
    }
  }
  return false
}
const pageWords = story.pages.map((p) => (p.paragraphs || []).flatMap((x) => words(x.he)))
const out = []
let total = 0, ok = 0
story.pages.forEach((p, pi) => {
  for (const v of p.vocab || []) {
    total++
    if (pageWords[pi].some((w) => exact(v.he, w))) { ok++; continue }
    const phrase = v.he.includes(' ')
    const forms = new Set()
    for (const w of pageWords[pi]) {
      if (phrase) continue
      if (nounForm(v.he, w)) forms.add(w)
      else if (verbForm(v.he, w)) forms.add(w + ' ~')
    }
    let phraseHit = null
    if (phrase) {
      const text = (p.paragraphs || []).map((x) => x.he.replace(PUNCT, ' ')).join(' ')
      const parts = v.he.split(' ')
      phraseHit = parts.every((pt) => pageWords[pi].some((w) => strip(w).includes(pt) || strip(pt).some((s) => strip(w).includes(s)))) ? parts.join(' + ') : null
      if (text.includes(v.he)) phraseHit = v.he
    }
    const elsewhere = pageWords.map((ws, j) => (j !== pi && ws.some((w) => exact(v.he, w) || (!phrase && nounForm(v.he, w))) ? j : -1)).filter((j) => j >= 0)
    const found = [...forms]
    out.push({
      page: pi, he: v.he, en: v.en,
      status: phraseHit ? 'phrase-on-page' : found.length ? (found.some((f) => !f.endsWith(' ~')) ? 'likely' : 'maybe') : (elsewhere.length ? 'other-page' : 'none'),
      formsOnPage: found.slice(0, 4), phrase: phraseHit, otherPages: elsewhere.slice(0, 4),
    })
  }
})
fs.writeFileSync(path.join(here, 'vocab-proposals.json'), JSON.stringify(out, null, 1))
const by = {}
out.forEach((o) => { by[o.status] = (by[o.status] || 0) + 1 })
console.log('entries', total, '| match their page already', ok, '| need attention', out.length)
console.log(JSON.stringify(by))
out.forEach((o) => console.log(String(o.page).padStart(2), o.status.padEnd(14), o.he.padEnd(14), '=', o.en.slice(0, 22).padEnd(22), '->', o.formsOnPage.join(', ') || (o.phrase ? 'phrase: ' + o.phrase : '') || '', o.otherPages.length ? 'also on pg ' + o.otherPages.join(',') : ''))
