// Builds tools/vocab-fixes.json: the corrections that make every page's vocabulary list match the page.
// Starts from tools/vocab-proposals.json (node tools/vocab-audit.mjs), removes the false matches rejected by
// reading each one in context, and adds the forms the automatic pass could not see.
//
//   node tools/vocab-audit.mjs && node tools/build-vocab-fixes.mjs && node tools/apply-data.mjs
//
// vocab-fixes.json shape (applied at load by the VOCAB_FIXES block that tools/apply-data.mjs embeds; "story"
// defaults to "apartment"):
//   forms:   [{ story, page, he, forms: ["inflected forms as written on this page"] }]
//   replace: [{ story, page, he, with: { he, en } }]      the entry named the wrong word
//   move:    [{ story, from, to, he }]                    the word is used on a different page
//   remove:  [{ story, page, he }]                        the word is not on the page and not in the story
// Nothing is deleted from the story data itself: these are applied when the page loads, so any of them can be
// reverted by deleting its line here and rebuilding.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const props = JSON.parse(fs.readFileSync(path.join(here, 'vocab-proposals.json'), 'utf8'))
const fixes = { forms: [], replace: [], move: [], remove: [] }

// ---------------------------------------------------------------- the first story (curated entry by entry)
const REJECT = new Set(['הצעיר', 'הלימון', 'להפריע', 'תישארי', 'בטוחה', 'לראות', 'לעשות', 'ברכבת', 'שכולם', 'תפקידים@43:להתקדם', 'בשכונה', 'חזק', 'יושבת', 'זוכרת@9:להיזכר'])
const rejected = (form, page, he) => REJECT.has(form) || REJECT.has(form + '@' + page + ':' + he)
const manual = {
  '31|לגלות': ['שמגלה'], '41|לנשום': ['ונשמה'], '7|לחכות': ['מחכה'], '13|לחכות': ['מחכה'], '17|עייף': ['עייפה'],
  '24|להיוולד': ['נולדתי'], '28|לחמם': ['חיממה'], '46|לשלם': ['שילמה'], '11|עורך דין': ['עורכת דין', 'עורכי דין'],
  '5|נעים': ['נעימה'], '20|צבעים': ['ובצבעים'], '13|לחוץ': ['לחוצה'], '17|לעלות': ['עולה'], '32|דרך': ['בדרכו'],
}
const dropEntries = new Set(['35|לשנות', '20|אשתו', '34|מבקרת', '18|רגילה'])
for (const e of props.filter((x) => x.story === 'apartment')) {
  const key = e.page + '|' + e.he
  if (dropEntries.has(key)) continue
  if (manual[key]) { fixes.forms.push({ page: e.page, he: e.he, forms: manual[key] }); continue }
  if (e.status === 'phrase-on-page') continue
  const forms = e.formsOnPage.map((f) => f.replace(' ~', '')).filter((f) => !rejected(f, e.page, e.he))
  if (forms.length) fixes.forms.push({ page: e.page, he: e.he, forms })
  else console.log('UNRESOLVED (apartment):', key, e.status)
}
fixes.forms.push({ page: 3, he: 'לסדר', forms: ['אסדר'] })
fixes.replace.push({ page: 20, he: 'אשתו', with: { he: 'אשתי', en: 'my wife' } })
fixes.replace.push({ page: 34, he: 'מבקרת', with: { he: 'לבקר', en: 'to visit' } })
fixes.move.push({ from: 18, to: 19, he: 'רגילה' })
fixes.remove.push({ page: 35, he: 'לשנות' })

