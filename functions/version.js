// GET /version  ->  { v: "<12 hex chars>" }
//
// A fingerprint of the Storybook page that is currently deployed. The page asks for it when it loads and
// again when someone comes back to a tab that has been open for a while; if the two differ, the reader is
// offered a refresh. It needs no build step and no number to bump: it hashes index.html itself.

const json = (obj) =>
  new Response(JSON.stringify(obj), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' },
  })

export async function onRequestGet({ request, env }) {
  try {
    const origin = new URL(request.url).origin
    const res = await env.ASSETS.fetch(new Request(origin + '/index.html', { redirect: 'follow' }))
    if (!res.ok) return json({ v: '' })
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', await res.arrayBuffer()))
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
    return json({ v: hex.slice(0, 12) })
  } catch (e) {
    return json({ v: '' })
  }
}
