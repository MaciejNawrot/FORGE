'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveSession } from '@/lib/active-session-store';
import { useLocale } from '@/lib/i18n/context';
import { isNavLinkActive, navLinkHref, primaryNavLinks } from '@/lib/nav-links';

export function BottomNav() {
  const pathname = usePathname();
  const { dict } = useLocale();
  const activeSession = useActiveSession();

  return (
    <>
      {/* Mobile tab bar */}
      <nav className="glass-panel fixed bottom-0 z-50 flex w-full items-center justify-around rounded-t-xl px-4 pt-2 pb-4 md:hidden">
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          const label = dict.nav[labelKey];
          const showActiveBadge = href === '/tracker' && activeSession !== null;
          const targetHref = navLinkHref(href, activeSession?.sessionId ?? null);
          return (
            <Link
              key={href}
              href={targetHref}
              className={`flex flex-col items-center justify-center gap-1 rounded-full px-4 py-1 transition-all active:scale-90 ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {showActiveBadge && (
                  <span
                    className="bg-primary absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                )}
              </span>
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
          const showActiveBadge = href === '/tracker' && activeSession !== null;
          const targetHref = navLinkHref(href, activeSession?.sessionId ?? null);
          return (
            <Link
              key={href}
              href={targetHref}
              title={label}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                active
                  ? 'bg-primary text-primary-foreground glow-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {showActiveBadge && (
                  <span
                    className="bg-primary absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
