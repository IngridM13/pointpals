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

## Make money with Google AdSense
1. **Buy a custom domain** (~$10/yr) and add it in Settings → Pages. AdSense generally
   will not approve `*.github.io` subdomains.
2. Apply at <https://adsense.google.com>, add your domain, wait for approval.
3. Fill in `client` and the two slot ids in `ads.js`, and your id in `ads.txt`.
4. Add your contact email to `privacy.html`.
5. For EU/UK visitors, Google requires a certified consent tool: enable Google's free
   **Privacy & messaging** (Funding Choices) in AdSense. The simple banner in `ads.js` is a stopgap.

Ad placement is deliberately a top banner + sidebar box, never over the cards (accidental clicks violate AdSense policy).

## Limits to know
- The host's tab is the room: if the host closes it, the room ends.
- Some corporate networks block WebRTC; a TURN server would fix that.
- GitHub Pages terms discourage running a *primary business* on it; fine for a hobby app,
  move to Cloudflare Pages / Netlify (also free) if it takes off.
