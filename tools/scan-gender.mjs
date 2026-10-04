// Lists the words Dicta tends to vowel as MASCULINE by default, with context, so a person can check who is being
// addressed or who is speaking and correct them (see tools/fix-gender.mjs):
//   - second-person masculine forms: ending ךָ (לְךָ, אוֹתְךָ, שֶׁלְּךָ ...) and past tense ending תָּ (יָדַעְתָּ ...)
//   - participles / adjectives ending segol+he (רוֹצֶה, חוֹלֶה, יָפֶה ...) that are feminine when a woman speaks
//   node tools/scan-gender.mjs <storyId> [second|participle|both]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadStories } from './stories-loader.mjs'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const fix = JSON.parse(fs.readFileSync(path.join(here, 'nikud-overrides.json'), 'utf8'))
const NIK = /[֑-ׇ]/g
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const id = process.argv[2], mode = process.argv[3] || 'both'
const story = loadStories().find((s) => s.id === id)
const second = /ךָ$|ת[ּ]?ָ$/
const segolHe = /ֶה$/
const skip = new Set(['זֶה', 'הַזֶּה', 'אֵיזֶה', 'קָפֶה', 'הַקָּפֶה', 'מֵהַקָּפֶה', 'לַקָּפֶה', 'שְׁמוֹנֶה', 'בִּשְׁמוֹנֶה', 'וּשְׁמוֹנֶה', 'לָזֶה', 'מִזֶּה', 'תֶּה', 'הָאֵלֶּה', 'הַמַּעֲקֶה', 'יִהְיֶה', 'יִקְרֶה', 'אֶעֱשֶׂה', 'אַרְאֶה', 'נְנַסֶּה'])
let n = 0
story.pages.forEach((pg, pi) => {
  ;(pg.paragraphs || []).forEach((para, k) => {
    const key = id + '|' + pi + ':' + k
    const ws = (cache[key] || '').split(/\s+/)
    ws.forEach((w, i) => { const f = fix[key + ':' + i]; if (f) ws[i] = f })
    ws.forEach((w, i) => {
      const f = w.replace(PUNCT, '')
      const bare = f.replace(NIK, '')
      const hit = ((mode === 'second' || mode === 'both') && second.test(f) && /[א-ת]{2,}/.test(bare)) ||
                  ((mode === 'participle' || mode === 'both') && segolHe.test(f) && !skip.has(f))
      if (!hit) return
      n++
      const ctx = ws.slice(Math.max(0, i - 5), i + 4).map((x) => x.replace(NIK, '')).join(' ')
      console.log(`${pi}:${k}:${i} ${f}  | ${ctx}  || ${para.en.slice(0, 90)}`)
    })
  })
})
console.log('total', n)
