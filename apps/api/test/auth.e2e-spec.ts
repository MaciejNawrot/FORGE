import type { Server } from 'node:http';
import { db, user } from '@acme/db';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  let server: Server;

  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    // Bind a real port rather than just `init()` + `ready()`: supertest's cookie
    // jar (used by `request.agent()` below) keys cookies by host:port, and a
    // non-listening server gets a fresh ephemeral port per request, silently
    // breaking cookie continuity across requests in the same test.
    await app.listen(0, '127.0.0.1');
    server = app.getHttpAdapter().getInstance().server;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.email, email));
    await app.close();
  });

  it('registers a new account and sets a session cookie', async () => {
    const response = await request(server)
      .post('/auth/register')
      .send({ email, password, name: 'E2E Auth' })
      .expect(201);

    expect(response.body.user.email).toBe(email);
    expect(String(response.headers['set-cookie'])).toContain('better-auth.session_token=');
  });

  it('rejects registering the same email twice with 409', async () => {
    await request(server).post('/auth/register').send({ email, password, name: 'Dup' }).expect(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await request(server).post('/auth/login').send({ email, password: 'wrong' }).expect(401);

    const response = await request(server)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(response.body.user.email).toBe(email);
    expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('returns 401 for /auth/session without a cookie', async () => {
    await request(server).get('/auth/session').expect(401);
  });

  it('returns the session for an authenticated agent, then 401 after logout', async () => {
    const agent = request.agent(server);

    await agent.post('/auth/login').send({ email, password }).expect(200);

    const sessionResponse = await agent.get('/auth/session').expect(200);
    expect(sessionResponse.body.user.email).toBe(email);

    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/session').expect(401);
  });
});
