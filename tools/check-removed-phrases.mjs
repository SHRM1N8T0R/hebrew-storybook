// Sanity check on the vocab fixes: which phrases that are about to be removed from a page actually have all their
// words on that page (so the strict matcher missed them)? Those should be kept, not removed.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadStories } from './stories-loader.mjs'
const here = path.dirname(fileURLToPath(import.meta.url))
const S = Object.fromEntries(loadStories().map((s) => [s.id, s]))
const f = JSON.parse(fs.readFileSync(path.join(here, 'vocab-fixes.json'), 'utf8'))
const N = (s) => s.replace(/[ויְ-ׇ]/g, '').replace(/[,.!?;:"'״׳()\[\]{}…“”–—-]/g, '')
const loose = []
const phr = f.remove.filter((r) => r.he.includes(' '))
for (const r of phr) {
  const txt = N((S[r.story || 'apartment'].pages[r.page].paragraphs || []).map((x) => x.he).join(' '))
  const parts = r.he.split(' ').map(N).filter((p) => p.length >= 2)
  if (parts.length && parts.every((p) => txt.includes(p))) loose.push(r)
}
console.log('phrases removed:', phr.length, '| all words present on the page:', loose.length)
console.log(loose.map((r) => r.story + ':' + r.page + ' ' + r.he).join('  |  '))
if (process.argv[2] === 'write') {
  // keep those: drop them from the remove list
  const keep = new Set(loose.map((r) => r.story + '|' + r.page + '|' + r.he))
  f.remove = f.remove.filter((r) => !keep.has(r.story + '|' + r.page + '|' + r.he))
  fs.writeFileSync(path.join(here, 'vocab-fixes.json'), JSON.stringify(f, null, 1))
  console.log('kept', keep.size, 'phrases; remove list is now', f.remove.length)
}
