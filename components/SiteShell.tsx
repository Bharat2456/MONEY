import Link from 'next/link';
import { Logo } from './Logo';

const NAV = [['Features', '/features'], ['Docs', '/docs'], ['Pricing', '/pricing'], ['FAQ', '/faq'], ['About', '/about']] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-moss-800/80 bg-sangria-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-caramel-200 md:flex">
          {NAV.map(([l, h]) => <Link key={h} href={h} className="hover:text-cream">{l}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Get started free</Link>
        </div>
      </div>
      <nav aria-label="Primary mobile" className="flex gap-5 overflow-x-auto border-t border-moss-800/60 px-5 py-2 text-sm text-caramel-200 md:hidden">
        {NAV.map(([l, h]) => <Link key={h} href={h} className="whitespace-nowrap">{l}</Link>)}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const legal = [['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Acceptable use', '/legal/acceptable-use'], ['Simulation disclaimer', '/legal/disclaimer'], ['Data retention', '/legal/data-retention'], ['Security disclosure', '/legal/security-disclosure']];
  return (
    <footer className="border-t border-moss-800 bg-sangria-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="display mt-4 text-2xl text-caramel-300">Your money. Your move.</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-caramel-200/70">Modern Online Network Empowering You. Free payment infrastructure for every developer.</p>
        </div>
        <div>
          <p className="mb-3 text-sm text-moss-500">Product</p>
          <ul className="space-y-2 text-sm text-caramel-200">{[['Documentation', '/docs'], ['Features', '/features'], ['Pricing', '/pricing'], ['FAQ', '/faq'], ['Contact', '/contact']].map(([l, h]) => <li key={h}><Link href={h} className="hover:text-cream">{l}</Link></li>)}</ul>
        </div>
        <div>
          <p className="mb-3 text-sm text-moss-500">Legal</p>
          <ul className="space-y-2 text-sm text-caramel-200">{legal.map(([l, h]) => <li key={h}><Link href={h} className="hover:text-cream">{l}</Link></li>)}</ul>
        </div>
      </div>
      <div className="border-t border-moss-800 px-5 py-5 text-center text-xs leading-relaxed text-moss-500">
        MONEY Phase 1 is a developer sandbox that simulates payments. It is not a bank, payment aggregator or UPI app, and is not approved or certified by the RBI or NPCI. No real money moves.
      </div>
    </footer>
  );
}
