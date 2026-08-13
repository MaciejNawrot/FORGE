import type { Metadata } from 'next';
import { Anton, Inter, JetBrains_Mono } from 'next/font/google';
import { BottomNav } from '@/components/bottom-nav';
import { Nav } from '@/components/nav';
import { LocaleProvider } from '@/lib/i18n/context';
import { getServerLocale } from '@/lib/i18n/server';
import { noFlashThemeScript } from '@/lib/theme';
import './globals.css';
import { Providers } from './providers';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-data' });

export const metadata: Metadata = {
  title: 'Forge',
  description: 'GYM0 monorepo starter',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${anton.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before first paint, avoiding a flash of the default theme. */}
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body>
        <LocaleProvider initialLocale={locale}>
          <Providers>
            <Nav />
            {children}
            <BottomNav />
          </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
