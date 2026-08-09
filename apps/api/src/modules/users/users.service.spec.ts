import { describe, expect, it, vi } from 'vitest';
import type { UsersRepository } from './users.repository.js';
import { EmailAlreadyExistsError, UsersService } from './users.service.js';

function createRepositoryMock(overrides: Partial<UsersRepository> = {}): UsersRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  } as unknown as UsersRepository;
}

describe('UsersService', () => {
  it('lists users with pagination metadata', async () => {
    const now = new Date();
    const repository = createRepositoryMock({
      list: vi.fn().mockResolvedValue({
        rows: [{ id: '1', email: 'a@b.com', name: 'A', createdAt: now, updatedAt: now }],
        total: 1,
      }),
    });
    const service = new UsersService(repository);

    const result = await service.list(1, 20);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(1);
  });

  it('returns undefined when the user is not found', async () => {
    const repository = createRepositoryMock({ findById: vi.fn().mockResolvedValue(undefined) });
    const service = new UsersService(repository);

    await expect(service.findById('missing')).resolves.toBeUndefined();
  });

  it('translates a unique-violation into EmailAlreadyExistsError on create', async () => {
    const repository = createRepositoryMock({
      create: vi.fn().mockRejectedValue({ code: '23505' }),
    });
    const service = new UsersService(repository);

    await expect(service.create({ email: 'a@b.com', name: 'A' })).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });

  it("translates a unique-violation wrapped in a DrizzleQueryError's .cause", async () => {
    // drizzle-orm wraps driver errors; the pg error code lives on error.cause,
    // not on the top-level error object.
    const repository = createRepositoryMock({
      create: vi.fn().mockRejectedValue(new Error('wrapped', { cause: { code: '23505' } })),
    });
    const service = new UsersService(repository);

    await expect(service.create({ email: 'a@b.com', name: 'A' })).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });

  it('rethrows errors from create that are not a unique violation', async () => {
    const repository = createRepositoryMock({
      create: vi.fn().mockRejectedValue(new Error('connection lost')),
    });
    const service = new UsersService(repository);

    await expect(service.create({ email: 'a@b.com', name: 'A' })).rejects.toThrow(
      'connection lost',
    );
  });

  it('translates a unique-violation into EmailAlreadyExistsError on update', async () => {
    const repository = createRepositoryMock({
      update: vi.fn().mockRejectedValue({ code: '23505' }),
    });
    const service = new UsersService(repository);

    await expect(service.update('1', { email: 'taken@b.com' })).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });

  it('reports whether a user was removed', async () => {
    const repository = createRepositoryMock({ remove: vi.fn().mockResolvedValue(true) });
    const service = new UsersService(repository);

    await expect(service.remove('1')).resolves.toBe(true);
  });
});
