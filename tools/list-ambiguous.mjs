// Lists the words where Dicta had more than one different vowelling to choose from, with its
// pick first. Those are the words worth a native speaker's eye; the rest were unambiguous.
//
//   node tools/list-ambiguous.mjs   ->  tools/review-ambiguous.json  (+ a count)
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
const API = 'https://nakdan-5-3.loadbalancer.dicta.org.il/api'
const out = []
let tokens = 0
for (let p = 0; p < story.pages.length; p++) {
  const paras = story.pages[p].paragraphs || []
  for (let k = 0; k < paras.length; k++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'nakdan', genre: 'modern', data: paras[k].he, addmorph: false, matchpartial: true, keepmetagim: false, keepqq: false, nodageshdefmem: false }) })
    const j = await r.json()
    const toks = Array.isArray(j) ? j : (j.data || [])
    for (const t of toks) {
      if (t.sep || !t.options) continue
      tokens++
      const opts = [...new Set(t.options.map((o) => (typeof o === 'string' ? o : o.w)).map((w) => (w || '').replace(/\|/g, '')))].filter(Boolean)
      if (opts.length > 1) out.push({ at: p + ':' + k, word: t.word, pick: opts[0], others: opts.slice(1, 4) })
    }
    await new Promise((r) => setTimeout(r, 100))
  }
}
fs.writeFileSync(path.join(here, 'review-ambiguous.json'), JSON.stringify(out, null, 1))
const uniq = new Set(out.map((x) => x.word + '>' + x.pick))
console.log('tokens', tokens, '| ambiguous', out.length, '| distinct word+pick pairs', uniq.size)
