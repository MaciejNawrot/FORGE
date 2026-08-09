import type { CreateUserInput, PaginatedUsers, UpdateUserInput, User } from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = 'EmailAlreadyExistsError';
  }
}

function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  // drizzle-orm wraps driver errors in a DrizzleQueryError; the original
  // PostgresError (with the pg error code) lives on `.cause`.
  if ('cause' in error) {
    return getPgErrorCode((error as { cause?: unknown }).cause);
  }
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === '23505';
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async list(page: number, pageSize: number): Promise<PaginatedUsers> {
    const { rows, total } = await this.usersRepository.list(page, pageSize);
    return { items: rows, page, pageSize, total };
  }

  async findById(id: string): Promise<User | undefined> {
    return this.usersRepository.findById(id);
  }

  async create(input: CreateUserInput): Promise<User> {
    try {
      return await this.usersRepository.create(input);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyExistsError(input.email);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<User | undefined> {
    try {
      return await this.usersRepository.update(id, input);
    } catch (error) {
      if (isUniqueViolation(error) && input.email) {
        throw new EmailAlreadyExistsError(input.email);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    return this.usersRepository.remove(id);
  }
}
