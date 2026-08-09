import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import { users } from './schema/users.js';

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema: { users } });

  console.log('Seeding database...');
  await db
    .insert(users)
    .values([
      { email: 'ada@example.com', name: 'Ada Lovelace' },
      { email: 'grace@example.com', name: 'Grace Hopper' },
    ])
    .onConflictDoNothing();
  console.log('Seed complete.');

  await client.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
