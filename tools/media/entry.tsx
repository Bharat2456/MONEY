import { createRoot } from 'react-dom/client';
import { usePathname } from './shims/next-navigation';
import { SiteFooter, SiteHeader } from '@/components/SiteShell';
import { DashboardShell } from '@/components/DashboardShell';
import Home from '@/app/(site)/page';
import Features from '@/app/(site)/features/page';
import About from '@/app/(site)/about/page';
import Pricing from '@/app/(site)/pricing/page';
import Faq from '@/app/(site)/faq/page';
import Contact from '@/app/(site)/contact/page';
import Docs from '@/app/(site)/docs/page';
import Login from '@/app/(auth)/login/page';
import Register from '@/app/(auth)/register/page';
import Forgot from '@/app/(auth)/forgot-password/page';
import Overview from '@/app/dashboard/page';
import Projects from '@/app/dashboard/projects/page';
import ProjectDetail from '@/app/dashboard/projects/[id]/page';
import Keys from '@/app/dashboard/keys/page';
import Orders from '@/app/dashboard/orders/page';
import Transactions from '@/app/dashboard/transactions/page';
import Refunds from '@/app/dashboard/refunds/page';
import Webhooks from '@/app/dashboard/webhooks/page';
import Logs from '@/app/dashboard/logs/page';
import Settings from '@/app/dashboard/settings/page';
import Checkout from '@/app/checkout/[orderId]/page';

const site: Record<string, () => JSX.Element> = { '/': Home, '/features': Features, '/about': About, '/pricing': Pricing, '/faq': Faq, '/contact': Contact, '/docs': Docs };
const bare: Record<string, () => JSX.Element> = { '/login': Login, '/register': Register, '/forgot-password': Forgot };
const dash: Record<string, () => JSX.Element> = { '/dashboard': Overview, '/dashboard/projects': Projects, '/dashboard/keys': Keys, '/dashboard/orders': Orders, '/dashboard/transactions': Transactions, '/dashboard/refunds': Refunds, '/dashboard/webhooks': Webhooks, '/dashboard/logs': Logs, '/dashboard/settings': Settings };

function App() {
  const p = usePathname().replace(/\/$/, '') || '/';
  if (site[p]) { const P = site[p]; return <><SiteHeader /><main id="main"><P /></main><SiteFooter /></>; }
  if (bare[p]) { const P = bare[p]; return <P />; }
  if (p.startsWith('/checkout/')) return <Checkout />;
  if (p.startsWith('/dashboard/projects/')) return <DashboardShell><ProjectDetail /></DashboardShell>;
  if (dash[p]) { const P = dash[p]; return <DashboardShell><P /></DashboardShell>; }
  return <p style={{ padding: 40 }}>Preview route not found: {p}</p>;
}

createRoot(document.getElementById('root')!).render(<App />);
