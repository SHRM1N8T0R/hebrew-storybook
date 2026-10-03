// Hebrew (vowelled) -> Latin, in the same style as the HFZ flashcards ("ch" for chet and chaf,
// "ts" for tsadi, no capitals, no accents). The same function is pasted into index.html
// (the block marked TRANSLIT) so a word the table does not know still works.
//
// Rules worth knowing:
//  * vav with a vowel of its own is the consonant "v" (וְ -> ve, וַ -> va); vav with holam (וֹ) is
//    "o"; vav with only a dagesh (וּ) is "u".
//  * yod with its own vowel is "y"; a bare yod after patach/qamats is "y" (בַּיִת -> bayit); after
//    tsere it is "ei" (אֵין -> ein); after hiriq or segol it is silent (הִיא -> hi).
//  * aleph and ayin are silent, a final heh is silent, and a final chet/ayin with patach is the
//    furtive patach (רוּחַ -> ruach: the vowel is heard BEFORE the consonant).
//  * shva is silent, except a word-initial one on vav ("ve") or on a prefix letter ל ב כ מ ("e").
//    Real exceptions (בְּגָדִים is "bgadim") go in the overrides table, see tools/translit-overrides.json.

const CONS = {
  'א': '', 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y',
  'כ': 'ch', 'ך': 'ch', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'f', 'ף': 'f',
  'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
}
const HOLAM = 'ֹ', TSERE = 'ֵ', PATACH = 'ַ', QAMATS = 'ָ', HIRIQ = 'ִ', SEGOL = 'ֶ'
const VOW = {
  'ֱ': 'e', 'ֲ': 'a', 'ֳ': 'o', [HIRIQ]: 'i', [TSERE]: 'e', [SEGOL]: 'e',
  [PATACH]: 'a', [QAMATS]: 'a', [HOLAM]: 'o', 'ֺ': 'o', 'ֻ': 'u', 'ׇ': 'o',
}
const SHVA = 'ְ', DAGESH = 'ּ', SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ'
const isLetter = (c) => c >= 'א' && c <= 'ת'

export function translit(word, overrides = {}) {
  const w = word.replace(/[,.!?;:"“”()\[\]{}…–—‎‏]/g, '')
  if (overrides[w]) return overrides[w]
  const L = []
  for (const c of [...w]) {
    if (isLetter(c)) { L.push({ c, vc: '', shva: false, dagesh: false, shin: null, geresh: false }); continue }
    const cur = L[L.length - 1]
    if (!cur) continue
    if (c === "'" || c === '׳') cur.geresh = true
    else if (c === SHVA) cur.shva = true
    else if (c === DAGESH) cur.dagesh = true
    else if (c === SHIN_DOT) cur.shin = 'sh'
    else if (c === SIN_DOT) cur.shin = 's'
    else if (VOW[c] && !cur.vc) cur.vc = c
  }
  let out = ''
  for (let i = 0; i < L.length; i++) {
    const x = L[i], prev = L[i - 1]
    const first = i === 0, last = i === L.length - 1
    const vs = x.vc ? VOW[x.vc] : ''

    if (x.c === 'ו') {
      if (x.vc === HOLAM) { out += 'o'; continue }                     // holam male
      if (x.dagesh && !x.vc && !x.shva) { out += 'u'; continue }       // shuruk
      if (x.shva) { out += first ? 've' : 'v'; continue }
      if (!x.vc) { if (prev && prev.vc === HOLAM) continue; out += 'v'; continue }
      out += 'v' + vs; continue
    }
    if (x.c === 'י') {
      if (x.vc) { out += 'y' + vs; continue }
      if (x.shva) { out += first ? 'ye' : 'y'; continue }              // יְלָדִים -> yeladim
      if (first) { out += 'y'; continue }
      if (!prev || prev.shva || !prev.vc) { out += 'y'; continue }
      if (prev.vc === PATACH || prev.vc === QAMATS) { out += 'y'; continue }   // ay / ai
      if (prev.vc === TSERE) { out += 'i'; continue }                          // ei
      continue                                                                  // after hiriq / segol / holam: silent
    }
    if (x.c === 'ה' && last && !x.vc) continue                         // final heh is silent
    let s = CONS[x.c]
    if (x.c === 'ש') s = x.shin || 'sh'
    if (x.dagesh) { if (x.c === 'ב') s = 'b'; else if (x.c === 'פ') s = 'p'; else if (x.c === 'כ') s = 'k' }
    if (x.geresh) { if (x.c === 'ג') s = 'j'; else if (x.c === 'ז') s = 'zh'; else if (x.c === 'צ' || x.c === 'ץ') s = 'ch' }
    if (last && x.vc === PATACH && (x.c === 'ח' || x.c === 'ע' || x.c === 'ה')) {                              // furtive patach
      out += (s === '' && out.slice(-1) === 'a' ? "'" : '') + 'a' + s
      continue
    }
    let v = vs
    if (x.shva) {
      // word-initial shva is voiced on a prefix letter, on yod, before a guttural, or before the same letter
      const nx = L[i + 1]
      v = (first && ('לבכמי'.includes(x.c) || (nx && ('אהחע'.includes(nx.c) || nx.c === x.c)))) ? 'e' : ''
    }
    // a silent aleph/ayin between two identical vowels is marked: yoda'at, ba'a, she'elot
    if (s === '' && v && out.slice(-1) === v[0]) out += "'" + v
    else out += s + v
  }
  return out
}
