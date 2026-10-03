// node tools/test-translit.mjs [all]  - prints transliterations of the story's distinct words, plus flags
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { translit } from './translit.mjs'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const ov = fs.existsSync(path.join(here, 'translit-overrides.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'translit-overrides.json'), 'utf8')) : {}
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
const words = new Map()
for (const para of Object.values(cache)) for (const w of para.split(/\s+/)) { const f = w.replace(PUNCT, ''); if (f) words.set(f, (words.get(f) || 0) + 1) }

// sanity cases (known right answers)
const cases = {
  'וְאַרְגָּזִים': 'veargazim', 'וּמִסְתַּכֶּלֶת': 'umistakelet', 'רוּחַ': 'ruach', 'בַּיִת': 'bayit', 'אֵין': 'ein',
  'הִיא': 'hi', 'שָׁלוֹם': 'shalom', 'יוֹשֶׁבֶת': 'yoshevet', 'לְהַתְחִיל': 'lehatchil', 'עַכְשָׁו': 'achshav',
  'בְּקוֹל': 'bekol', 'סָבִיב': 'saviv', 'הַדִּירָה': 'hadira', 'מְלֵאָה': 'melea', 'לִקְרֹא': 'likro',
}
let bad = 0
for (const [h, want] of Object.entries(cases)) {
  const got = translit(h, ov)
  if (got !== want) { bad++; console.log('CASE FAIL', h, 'got', got, 'want', want) }
}
console.log('known cases:', Object.keys(cases).length - bad, '/', Object.keys(cases).length, 'ok\n')

const flagged = []
const initShva = []
for (const [w, n] of words) {
  const t = translit(w, ov)
  if (/[^aeiouy]{4,}/.test(t.replace(/(ch|sh|ts|kh|zh)/g, 'X'))) flagged.push(w + ' -> ' + t)
  if (/^[א-ת]ְ/.test(w.replace(/[֑-֯]/g, ''))) initShva.push(w + ' -> ' + t + (n > 1 ? ' x' + n : ''))
}
console.log('distinct words:', words.size)
console.log('\nINITIAL-SHVA words (decide e vs silent):', initShva.length)
console.log(initShva.join('   '))
console.log('\nFLAGGED (4+ consonants in a row):', flagged.length)
console.log(flagged.join('   '))
if (process.argv[2] === 'all') for (const [w] of words) console.log(w, translit(w, ov))
