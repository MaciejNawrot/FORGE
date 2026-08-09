import type { Database, NewUserRow, UserRow } from '@acme/db';
import { users } from '@acme/db';
import { Inject, Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { DATABASE } from '../../common/database/database.module.js';

export interface ListUsersResult {
  rows: UserRow[];
  total: number;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(page: number, pageSize: number): Promise<ListUsersResult> {
    const offset = (page - 1) * pageSize;

    const [rows, totalRows] = await Promise.all([
      this.db.select().from(users).limit(pageSize).offset(offset).orderBy(users.createdAt),
      this.db.select({ value: count() }).from(users),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  async create(input: Pick<NewUserRow, 'email' | 'name'>): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(input).returning();
    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async update(
    id: string,
    input: Partial<Pick<NewUserRow, 'email' | 'name'>>,
  ): Promise<UserRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row;
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return deleted.length > 0;
  }
}
