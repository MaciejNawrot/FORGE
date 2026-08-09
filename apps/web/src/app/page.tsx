import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">GYM0</h1>
      <p className="text-muted-foreground">
        Next.js App Router + TanStack Query + a ts-rest typed API client, talking to the NestJS API
        through <code>@acme/api-client</code>.
      </p>
      <div className="flex gap-4">
        <Link href="/users" className="bg-primary text-primary-foreground rounded-md px-3 py-2">
          View users (server-rendered)
        </Link>
        <Link href="/login" className="border-border rounded-md border px-3 py-2">
          Log in / Register
        </Link>
      </div>
    </main>
  );
}
