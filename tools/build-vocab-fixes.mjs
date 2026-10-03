// Builds tools/vocab-fixes.json: the corrections that make every page's vocabulary list match the page.
// Starts from tools/vocab-proposals.json (node tools/vocab-audit.mjs), removes the false matches I
// rejected by reading each one in context, and adds the forms the automatic pass could not see.
//
//   node tools/build-vocab-fixes.mjs
//
// vocab-fixes.json shape (applied at load by the VOCAB_FIXES block that tools/apply-data.mjs embeds):
//   forms:   [{ page, he, forms: ["inflected forms as written on this page"] }]
//   replace: [{ page, he, with: { he, en } }]      the entry named the wrong word
//   move:    [{ from, to, he }]                    the word is used on a different page
//   remove:  [{ page, he }]                        the word is not in the story at all
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const props = JSON.parse(fs.readFileSync(path.join(here, 'vocab-proposals.json'), 'utf8'))

// false positives from the automatic root test, rejected after reading them in context
const REJECT = new Set(['הצעיר', 'הלימון', 'להפריע', 'תישארי', 'בטוחה', 'לראות', 'לעשות', 'ברכבת', 'שכולם', 'תפקידים@43:להתקדם', 'בשכונה', 'חזק', 'יושבת', 'זוכרת@9:להיזכר'])
const rejected = (form, page, he) => REJECT.has(form) || REJECT.has(form + '@' + page + ':' + he)

const fixes = { forms: [], replace: [], move: [], remove: [] }
const manual = {
  '31|לגלות': ['שמגלה'], '41|לנשום': ['ונשמה'], '7|לחכות': ['מחכה'], '13|לחכות': ['מחכה'], '17|עייף': ['עייפה'],
  '24|להיוולד': ['נולדתי'], '28|לחמם': ['חיממה'], '46|לשלם': ['שילמה'], '11|עורך דין': ['עורכת דין', 'עורכי דין'],
  '5|נעים': ['נעימה'], '20|צבעים': ['ובצבעים'], '13|לחוץ': ['לחוצה'], '17|לעלות': ['עולה'], '32|דרך': ['בדרכו'],
}
const dropEntries = new Set(['35|לשנות', '20|אשתו', '34|מבקרת', '18|רגילה'])   // handled below

for (const e of props) {
  const key = e.page + '|' + e.he
  if (dropEntries.has(key)) continue
  if (manual[key]) { fixes.forms.push({ page: e.page, he: e.he, forms: manual[key] }); continue }
  if (e.status === 'phrase-on-page') continue                         // the app links a phrase by its words
  const forms = e.formsOnPage.map((f) => f.replace(' ~', '')).filter((f) => !rejected(f, e.page, e.he))
  if (forms.length) fixes.forms.push({ page: e.page, he: e.he, forms })
  else console.log('UNRESOLVED:', key, e.status)
}
// entries the audit counted as matched only because of a prefix coincidence (בסדר ~ לסדר): give them their real form
fixes.forms.push({ page: 3, he: 'לסדר', forms: ['אסדר'] })
fixes.replace.push({ page: 20, he: 'אשתו', with: { he: 'אשתי', en: 'my wife' } })      // the text says אשתי
fixes.replace.push({ page: 34, he: 'מבקרת', with: { he: 'לבקר', en: 'to visit' } })    // the text says לבקר
fixes.move.push({ from: 18, to: 19, he: 'רגילה' })                                     // used on page 19
fixes.remove.push({ page: 35, he: 'לשנות' })                                           // not in the story

fs.writeFileSync(path.join(here, 'vocab-fixes.json'), JSON.stringify(fixes, null, 1))
console.log('forms:', fixes.forms.length, '| replace:', fixes.replace.length, '| move:', fixes.move.length, '| remove:', fixes.remove.length)
