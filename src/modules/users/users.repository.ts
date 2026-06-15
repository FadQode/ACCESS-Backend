import { eq } from "drizzle-orm";

import type { Database } from "../../db";
import { users } from "../../db/schema";

export interface LoginUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "agent" | "manager" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUserRecord {
  id: string;
  name: string;
  email: string;
  role: "agent" | "manager" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsersRepository {
  findUserByEmail(email: string): Promise<LoginUserRecord | null>;
  findUserById(id: string): Promise<SafeUserRecord | null>;
}

export const createUsersRepository = (db: Database): UsersRepository => ({
  async findUserByEmail(email) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  },

  async findUserById(id) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  },
});
