'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/context';
import { isNavLinkActive, primaryNavLinks } from '@/lib/nav-links';

export function BottomNav() {
  const pathname = usePathname();
  const { dict } = useLocale();

  return (
    <>
      {/* Mobile tab bar */}
      <nav className="glass-panel fixed bottom-0 z-50 flex w-full items-center justify-around rounded-t-xl px-4 pt-2 pb-4 md:hidden">
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 rounded-full px-4 py-1 transition-all active:scale-90 ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="font-data text-[10px] uppercase">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop floating dock */}
      <nav className="glass-panel fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-1 rounded-full p-2 md:flex">
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                active
                  ? 'bg-primary text-primary-foreground glow-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
