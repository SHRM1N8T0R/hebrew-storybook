// Dicta vowels the second-person endings as masculine by default (אותך -> אוֹתְךָ). In this story almost every
// "you" is a woman (Maya, her grandmother), so 18 of the 20 masculine forms are wrong (and 8 more participles, see below), and the transliteration
// and speech would say "otcha" / "bata" to a woman. Each fix below was checked against who is speaking to whom.
// Writes the full corrected token (punctuation kept) into tools/nikud-overrides.json.
//   node tools/fix-gender.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const cache = JSON.parse(fs.readFileSync(path.join(here, 'nikud-cache.json'), 'utf8'))
const file = path.join(here, 'nikud-overrides.json')
const ov = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
const PUNCT = /[,.!?;:"'״׳()\[\]{}…“”–—]/g
// key page:paragraph:wordIndex -> corrected word (without punctuation)
const fixes = {
  '7:4:7': 'אוֹתָךְ',      // Naama to Maya: I haven't seen you before
  '11:0:7': 'בָּאת',        // Naama to Maya: why did you come to Tel Aviv
  '19:5:4': 'לָךְ',          // I'll help you (come, f.)
  '22:4:13': 'עָלַיִךְ',    // Noam's mom to Maya: Noam told us about you
  '26:4:2': 'שֶׁלָּךְ',     // your health (rest, f.)
  '27:1:1': 'שְׁלוֹמֵךְ',  // Noam to Maya: how are you
  '27:1:4': 'אוֹתָךְ',      // I didn't see you
  '27:3:3': 'לָךְ',          // do you have food
  '33:2:2': 'שְׁלוֹמֵךְ',  // Maya to her grandmother: how are you
  '33:3:13': 'שֶׁלָּךְ',    // grandmother to Maya: your new life
  '34:5:5': 'בִּשְׁבִילֵךְ', // a place for you
  '36:3:7': 'שֶׁבָּאת',     // mom: how nice that you came
  '37:2:7': 'הֵבֵאת',       // Yuval to Maya: did you bring me something
  '38:2:11': 'לָךְ',         // Tel Aviv suits you
  '39:0:3': 'אוֹתָךְ',      // Maya to her grandmother: I wanted to ask you
  '39:4:16': 'שֶׁלָּךְ',    // your way now is good
  '39:6:5': 'שֶׁלָּךְ',     // your eyes
  '41:3:0': 'חָזַרְתְּ',    // Noam to Maya: you're back
  // first-person and feminine-subject participles that Dicta also defaulted to masculine
  '21:2:7': 'רוֹצָה',      // Maya: I don't want to bother
  '26:1:6': 'חוֹלָה',      // Maya: I'm sick
  '27:2:1': 'חוֹלָה',      // Maya: I'm sick
  '39:6:2': 'רוֹאָה',      // grandmother: I see your eyes
  '38:2:1': 'יָפָה',        // my beautiful (to Maya)
  '30:3:8': 'יָפָה',        // the most beautiful city (עיר is feminine)
  '29:2:4': 'יָפָה',        // the road was beautiful (דרך is feminine)
  '22:0:6': 'יָפָה',        // a beautiful dress (שמלה is feminine)
}
// left as they are (a man is addressed): 31:4:2 יָדַעְתָּ (Maya to Danny), 37:3:8 לְךָ (Maya to Yuval)
let n = 0
for (const [k, to] of Object.entries(fixes)) {
  const [p, q, w] = k.split(':')
  const tok = cache[p + ':' + q].split(/\s+/)[Number(w)]
  const core = tok.replace(PUNCT, '')
  ov[k] = tok.replace(core, to)
  n++
}
fs.writeFileSync(file, JSON.stringify(ov, null, 1))
console.log('gender corrections written:', n)
