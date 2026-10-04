# CLAUDE.md — hebrew-storybook (storybook.readhebrewnews.com)

Cloudflare Pages project `hebrew-storybook`, connected to this repo. `index.html` is the whole
app. The vowelling, transliteration and word meanings are generated into it from `tools/`.

## Working together (Danny, Elior, and every Claude session)
Agreed 2026-10-04 when the repos moved to the `hebrew-from-zero` GitHub org.
1. **Pull before you start.** `git pull` first, every session. Never force-push.
2. **A push to `main` goes live** within about a minute. Treat `main` as production.
3. **Visual changes: show Danny a desktop + mobile mockup before pushing.**
4. **Do not edit the generated block in `index.html` by hand** (between `// <<STORY_NIKUD>>` and
   `// <<END STORY_NIKUD>>`). Change the inputs in `tools/` (`nikud-overrides.json`,
   `gender-fixes.json`, `glosses/*.txt`, `vocab-fixes.json`) and run `node tools/apply-data.mjs`.
5. This repo is public and its root is published, so never add secrets here.
