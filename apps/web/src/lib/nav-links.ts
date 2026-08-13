import { Dumbbell, LayoutDashboard, LineChart, Timer } from 'lucide-react';

export const primaryNavLinks = [
  { href: '/', labelKey: 'home', icon: LayoutDashboard },
  { href: '/plans', labelKey: 'workouts', icon: Dumbbell },
  { href: '/tracker', labelKey: 'tracking', icon: Timer },
  { href: '/progress', labelKey: 'progress', icon: LineChart },
] as const;

export function isNavLinkActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
