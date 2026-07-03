# Colin Dayer — portfolio site

Static site (HTML/CSS/JS, no build step). Modernist / cyberpunk / jazz.

## Structure
```
index.html          — the whole page
css/style.css        — styling (edit colours in :root at top)
js/main.js           — audio player + nav
audio/               — web-compressed mp3s
assets/              — video (mp4), CV pdf
papers/              — drop research PDFs here (see writing template in index.html)
installations/       — images/media for installation work
```

## Preview locally
```
cd colindayer-site
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages (free)
1. Create a repo, e.g. `colindayer` (or `colindayer.github.io` for a root URL).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "portfolio site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: main / root**. Live in ~1 min at
   `https://<you>.github.io/<repo>/`.
4. Custom domain later: **Settings → Pages → Custom domain**.

## Adding content later
- **A research paper:** copy the PDF into `papers/`, then in `index.html` find the
  `<!-- Template for a paper entry -->` comment and uncomment/fill one `<article class="paper">`.
- **A new track:** compress to mp3, drop in `audio/`, copy a `<article class="track">` block
  in the Listen section and set `data-src`.
- **A new installation:** add media to `installations/` and a card in the Work section.

## Colours (css/style.css `:root`)
- `--accent` electric lime (cyberpunk edge)
- `--accent-2` warm signal red (jazz heat)
- swap these two lines to re-tone the whole site.
