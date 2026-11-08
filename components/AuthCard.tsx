import Link from 'next/link';
import { Logo } from './Logo';

export function AuthCard({ title, sub, children, footer }: { title: string; sub?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.05fr]">
      <aside className="hidden flex-col justify-between bg-sangria-950 p-12 md:flex">
        <Logo />
        <div>
          <p className="display text-5xl leading-tight text-cream">Your money.<br />Your move.</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-caramel-200/70">A free sandbox for building and testing payment flows. Every transaction here is simulated.</p>
        </div>
        <Link href="/docs" className="text-sm text-caramel-300 underline underline-offset-4">Read the documentation</Link>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden"><Logo /></div>
          <h1 className="display text-4xl text-cream">{title}</h1>
          {sub && <p className="mt-2 text-sm text-caramel-200/75">{sub}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-caramel-200/75">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