// ---------------------------------------------------------------- the other nine stories
// Verb matches (an infinitive listed, a conjugated form on the page) that were read in context and accepted.
// Anything not listed here was a false match (a noun or an unrelated word that merely shares letters).
const ACCEPT = {
  'cat|7|לחשוב': ['חושב'], 'cat|10|לקפוץ': ['קפץ'], 'cat|11|לחפש': ['חיפש'], 'cat|14|לצייר': ['מציירת'], 'cat|16|להתרגש': ['התרגשה'],
  'cat|20|להגיע': ['הגיעה'], 'cat|21|להתרגל': ['התרגלו'], 'cat|22|להביא': ['הביאה'],
  'restaurant|2|לסרב': ['סירב'], 'restaurant|3|לפרסם': ['פרסמה'], 'restaurant|4|לנקות': ['ניקתה'], 'restaurant|5|להכיר': ['הכירה'],
  'restaurant|5|לטעום': ['טעמו'], 'restaurant|5|להסכים': ['הסכימו'], 'restaurant|8|למצוא': ['מצאו'], 'restaurant|9|לצבוע': ['צבעה'],
  'restaurant|9|להצליח': ['נצליח'], 'restaurant|10|לבחור': ['בחרו'], 'restaurant|12|להיפתח': ['נפתחה'], 'restaurant|12|להתאפק': ['התאפקה'],
  'restaurant|13|להאמין': ['האמינה'], 'restaurant|13|לספר': ['סיפר'], 'restaurant|15|לבכות': ['ובכתה'], 'restaurant|16|לקבל': ['קיבלו'],
  'restaurant|18|להרגיש': ['הרגישה'], 'restaurant|19|להזמין': ['הזמינו'], 'restaurant|21|להביט': ['מביטה'], 'restaurant|22|לסגור': ['סוגרת'],
  'trip|2|לשכור': ['נשכור'], 'trip|5|לעצור': ['תעצרי', 'עוצרת'], 'trip|6|לאכול': ['אוכלים'], 'trip|13|לצחוק': ['צוחקת', 'וצוחקת'],
  'trip|23|להתפלל': ['מתפללים'], 'trip|27|לדפדף': ['מדפדפים'],
  'garden|6|לשאול': ['שואל'], 'garden|8|לאסוף': ['נאסוף'], 'garden|12|לשתוק': ['שותקים'], 'garden|13|לאהוב': ['אוהב'],
  'garden|15|לבחור': ['בחרתי'], 'garden|15|לבנות': ['בניתי'], 'garden|27|לטפח': ['אטפח'],
  'shlomo|14|לחדש': ['מחדשים'], 'language|5|לגעגע': ['מתגעגעת'],
  'aliyah|2|להבין': ['הבינה'], 'aliyah|3|להסתובב': ['הסתובבה'], 'aliyah|4|לחזור': ['חזרה'], 'aliyah|6|לסדר': ['מסודרים'],
  'aliyah|11|לבכות': ['בכתה'], 'aliyah|16|להתחבר': ['התחברו'], 'aliyah|20|להתקשר': ['התקשרה'], 'aliyah|26|להשאיר': ['שהשארת'],
}
// Verbs listed on one page but used (conjugated) on another page: [from page, to page, accepted form on that page]
const VERB_MOVES = {
  'cat|15|לתאר': 'שתיארת', 'trip|1|לתכנן': 'מתכננת', 'trip|1|לנסוע': 'נוסעים', 'garden|7|לכאוב': 'כואב',
  'aliyah|1|להחליט': 'שהחליטו', 'aliyah|23|לתכנן': 'שמתכננים', 'school|2|לגמגם': 'התגמגם',
}
let counts = { forms: 0, moved: 0, removed: 0 }
for (const e of props.filter((x) => x.story !== 'apartment')) {
  const key = e.story + '|' + e.page + '|' + e.he
  const st = e.story
  if (e.status === 'phrase-on-page') continue
  if (e.status === 'likely') { fixes.forms.push({ story: st, page: e.page, he: e.he, forms: e.formsOnPage.map((f) => f.replace(' ~', '')) }); counts.forms++; continue }
  if (e.status === 'maybe') {
    const acc = ACCEPT[key]
    if (acc && acc.length) { fixes.forms.push({ story: st, page: e.page, he: e.he, forms: acc }); counts.forms++; continue }
    // every guess was false: treat like a word that is not on this page
    if (e.otherPages.length) { fixes.move.push({ story: st, from: e.page, to: e.otherPages[0], he: e.he }); counts.moved++ } else { fixes.remove.push({ story: st, page: e.page, he: e.he }); counts.removed++ }
    continue
  }
  if (e.status === 'other-page') { fixes.move.push({ story: st, from: e.page, to: e.otherPages[0], he: e.he }); counts.moved++; continue }
  if (e.status === 'other-page-verb') {
    const form = VERB_MOVES[key]
    const hit = form && e.elsewhereVerb.find((x) => x.form.replace(/[^א-ת]/g, '') === form || x.form === form)
    if (hit) { fixes.move.push({ story: st, from: e.page, to: hit.page, he: e.he }); fixes.forms.push({ story: st, page: hit.page, he: e.he, forms: [hit.form] }); counts.moved++; continue }
    fixes.remove.push({ story: st, page: e.page, he: e.he }); counts.removed++; continue
  }
  // none: not on the page and nowhere else in the story
  fixes.remove.push({ story: st, page: e.page, he: e.he }); counts.removed++
}
fs.writeFileSync(path.join(here, 'vocab-fixes.json'), JSON.stringify(fixes, null, 1))
console.log('forms:', fixes.forms.length, '| replace:', fixes.replace.length, '| move:', fixes.move.length, '| remove:', fixes.remove.length, '| other stories:', JSON.stringify(counts))
