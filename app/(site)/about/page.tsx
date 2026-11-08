import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About' };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="display text-5xl text-cream md:text-6xl">About MONEY</h1>
      <p className="mt-2 text-caramel-300">Modern Online Network Empowering You · Your money. Your move.</p>
      <div className="mt-10 space-y-6 leading-relaxed text-caramel-200/90">
        <p>MONEY exists because a payment screen is often the hardest thing to demo. Commercial gateways expect a registered business, documents and a bank relationship — none of which a student, hackathon team or first prototype has yet.</p>
        <p>Phase 1 is deliberately narrow: free payment <em>testing</em> infrastructure. You get API keys, orders, a hosted checkout, a payment simulator, signed webhooks and refunds, all clearly marked as simulated.</p>
        <h2 className="display pt-4 text-3xl text-caramel-300">The roadmap, honestly</h2>
        <p><strong className="font-medium text-cream">Phase 1 (this product):</strong> developer payment gateway sandbox. <strong className="font-medium text-cream">Phase 2:</strong> MONEY Pay, a consumer UPI app, begun in a controlled test environment and pursued later through proper banking and regulatory partnerships. <strong className="font-medium text-cream">Phase 3:</strong> the RBI authorisations, NPCI onboarding, bank partnerships and audits that real financial services require.</p>
        <p>None of Phase 2 or 3 exists yet. MONEY today is not a bank, a payment aggregator or a UPI app, and is not approved or certified by the RBI or NPCI.</p>
      </div>
      <Link href="/contact" className="btn btn-ghost mt-10">Get in touch</Link>
    </div>
  );
}
