// For every vocab entry that does not match a word on ITS OWN page, find what the page actually says
// (an inflected form of the entry) or where else the word appears. Writes tools/vocab-proposals.json.
//
//   node tools/vocab-audit.mjs [storyId ...]      (no ids = every story)
//
// Matching mirrors the app's findVocabForWord (exact, after stripping up to two prefixes), then falls back to
// forms: plural/feminine suffixes for nouns and adjectives, and a root test for verbs (an entry is usually
// the infinitive, the story uses past/present). status: phrase-on-page | likely | maybe | other-page | none.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadStories } from './stories-loader.mjs'
const here = path.dirname(fileURLToPath(import.meta.url))
const only = process.argv.slice(2)

const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const PREFIXES = ['לכש', 'וכש', 'וש', 'כש', 'ש', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ']
const strip = (w) => {
  const r = [w]
  for (const p of PREFIXES) {
    if (w.startsWith(p) && w.length > p.length + 1) {
      const rest = w.slice(p.length); r.push(rest)
      for (const p2 of PREFIXES) if (rest.startsWith(p2) && rest.length > p2.length + 1) r.push(rest.slice(p2.length))
    }
  }
  return r
}
const words = (t) => t.replace(PUNCT, ' ').split(/\s+/).filter(Boolean)
// The stories are written in the short spelling (עיף, מיחד, ספורים) while the vocab lists use the full one
// (עייף, מיוחד, סיפורים). Comparing with the extra yod/vav left out makes them meet.
const N = (s) => s.replace(/[וי]/g, '')
function exact(v, w) {
  const cs = strip(w)
  if (cs.includes(v)) return true
  for (const vc of strip(v)) for (const c of cs) if (vc === c && vc.length >= 3) return true
  const nv = N(v)
  if (nv.length >= 3 && strip(N(w)).some((c) => c === nv)) return true
  return false
}
const SUF = ['ים', 'ות', 'ה', 'ת', 'ית', 'י', 'ו', 'ך', 'ם', 'ן', 'יה', 'יות', 'ין']
function nounForm(v, w) {
  for (const c of strip(w)) {
    if (c === v) return true
    for (const s of SUF) {
      if (c === v + s) return true
      if (v.endsWith('ה') && c === v.slice(0, -1) + s) return true
      if (v.endsWith('ת') && c === v.slice(0, -1) + s) return true
      if (v.endsWith('ה') && c === v.slice(0, -1) + 'ת') return true
    }
  }
  return false
}
function verbForm(v, w) {
  if (!v.startsWith('ל')) return false
  const core = v.slice(1)
  const variants = new Set([core])
  if (core.startsWith('הת')) variants.add(core.slice(2))
  if (core.startsWith('ה')) variants.add(core.slice(1))
  if (core.startsWith('נ')) variants.add(core.slice(1))
  for (const vr of variants) {
    if (vr.length < 2) continue
    for (const c of [w, ...strip(w)]) {
      if (c.length > vr.length + 4 || c.length < vr.length - 1) continue
      let k = 0, miss = 0
      for (const ch of vr) { const idx = c.indexOf(ch, k); if (idx < 0) miss++; else k = idx + 1 }
      if (miss <= (vr.length >= 4 ? 1 : 0)) return true
    }
  }
  return false
}

const out = []
const totals = {}
for (const story of loadStories()) {
  if (only.length && !only.includes(story.id)) continue
  const pageWords = story.pages.map((p) => (p.paragraphs || []).flatMap((x) => words(x.he)))
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
        phraseHit = parts.every((pt) => pageWords[pi].some((w) => strip(w).includes(pt))) ? parts.join(' + ') : null
        if (text.includes(v.he)) phraseHit = v.he
      }
      const elsewhere = pageWords.map((ws, j) => (j !== pi && ws.some((w) => exact(v.he, w) || (!phrase && nounForm(v.he, w))) ? j : -1)).filter((j) => j >= 0)
      const found = [...forms]
      // verbs conjugated on ANOTHER page (the infinitive is listed here, the story uses it elsewhere)
      const elsewhereVerb = []
      if (!found.length && !elsewhere.length && !phrase && v.he.startsWith('ל')) {
        pageWords.forEach((ws, j) => { if (j !== pi) { const hit = ws.find((w) => verbForm(v.he, w)); if (hit) elsewhereVerb.push({ page: j, form: hit }) } })
      }
      out.push({
        story: story.id, page: pi, he: v.he, en: v.en,
        status: phraseHit ? 'phrase-on-page' : found.length ? (found.some((f) => !f.endsWith(' ~')) ? 'likely' : 'maybe') : (elsewhere.length ? 'other-page' : elsewhereVerb.length ? 'other-page-verb' : 'none'),
        formsOnPage: found.slice(0, 4), phrase: phraseHit, otherPages: elsewhere.slice(0, 4), elsewhereVerb: elsewhereVerb.slice(0, 3),
      })
    }
  })
  totals[story.id] = { entries: total, matched: ok, attention: total - ok }
}
fs.writeFileSync(path.join(here, 'vocab-proposals.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify(totals))
const by = {}
out.forEach((o) => { by[o.status] = (by[o.status] || 0) + 1 })
console.log('need attention:', out.length, JSON.stringify(by))
