'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { sessionQueryKey, useSession } from '@/lib/use-session';

const navLinks = [
  { href: '/tracker', label: 'Tracker' },
  { href: '/plans', label: 'Plans' },
  { href: '/exercises', label: 'Exercises' },
  { href: '/users', label: 'Users' },
] as const;

export function Nav() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  async function handleLogout() {
    await apiClient.auth.logout();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  }

  return (
    <nav className="border-border flex items-center justify-between border-b p-4">
      <div className="flex gap-4">
        <Link href="/" className="font-medium">
          GYM0
        </Link>
        {navLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="text-sm">
        {isPending ? null : session ? (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{session.user.email}</span>
            <button type="button" onClick={handleLogout} className="underline">
              Log out
            </button>
          </div>
        ) : (
          <Link href="/login" className="underline">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
