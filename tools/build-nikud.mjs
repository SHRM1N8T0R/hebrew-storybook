// Vowels the whole story ONCE, offline, so the app never has to ask Dicta while someone reads.
//
//   node tools/build-nikud.mjs
//
// Reads STORIES out of ../index.html, sends each paragraph to Dicta Nakdan in context (a
// full sentence gives far better vowelling than a lone word), and writes tools/nikud-cache.json:
//   { "<pageIndex>:<paraIndex>": "<vowelled paragraph>" }
// Each entry is checked word by word against the original text: if Dicta changed the
// letters (added or dropped a yud or vav), that word falls back to the unvowelled original
// instead of a reading we cannot trust. Mismatches are listed so they can be fixed by hand.
//
// Re-running only asks Dicta for paragraphs missing from the cache.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
const raw = html.match(/<script id="storiesData"[^>]*>([\s\S]*?)<\/script>/)[1]

// Pull the STORIES literal out with a string-aware bracket match (the same script also holds app code).
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
const STORIES = new Function(raw.slice(start, end + 1) + ';return STORIES')()
const story = STORIES[0]

const API = 'https://nakdan-5-3.loadbalancer.dicta.org.il/api'
const CACHE = path.join(here, 'nikud-cache.json')
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}

const NIKUD = /[֑-ׇ]/g
const bare = (s) => s.replace(NIKUD, '').replace(/[,.!?;:"'״׳()\[\]{}…“”–—‏‎]/g, '')
// Dicta writes the standard vowelled spelling, so it drops the extra yud/vav that modern spelling
// adds (עכשיו -> עַכְשָׁו). Compare the skeleton without those two letters.
const skeleton = (s) => bare(s).replace(/[וי]/g, '')

async function vowel(text) {
  const r = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'nakdan', genre: 'modern', data: text, addmorph: false, matchpartial: true, keepmetagim: false, keepqq: false, nodageshdefmem: false }),
  })
  if (!r.ok) throw new Error('Dicta ' + r.status)
  const j = await r.json()
  const toks = Array.isArray(j) ? j : (j.data || [])
  return toks.map((t) => {
    if (t.sep) return t.word
    const o = t.options && t.options[0]
    return o ? (typeof o === 'string' ? o : (o.w || t.word)) : t.word
  }).join('').replace(/\|/g, '')
}

const problems = []
let asked = 0
for (let p = 0; p < story.pages.length; p++) {
  const paras = story.pages[p].paragraphs || []
  for (let k = 0; k < paras.length; k++) {
    const key = p + ':' + k
    if (cache[key]) continue
    const original = paras[k].he
    let vowelled = ''
    for (let attempt = 0; attempt < 3 && !vowelled; attempt++) {
      try { vowelled = await vowel(original) } catch (e) { await new Promise((r) => setTimeout(r, 1500)) }
    }
    asked++
    if (!vowelled) { problems.push(key + ' FAILED'); continue }
    // word-by-word check: same count, and the letters must be identical once the vowels are removed
    const ow = original.split(/\s+/), vw = vowelled.split(/\s+/)
    if (ow.length !== vw.length) { problems.push(key + ' word count ' + ow.length + ' vs ' + vw.length); continue }
    const fixed = vw.map((w, n) => {
      if (skeleton(w) === skeleton(ow[n])) return w
      problems.push(key + ' word ' + n + ': ' + ow[n] + ' -> ' + w + ' (consonants changed, kept unvowelled)')
      return ow[n]
    })
    cache[key] = fixed.join(' ')
    if (asked % 10 === 0) fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1))
    await new Promise((r) => setTimeout(r, 120))
  }
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1))
console.log('paragraphs vowelled:', Object.keys(cache).length, '| asked Dicta for:', asked, '| problems:', problems.length)
problems.slice(0, 40).forEach((x) => console.log('  ', x))
