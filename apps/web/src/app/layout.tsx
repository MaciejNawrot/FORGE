import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'GYM0',
  description: 'GYM0 monorepo starter',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
