# Same Roots, New Skin

Manhattan's Chinatown, seen through the lens of Hong Kong & China. A scroll-driven,
multimodal feature article built for NYU *Writing for Exploration* (Fall 2026).

Plain HTML, CSS and JavaScript. No build step. Leaflet is vendored for the map.
Two pages: `index.html` (the article) and `sources.html` (APA sources, linked from every superscript).

The "twelve prints on a line" carousel that opens the page is a vanilla-JS port of the
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

Live site: https://jacobnazar26-del.github.io/same-roots-new-skin/

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on every push to
`claude/new-session-l28vjv`, the default branch (or from the Actions tab via "Run workflow"). The
`github-pages` environment only accepts deploys from the repository's default branch, so keep
the branch you push to set as the default, or add the other branch under Settings →
Environments → github-pages → Deployment branches.

One-time setup, already done for this repository: public visibility and **Settings → Pages →
Source: GitHub Actions**.

## Publish as a claude.ai artifact

```bash
npm run artifact     # writes dist/same-roots-new-skin.html (main page, everything inlined) and dist/sources.html
```
