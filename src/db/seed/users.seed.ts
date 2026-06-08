import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { users, type NewUser } from "../schema";

export const developmentUserPassword = "password123";

export const developmentUsers = [
  {
    name: "ACCESS Administrator",
    email: "admin@access.test",
    role: "admin",
  },
  {
    name: "Manager One",
    email: "manager1@access.test",
    role: "manager",
  },
  {
    name: "Manager Two",
    email: "manager2@access.test",
    role: "manager",
  },
  {
    name: "Agent One",
    email: "agent1@access.test",
    role: "agent",
  },
  {
    name: "Agent Two",
    email: "agent2@access.test",
    role: "agent",
  },
  {
    name: "Agent Three",
    email: "agent3@access.test",
    role: "agent",
  },
  {
    name: "Agent Four",
    email: "agent4@access.test",
    role: "agent",
  },
  {
    name: "Agent Five",
    email: "agent5@access.test",
    role: "agent",
  },
] as const satisfies ReadonlyArray<
  Pick<NewUser, "email" | "name" | "role">
>;

export const seedUsers = async (db: Database): Promise<number> => {
  const passwordHash = await Bun.password.hash(developmentUserPassword, {
    algorithm: "argon2id",
  });
  const now = new Date();

  const seededUsers = await db
    .insert(users)
    .values(
      developmentUsers.map((user) => ({
        ...user,
        passwordHash,
        isActive: true,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: sql`excluded.name`,
        passwordHash: sql`excluded.password_hash`,
        role: sql`excluded.role`,
        isActive: true,
        updatedAt: now,
      },
    })
    .returning({ id: users.id });

  return seededUsers.length;
};
