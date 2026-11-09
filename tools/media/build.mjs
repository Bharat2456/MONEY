// Builds the preview bundle + stylesheet from the project's REAL components.
// Uses the offline toolchain of the build sandbox (esbuild + Tailwind 4 engine). Output: tools/media/dist
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import { compile } from '/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const dist = join(here, 'dist');
mkdirSync(dist, { recursive: true });
const sh = (f) => join(here, 'shims', f);

const shimPlugin = {
  name: 'shims',
  setup(b) {
    const map = { 'next/link': sh('next-link.tsx'), 'next/navigation': sh('next-navigation.tsx'), 'firebase/auth': sh('firebase-auth.ts'),
      '@/lib/client/firebase': sh('firebase.ts'), '@/components/AuthProvider': sh('auth-provider.tsx') };
    b.onResolve({ filter: /.*/ }, (a) => {
      if (map[a.path]) return { path: map[a.path] };
      if (a.path === './firebase' && /lib[\\/]client/.test(a.importer)) return { path: sh('firebase.ts') };
      if (a.path === './AuthProvider' && /components/.test(a.importer)) return { path: sh('auth-provider.tsx') };
    });
  },
};

await build({
  entryPoints: [join(here, 'entry.tsx')], outfile: join(dist, 'bundle.js'), bundle: true, format: 'iife', target: 'es2020',
  jsx: 'automatic', tsconfig: join(root, 'tsconfig.json'), nodePaths: ['/opt/npm-tools/node_modules'], plugins: [shimPlugin],
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning', minify: true,
});

// ── CSS: project's real globals.css + tailwind.config.ts palette, compiled by the Tailwind engine ──
const cfg = readFileSync(join(root, 'tailwind.config.ts'), 'utf8');
const pal = {}; // parse colour scales out of the real config so there is one source of truth
for (const m of cfg.matchAll(/^\s{8}(\w+): \{([^}]+)\}/gm)) for (const k of m[2].matchAll(/'?([\w]+)'?: '(#[0-9A-Fa-f]{6})'/g)) pal[`${m[1]}-${k[1]}`] = k[2];
const flat = {}; for (const [k, v] of Object.entries(pal)) flat[k.replace('-DEFAULT', '')] = v;
flat.cream = '#F1E6D6';
const theme = Object.entries(flat).map(([k, v]) => `  --color-${k}: ${v};`).join('\n');
const globals = readFileSync(join(root, 'app/globals.css'), 'utf8').replace(/@tailwind \w+;/g, '');
const css = `@import "tailwindcss";
@theme {
${theme}
  --font-display: 'Lora', 'Georgia', serif;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'DejaVu Sans Mono', ui-monospace, monospace;
  --shadow-ticket: 0 30px 60px -30px rgba(0,0,0,.6), 0 0 0 1px rgba(178,133,88,.18);
}
@layer base { *, ::before, ::after { border-color: #e5e7eb; } }
${globals}`;

const candidates = new Set();
const walk = (d) => { for (const f of readdirSync(d)) { if (['node_modules', 'dist', '.next', 'tools', 'tests', 'docs'].includes(f)) continue; const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && readFileSync(p, 'utf8').split(/[\s"'`]+/).forEach((t) => t && candidates.add(t.replace(/^[{(]+|[)}.,;]+$/g, ''))); } };
for (const d of ['app', 'components', 'lib']) walk(join(root, d));

const twDir = '/opt/npm-tools/node_modules/tailwindcss';
const compiler = await compile(css, {
  base: twDir,
  loadStylesheet: async (id, base) => {
    const p = id === 'tailwindcss' ? join(twDir, 'index.css') : id.startsWith('tailwindcss/') ? join(twDir, id.slice(12) + '.css') : resolve(base, id);
    return { path: p, base: dirname(p), content: readFileSync(p, 'utf8') };
  },
  loadModule: async () => { throw new Error('no modules'); },
});
writeFileSync(join(dist, 'style.css'), compiler.build([...candidates]));
writeFileSync(join(dist, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MONEY</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
console.log('built', (readFileSync(join(dist, 'bundle.js')).length / 1024).toFixed(0) + ' KB js,', (readFileSync(join(dist, 'style.css')).length / 1024).toFixed(0) + ' KB css, theme colours:', Object.keys(flat).length);
