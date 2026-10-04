// Shows each unresolved vocab entry with the words around its candidate forms, so a human can judge them.
//   node tools/vocab-context.mjs <status> [storyId ...]      e.g.  maybe trip garden   |   other-page-verb
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadStories } from './stories-loader.mjs'
const here = path.dirname(fileURLToPath(import.meta.url))
const props = JSON.parse(fs.readFileSync(path.join(here, 'vocab-proposals.json'), 'utf8'))
const [status, ...ids] = process.argv.slice(2)
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const stories = Object.fromEntries(loadStories().map((s) => [s.id, s]))
const toks = (id, p) => (stories[id].pages[p].paragraphs || []).flatMap((x) => x.he.replace(PUNCT, ' ').split(/\s+/).filter(Boolean))
for (const e of props.filter((x) => x.status === status && (!ids.length || ids.includes(x.story)))) {
  const win = (p, f) => { const ws = toks(e.story, p); const k = ws.indexOf(f); return k < 0 ? f : ws.slice(Math.max(0, k - 2), k + 3).join(' ') }
  let detail
  if (status === 'other-page-verb') detail = e.elsewhereVerb.map((x) => `p${x.page} "${win(x.page, x.form)}"`).join(' // ')
  else if (status === 'other-page') detail = 'also pg ' + e.otherPages.join(',')
  else detail = e.formsOnPage.map((f) => '"' + win(e.page, f.replace(' ~', '')) + '"').join(' // ')
  console.log(`${e.story}|${e.page}|${e.he} (${e.en}) ${detail}`)
}
