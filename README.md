# Same Roots, New Skin

Manhattan's Chinatown, seen through the lens of Hong Kong & China. A scroll-driven,
multimodal feature article built for NYU *Writing for Exploration* (Fall 2026).

Plain HTML, CSS and JavaScript. No build step. Leaflet is vendored for the map.

The "twelve prints on a line" carousel in Places & Things is a vanilla-JS port of the
21st.dev **Polaroid Line Carousel** (`js/polaroid-line.js`). The original React/TSX
component is kept, unmodified apart from a header note, at
`components/ui/polaroid-line-carousel.tsx` for a future React/shadcn build; the site does
not load it.

## Run it locally

```bash
npm run serve        # then open http://localhost:8080
```

## Add the photos

Drop the files into these folders with these exact names (JPEG):

| Folder | Files |
|---|---|
| `public/photos/chinatown/` | `ct-1-pell-st.jpg` `ct-2-temple.jpg` `ct-3-hop-kee-stairs.jpg` `ct-4-noodletown.jpg` `ct-5-graffiti-fruit.jpg` `ct-6-bayard-gift-shop.jpg` |
| `public/photos/lens/` | `lens-1-lanterns.jpg` `lens-2-stairs.jpg` `lens-3-old-new.jpg` `lens-4-cured-meat.jpg` `lens-5-fruit.jpg` `lens-6-signs.jpg` |

Then compress them (WebP, max 1600 px wide, under ~300 KB, plus a lighter JPEG fallback):

```bash
npm install
npm run photos
```

Originals are backed up to `photos-originals/` (git-ignored). Until a file exists, the site
shows a clearly labelled "Photo coming: …" placeholder in its place.

### Tuning the hotspot positions

The gold hotspot dots are positioned as percentages of each Chinatown photo in `index.html`
(`style="--x:16%;--y:34%"` on each `.hotspot` button). Once the real photos are in, nudge
those numbers so each dot sits on the detail it names.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on every push to
`main` (or from the Actions tab via "Run workflow").

One-time setup in the repository: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. GitHub Pages for a *private* repository needs a paid GitHub plan; on a
free plan, make the repository public first (Settings → General → Danger Zone → Change
visibility). The site then lives at `https://<user>.github.io/<repo>/`.

## Publish as a claude.ai artifact

```bash
npm run artifact     # writes dist/same-roots-new-skin.html (single file, everything inlined)
```
