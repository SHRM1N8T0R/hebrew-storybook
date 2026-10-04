// One-off: the first story's data was stored under bare keys ("3:2", "2:1:24"). With ten stories every key needs the
// story id in front ("apartment|3:2"). Safe to re-run: keys that already have a prefix are left alone.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
for (const f of ['nikud-cache.json', 'nikud-overrides.json']) {
  const file = path.join(here, f)
  if (!fs.existsSync(file)) continue
  const o = JSON.parse(fs.readFileSync(file, 'utf8'))
  const out = {}
  let moved = 0
  for (const [k, v] of Object.entries(o)) {
    if (k.includes('|')) { out[k] = v; continue }
    out['apartment|' + k] = v; moved++
  }
  fs.writeFileSync(file, JSON.stringify(out, null, 1))
  console.log(f, 'keys re-prefixed:', moved, 'of', Object.keys(o).length)
}
// the gender fixes script writes overrides, so it needs the prefix too
const g = path.join(here, 'fix-gender.mjs')
let t = fs.readFileSync(g, 'utf8')
if (!t.includes("'apartment|'")) {
  t = t.replace("const [p, q, w] = k.split(':')\n  const tok = cache[p + ':' + q].split(/\\s+/)[Number(w)]", "const [p, q, w] = k.split(':')\n  const tok = cache['apartment|' + p + ':' + q].split(/\\s+/)[Number(w)]")
  t = t.replace("ov[k] = tok.replace(core, to)", "ov['apartment|' + k] = tok.replace(core, to)")
  fs.writeFileSync(g, t)
  console.log('fix-gender.mjs now writes apartment|-prefixed keys')
}
