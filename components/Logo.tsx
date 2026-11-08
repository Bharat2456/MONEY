import Link from 'next/link';

/** Original mark: a rounded square holding an open arc ("a coin in motion") — no payment-company marks used. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#B28558" />
      <path d="M22 11.5A7.5 7.5 0 1 0 22 20.5" fill="none" stroke="#2C0E11" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="21.5" cy="16" r="2.2" fill="#2C0E11" />
    </svg>
  );
}

export function Logo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="MONEY home">
      <LogoMark />
      {!compact && <span className="display text-2xl font-medium leading-none text-cream">Money</span>}
    </Link>
  );
}
