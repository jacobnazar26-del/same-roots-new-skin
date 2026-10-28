// Bundle index.html + CSS + JS into one self-contained HTML body for publishing
// as a claude.ai artifact (no <html>/<head>/<body> wrapper; styles + scripts inlined).
// Usage: node scripts/build-artifact.mjs <out.html>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const out = process.argv[2] || join(ROOT, 'dist', 'same-roots-new-skin.html');
const outSources = join(dirname(out), 'sources.html');
const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const css = [await readFile(join(ROOT, 'css', 'leaflet.css'), 'utf8'), await readFile(join(ROOT, 'css', 'style.css'), 'utf8')].join('\n');
const js = [await readFile(join(ROOT, 'js', 'leaflet.js'), 'utf8'), await readFile(join(ROOT, 'js', 'polaroid-line.js'), 'utf8'), await readFile(join(ROOT, 'js', 'main.js'), 'utf8')].join('\n;\n');

const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[^>]*src="js\/[^"]+"[^>]*><\/script>\s*/g, '')
  .replace(/href="index\.html#/g, 'href="#');
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
const page = `<title>Same Roots, New Skin</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${css.replace(/<\/style/gi, '<\\/style')}
</style>
${body}
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, page);

// Sources tab: a standalone page served next to the main one.
const srcHtml = await readFile(join(ROOT, 'sources.html'), 'utf8');
const srcBody = srcHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[^>]*src="js\/[^"]+"[^>]*><\/script>\s*/g, '')
  .replace(/href="index\.html#/g, 'href="./#').replace(/href="index\.html"/g, 'href="./"');
const mainJs = await readFile(join(ROOT, 'js', 'main.js'), 'utf8');
const sourcesPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Sources · Same Roots, New Skin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${(await readFile(join(ROOT, 'css', 'style.css'), 'utf8')).replace(/<\/style/gi, '<\\/style')}
</style>
</head>
<body class="page-sources">
${srcBody}
<script>
${mainJs.replace(/<\/script/gi, '<\\/script')}
</script>
</body>
</html>
`;
await writeFile(outSources, sourcesPage);
console.log(`Wrote ${outSources} (${(sourcesPage.length / 1024).toFixed(0)} KB)`);
console.log(`Wrote ${out} (${(page.length / 1024).toFixed(0)} KB)`);
