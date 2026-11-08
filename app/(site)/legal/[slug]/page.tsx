import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LAUNCH_NOTICE, LEGAL_DOCS, getLegal } from '@/lib/content/legal';

export function generateStaticParams() { return LEGAL_DOCS.map((d) => ({ slug: d.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getLegal((await params).slug);
  return { title: d?.title ?? 'Legal' };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = getLegal((await params).slug);
  if (!doc) notFound();
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <div role="note" className="mb-8 rounded-xl border border-caramel-500/50 bg-caramel-500/10 p-4 text-sm leading-relaxed text-caramel-200">{LAUNCH_NOTICE}</div>
      <h1 className="display text-5xl text-cream md:text-6xl">{doc.title}</h1>
      <p className="mt-3 text-caramel-200/70">{doc.summary}</p>
      <div className="mt-10 space-y-9">
        {doc.sections.map((s) => (
          <section key={s.h}><h2 className="display text-3xl text-caramel-300">{s.h}</h2>{s.p.map((p, i) => <p key={i} className="mt-3 leading-relaxed text-caramel-200/90">{p}</p>)}</section>
        ))}
      </div>
      <nav aria-label="Other policies" className="mt-14 flex flex-wrap gap-3 border-t border-moss-700 pt-6 text-sm">{LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => <a key={d.slug} href={`/legal/${d.slug}`} className="text-caramel-300 underline underline-offset-4">{d.title}</a>)}</nav>
    </article>
  );
}
