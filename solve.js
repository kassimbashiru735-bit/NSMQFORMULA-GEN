// functions/api/solve.js
//
// This is a Cloudflare Pages Function. Cloudflare auto-detects any file
// under /functions and serves it as an endpoint at the matching path —
// this file becomes:   https://<your-project>.pages.dev/api/solve
//
// It's what NSMQ FormulaGen calls instead of talking to Gemini directly,
// so your API keys live ONLY here (as Cloudflare environment variables)
// and never touch anyone's browser. Everyone who opens the app shares
// these same keys automatically — nobody enters or saves anything.
//
// ---------------------------------------------------------------------
// SETUP (all in the Cloudflare dashboard, no command line needed)
// ---------------------------------------------------------------------
// 1. Push this whole project (this file, at functions/api/solve.js, plus
//    your index.html at the repo root) to a GitHub repo.
//
// 2. Go to dash.cloudflare.com → Workers & Pages → Create → Pages →
//    Connect to Git → pick that repo.
//      - Framework preset: None
//      - Build command: (leave blank)
//      - Build output directory: / (just a single slash — the repo root)
//    Click Save and Deploy. Cloudflare will detect the functions/ folder
//    automatically — no extra config needed.
//
// 3. Once deployed: your project → Settings → Environment variables →
//    add variables for Production (and Preview, if you want previews to
//    work too):
//      GEMINI_KEY_1   = your first Gemini API key   (required)
//      GEMINI_KEY_2   = a second key                (optional)
//      GEMINI_KEY_3   = a third key                 (optional)
//      GEMINI_KEY_4   = a fourth key                (optional)
//      GEMINI_KEY_5   = a fifth key                 (optional)
//      GEMINI_MODEL   = gemini-3.6-flash             (optional — default)
//    Get keys at aistudio.google.com/apikey. A real Gemini key always
//    starts with "AIzaSy" — if yours doesn't, you copied the wrong thing.
//
// 4. Redeploy (Deployments tab → ⋯ on the latest deployment → Retry
//    deployment) so the new environment variables take effect.
//
// 5. Your endpoint is: https://<your-project-name>.pages.dev/api/solve
//    Paste that into the DEFAULT_BACKEND_URL constant near the top of
//    the FormulaGen HTML file's <script> section, save, and distribute
//    that HTML file (via GitHub Pages or anywhere else) — nobody else
//    needs to touch anything.
//
// 6. To change keys later: update the environment variables here and
//    redeploy this project. You never need to touch the HTML file again.
// ---------------------------------------------------------------------

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders() });
  }

  const parts = payload && payload.parts;
  const json = payload && payload.json;
  if (!parts) {
    return new Response(JSON.stringify({ error: 'Missing "parts" in request body' }), { status: 400, headers: corsHeaders() });
  }

  const model = env.GEMINI_MODEL || 'gemini-3.6-flash';
  const keys = [
    env.GEMINI_KEY_1,
    env.GEMINI_KEY_2,
    env.GEMINI_KEY_3,
    env.GEMINI_KEY_4,
    env.GEMINI_KEY_5
  ].filter(function (k) { return k && k.trim(); });

  if (keys.length === 0) {
    return new Response(JSON.stringify({
      error: 'No Gemini API keys configured. Add GEMINI_KEY_1 (and optionally _2 through _5) in Cloudflare Pages → Settings → Environment variables, then redeploy.'
    }), { status: 500, headers: corsHeaders() });
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent';
  const body = {
    contents: [{ role: 'user', parts: parts }],
    generationConfig: json ? { responseMimeType: 'application/json' } : {}
  };

  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body)
      });
      const data = await r.json();

      if (!r.ok) {
        lastError = (data && data.error && data.error.message) || ('Request failed (' + r.status + ')');
        continue;
      }

      const candidates = data && data.candidates;
      const first = candidates && candidates[0];
      const contentParts = first && first.content && first.content.parts;
      const text = (contentParts ? contentParts.map(function (p) { return p.text || ''; }).join('') : '') || '';

      if (!text) {
        lastError = 'Empty response from model';
        continue;
      }

      return new Response(JSON.stringify({ text: text }), { status: 200, headers: corsHeaders() });
    } catch (err) {
      lastError = err && err.message ? err.message : 'Unknown error';
    }
  }

  return new Response(JSON.stringify({
    error: 'All ' + keys.length + ' configured key(s) failed. Last error: ' + lastError
  }), { status: 502, headers: corsHeaders() });
}
