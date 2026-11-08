import { writeFileSync } from 'node:fs';
import { LAUNCH_NOTICE, LEGAL_DOCS } from '../lib/content/legal';

const out = [`# MONEY — Legal Policies (first drafts)`, '', `> **${LAUNCH_NOTICE}**`, '', 'This file is generated from `lib/content/legal.ts` (`npm run docs:legal`). Edit the TypeScript source, not this file.', ''];
for (const d of LEGAL_DOCS) {
  out.push(`---`, '', `## ${d.title}`, '', `_${d.summary}_`, '');
  for (const s of d.sections) { out.push(`### ${s.h}`, ''); for (const p of s.p) out.push(p, ''); }
}
writeFileSync(new URL('../docs/LEGAL_POLICIES.md', import.meta.url), out.join('\n'));
console.log('wrote docs/LEGAL_POLICIES.md');
