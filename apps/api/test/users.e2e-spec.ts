import type { Server } from 'node:http';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Users (e2e)', () => {
  let app: NestFastifyApplication;
  let server: Server;

  const email = `e2e-${Date.now()}@example.com`;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpAdapter().getInstance().server;
  });

  afterAll(async () => {
    if (createdUserId) {
      await request(server).delete(`/users/${createdUserId}`);
    }
    await app.close();
  });

  it('creates a user', async () => {
    const response = await request(server)
      .post('/users')
      .send({ email, name: 'E2E Test User' })
      .expect(201);

    expect(response.body).toMatchObject({ email, name: 'E2E Test User' });
    expect(response.body.id).toEqual(expect.any(String));
    createdUserId = response.body.id;
  });

  it('rejects a duplicate email with 409', async () => {
    await request(server).post('/users').send({ email, name: 'Duplicate' }).expect(409);
  });

  it('gets the created user by id', async () => {
    const response = await request(server).get(`/users/${createdUserId}`).expect(200);
    expect(response.body.email).toBe(email);
  });

  it('returns 404 for a missing user', async () => {
    await request(server).get('/users/00000000-0000-0000-0000-000000000000').expect(404);
  });

  it('lists users including the created one', async () => {
    const response = await request(server)
      .get('/users')
      .query({ page: 1, pageSize: 100 })
      .expect(200);
    expect(response.body.items.some((user: { id: string }) => user.id === createdUserId)).toBe(
      true,
    );
  });

  it("updates the user's name", async () => {
    const response = await request(server)
      .patch(`/users/${createdUserId}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    expect(response.body.name).toBe('Updated Name');
  });

  it('deletes the user', async () => {
    await request(server).delete(`/users/${createdUserId}`).expect(204);
    await request(server).get(`/users/${createdUserId}`).expect(404);
    createdUserId = '';
  });
});
