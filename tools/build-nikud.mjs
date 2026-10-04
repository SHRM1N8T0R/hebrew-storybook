// Vowels EVERY story once, offline, so the app never has to ask Dicta while someone reads.
//
//   node tools/build-nikud.mjs [storyId ...]      (no ids = all stories)
//
// Sends each paragraph to Dicta Nakdan in context (a full sentence gives far better vowelling than a lone word)
// and writes tools/nikud-cache.json:  { "<storyId>|<pageIndex>:<paraIndex>": "<vowelled paragraph>" }
// Each entry is checked word by word against the original text: if Dicta changed the consonants (ignoring the
// yud/vav it drops when it writes the standard vowelled spelling), that word falls back to the original instead
// of a reading we cannot trust. Problems are listed so they can be fixed by hand.
// Re-running only asks Dicta for paragraphs missing from the cache.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadStories } from './stories-loader.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const STORIES = loadStories()
const only = process.argv.slice(2)

const API = 'https://nakdan-5-3.loadbalancer.dicta.org.il/api'
const CACHE = path.join(here, 'nikud-cache.json')
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}

const NIKUD = /[֑-ׇ]/g
const bare = (s) => s.replace(NIKUD, '').replace(/[,.!?;:"'״׳()\[\]{}…“”–—‏‎]/g, '')
// Dicta writes the standard vowelled spelling, so it drops the extra yud/vav that modern spelling adds
// (עכשיו -> עַכְשָׁו). Compare the skeleton without those two letters.
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
for (const story of STORIES) {
  if (only.length && !only.includes(story.id)) continue
  for (let p = 0; p < story.pages.length; p++) {
    const paras = story.pages[p].paragraphs || []
    for (let k = 0; k < paras.length; k++) {
      const key = story.id + '|' + p + ':' + k
      if (cache[key]) continue
      const original = paras[k].he
      let vowelled = ''
      for (let attempt = 0; attempt < 3 && !vowelled; attempt++) {
        try { vowelled = await vowel(original) } catch (e) { await new Promise((r) => setTimeout(r, 1500)) }
      }
      asked++
      if (!vowelled) { problems.push(key + ' FAILED'); continue }
      const ow = original.split(/\s+/), vw = vowelled.split(/\s+/)
      if (ow.length !== vw.length) { problems.push(key + ' word count ' + ow.length + ' vs ' + vw.length); continue }
      const fixed = vw.map((w, n) => {
        if (skeleton(w) === skeleton(ow[n])) return w
        problems.push(key + ' word ' + n + ': ' + ow[n] + ' -> ' + w + ' (consonants changed, kept unvowelled)')
        return ow[n]
      })
      cache[key] = fixed.join(' ')
      if (asked % 20 === 0) fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1))
      await new Promise((r) => setTimeout(r, 100))
    }
  }
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1))
console.log('paragraphs vowelled:', Object.keys(cache).length, '| asked Dicta for:', asked, '| problems:', problems.length)
problems.slice(0, 40).forEach((x) => console.log('  ', x))
