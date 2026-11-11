# 🃏 PointPals — planning poker that's actually fun

Free, static planning poker for agile teams. No backend: rooms are peer-to-peer
(WebRTC via [PeerJS](https://peerjs.com)'s free signalling broker), so it hosts
for free on GitHub Pages.

**Fun stuff:** animated card flips, confetti on consensus, "chaos" detector,
emoji throwing at teammates, sound effects, 4 decks (Fibonacci, T-shirt, Animals, Pizza), round timer.

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000
```
Add `?local=1` to the URL to test with two tabs of the same browser (no network needed).

## Deploy on GitHub Pages (free)
1. Create a repo on GitHub and push this folder to `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**. The included workflow deploys on every push.
3. Your site: `https://<user>.github.io/<repo>/`

## Ads
Ads are removed from `main`. The AdSense version (ad slots, consent banner, `ads.js`, `ads.txt`)
is saved under the git tag `with-ads`: `git checkout with-ads`, or cherry-pick from it when you
host on your own domain (AdSense needs one, `*.github.io` is generally rejected).

## Hosting elsewhere
It's plain static files, so any static host works: Cloudflare Pages (recommended), Netlify, Vercel.
Connect the repo, leave the build command empty, set the output directory to `/`.

## Limits to know
- The host's tab is the room: if the host closes it, the room ends.
- Some corporate networks block WebRTC; a TURN server would fix that.
- GitHub Pages terms discourage running a *primary business* on it; fine for a hobby app,
  move to Cloudflare Pages / Netlify (also free) if it takes off.
