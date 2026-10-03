// Shows each unresolved vocab entry with the words around its candidate forms, so a human can judge them.
//   node tools/vocab-context.mjs [status ...]      e.g.  maybe  none  other-page
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const props = JSON.parse(fs.readFileSync(path.join(here, 'vocab-proposals.json'), 'utf8'))
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
const want = process.argv.slice(2)
const toks = story.pages.map((p) => (p.paragraphs || []).flatMap((x) => x.he.replace(PUNCT, ' ').split(/\s+/).filter(Boolean)))
for (const e of props.filter((x) => want.includes(x.status))) {
  const ws = toks[e.page]
  const show = e.formsOnPage.length ? e.formsOnPage.map((f) => f.replace(' ~', '')) : []
  const lines = show.map((f) => {
    const k = ws.indexOf(f)
    return k < 0 ? f : '"' + ws.slice(Math.max(0, k - 2), k + 3).join(' ') + '"'
  })
  console.log(`p${e.page} ${e.he} (${e.en}) [${e.status}]  ${lines.join('  //  ')}${e.otherPages.length ? '  | also pg ' + e.otherPages.join(',') : ''}`)
}
