// Reads every story out of index.html. The file declares `const STORIES = [ first story ]` and then adds the
// others with `STORIES.push({ ... })`, so this pulls out each of those statements (string- and comment-aware
// bracket matching) and evaluates them in order. Shared by all the tools in this folder.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))

function matchClose(src, openIdx, open, close) {
  let depth = 0, q = null, esc = false
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i]
    if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = null; continue }
    if (c === '"' || c === "'" || c === '`') { q = c; continue }
    if (c === '/' && src[i + 1] === '/') { while (src[i] !== '\n' && i < src.length) i++; continue }
    if (c === open) depth++
    else if (c === close) { depth--; if (depth === 0) return i }
  }
  throw new Error('unbalanced ' + open)
}

export function loadStories(file = path.join(here, '..', 'index.html')) {
  const html = fs.readFileSync(file, 'utf8')
  const raw = html.match(/<script id="storiesData"[^>]*>([\s\S]*?)<\/script>/)[1]
  const parts = []
  const s0 = raw.indexOf('const STORIES = [')
  const e0 = matchClose(raw, raw.indexOf('[', s0), '[', ']')
  parts.push(raw.slice(s0, e0 + 1) + ';')
  // the other stories are `const STORY_n = { ... }` followed by `STORIES.push(STORY_n)`, in file order
  const re = /const STORY_\w+ = \{|STORIES\.push\(/g
  let m
  while ((m = re.exec(raw))) {
    const isConst = m[0].startsWith('const')
    const open = raw.indexOf(isConst ? '{' : '(', m.index)
    const close = matchClose(raw, open, isConst ? '{' : '(', isConst ? '}' : ')')
    parts.push(raw.slice(m.index, close + 1) + ';')
    re.lastIndex = close
  }
  return new Function(parts.join('\n') + ';return STORIES')()
}

// Count of paragraphs / words per story, for reports
if (process.argv[1] && process.argv[1].endsWith('stories-loader.mjs')) {
  const S = loadStories()
  let P = 0, W = 0
  for (const s of S) {
    const paras = s.pages.flatMap((p) => p.paragraphs || [])
    const words = paras.reduce((n, p) => n + p.he.split(/\s+/).length, 0)
    P += paras.length; W += words
    console.log(s.id.padEnd(12), String(s.pages.length).padStart(3), 'pages', String(paras.length).padStart(4), 'paragraphs', String(words).padStart(5), 'words', '|', s.titleEn, s.level || '')
  }
  console.log('TOTAL', S.length, 'stories', P, 'paragraphs', W, 'words')
}
