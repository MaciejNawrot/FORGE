import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
    env: {
      // Nest's DI needs a real value-import of UsersRepository for decorator
      // metadata, which transitively loads @acme/db and its env validation —
      // even though these unit tests mock the repository and never connect.
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/acme_test',
    },
  },
});
