'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, LogOut, Settings, User, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveSession, useActiveSessionStore } from '@/lib/active-session-store';
import { useLocale } from '@/lib/i18n/context';
import { sessionQueryKey, useSession } from '@/lib/use-session';
import { apiClient } from '@/shared/api';
import { isNavLinkActive, navLinkHref, primaryNavLinks } from '@/utils';

const secondaryNavLinks = [
  { href: '/exercises', labelKey: 'exercises', icon: ClipboardList },
  { href: '/users', labelKey: 'users', icon: Users },
  { href: '/settings', labelKey: 'settings', icon: Settings },
] as const;

function closeMenu(event: { currentTarget: HTMLElement }) {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

export function Nav() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { dict } = useLocale();
  const activeSession = useActiveSession();

  async function handleLogout(event: { currentTarget: HTMLElement }) {
    closeMenu(event);
    useActiveSessionStore.getState().end();
    await apiClient.auth.logout();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  }

  return (
    <nav className="border-border bg-background flex items-center justify-between gap-4 border-b p-4">
      <Link href="/" className="shrink-0 text-lg font-bold tracking-tight uppercase">
        Forge
      </Link>

      <div className="hidden items-center gap-1 md:flex">
        {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          return (
            <Link
              key={href}
              href={navLinkHref(href, activeSession?.sessionId ?? null)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {dict.nav[labelKey]}
            </Link>
          );
        })}
      </div>

      {/* ponytail: native <details> has no outside-click close — add a click-away handler if that bugs users */}
      <details className="relative shrink-0">
        <summary className="border-border bg-muted text-foreground flex h-9 w-9 list-none items-center justify-center rounded-full border [&::-webkit-details-marker]:hidden">
          {isPending ? null : session ? (
            <span className="font-data text-sm uppercase">
              {(session.user.name || session.user.email)[0]}
            </span>
          ) : (
            <User className="h-4 w-4" aria-hidden="true" />
          )}
        </summary>
        <div className="glass-panel border-border absolute top-full right-0 z-50 mt-2 w-56 rounded-lg border p-2">
          <div className="flex flex-col gap-1">
            {secondaryNavLinks.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isNavLinkActive(pathname, href)
                    ? 'text-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {dict.nav[labelKey]}
              </Link>
            ))}
          </div>
          <div className="border-border my-2 border-t" />
          {isPending ? null : session ? (
            <div className="flex flex-col gap-1">
              <span
                className="text-muted-foreground truncate px-3 py-1 text-xs"
                title={session.user.email}
              >
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-destructive hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {dict.common.logOut}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeMenu}
              className="text-primary flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:underline"
            >
              {dict.common.logIn}
            </Link>
          )}
        </div>
      </details>
    </nav>
  );
}
