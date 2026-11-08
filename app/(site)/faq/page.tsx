import type { Metadata } from 'next';
import { FAQ } from '@/lib/content/faq';

export const metadata: Metadata = { title: 'FAQ' };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="display text-5xl text-cream md:text-6xl">Frequently asked questions</h1>
      <div className="mt-10 divide-y divide-moss-700 border-y border-moss-700">
        {FAQ.map((f) => (
          <details key={f.q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-cream"><span>{f.q}</span><span className="text-caramel-500 transition-transform group-open:rotate-45" aria-hidden>+</span></summary><p className="mt-3 leading-relaxed text-caramel-200/80">{f.a}</p></details>
        ))}
      </div>
    </div>
  );
}
