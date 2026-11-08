import { SiteFooter, SiteHeader } from '@/components/SiteShell';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (<><SiteHeader /><main id="main">{children}</main><SiteFooter /></>);
}
