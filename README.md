# NSMQ FormulaGen

This repo contains the whole app:

- `index.html` — the app itself (static, goes on GitHub Pages)
- `functions/api/solve.js` — the shared backend that holds your Gemini API
  keys (needs Cloudflare Pages — GitHub Pages can't run server code)

You'll end up with **two deployments of this one repo**: GitHub Pages for
the app people actually open, and Cloudflare Pages purely to run the
`/api/solve` function your API keys live behind.

## 1. Push this repo to GitHub

Create a new GitHub repo and push this whole folder to it (`index.html`,
the `functions/` folder, this README). Make sure the repo is **public**
if you want free GitHub Pages hosting — and remember, a public repo means
anything committed to it (including this README) is visible to anyone,
though your actual API keys never go in this repo at all, only in
Cloudflare's environment variables.

## 2. Host the app on GitHub Pages

In the repo: **Settings → Pages → Build and deployment → Source: Deploy
from a branch → Branch: main, folder: / (root) → Save**.

GitHub gives you a URL like `https://yourname.github.io/your-repo/` —
that's the link you share with everyone.

## 3. Deploy the backend on Cloudflare Pages

GitHub Pages will happily serve `index.html`, but it ignores the
`functions/` folder — it can't execute it. That part needs Cloudflare:

1. Go to **dash.cloudflare.com → Workers & Pages → Create → Pages →
   Connect to Git** and pick the same GitHub repo.
2. Framework preset: **None**. Build command: leave blank. Build output
   directory: **/** (just a slash — the repo root).
3. Click **Save and Deploy**. Cloudflare auto-detects `functions/api/solve.js`
   and serves it at `https://<your-project>.pages.dev/api/solve`.

## 4. Add your Gemini API keys

In that Cloudflare Pages project: **Settings → Environment variables**,
add for Production:

| Name           | Value                     | Required? |
|----------------|---------------------------|-----------|
| `GEMINI_KEY_1` | your first Gemini API key | yes       |
| `GEMINI_KEY_2` | a second key              | optional  |
| `GEMINI_KEY_3` | a third key               | optional  |
| `GEMINI_KEY_4` | a fourth key              | optional  |
| `GEMINI_KEY_5` | a fifth key               | optional  |
| `GEMINI_MODEL` | e.g. `gemini-3.6-flash`   | optional (this is the default) |

Get keys at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
**A real Gemini key always starts with `AIzaSy`** — if what you copied
doesn't start with that, you've copied the wrong thing (a key ID, an
OAuth token, etc.) and it won't work.

Then **redeploy** (Deployments tab → ⋯ → Retry deployment) so the new
variables take effect.

## 5. Point the app at your backend

Take your Cloudflare Pages URL, e.g. `https://formulagen.pages.dev`, add
`/api/solve`, and paste the result into the `DEFAULT_BACKEND_URL` constant
near the top of the `<script>` section in `index.html`:

```js
const DEFAULT_BACKEND_URL = "https://formulagen.pages.dev/api/solve";
```

Commit and push that change — GitHub Pages will redeploy automatically
with the new URL baked in. From then on, nobody who opens the GitHub
Pages link needs to do anything at all — no settings, no keys.

## 6. Changing keys later

Update the environment variables in Cloudflare Pages and redeploy *that*
project only. You never need to touch `index.html` or push to GitHub
again — every person's copy of the app starts using the new keys the
next time they use it.

## Why two services?

GitHub Pages only serves static files — no secrets, no server code. The
backend needs somewhere that actually *runs* code per request so your API
keys stay hidden. Cloudflare Pages Functions is the free option that
plugs into the exact same GitHub repo, so it doesn't add much extra
work — just one more "Connect to Git" click in a different dashboard.
