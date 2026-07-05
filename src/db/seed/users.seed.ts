import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { users, type NewUser } from "../schema";

export const developmentUserPassword = "password123";

export const developmentUsers = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "ACCESS Administrator",
    email: "admin@access.test",
    role: "admin",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Manager Dini",
    email: "manager1@access.test",
    role: "manager",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Manager Satria",
    email: "manager2@access.test",
    role: "manager",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Agent Farhan",
    email: "agent1@access.test",
    role: "agent",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Agent Gilang",
    email: "agent2@access.test",
    role: "agent",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    name: "Agent Joko",
    email: "agent3@access.test",
    role: "agent",
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    name: "Agent Rafli",
    email: "agent4@access.test",
    role: "agent",
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    name: "Agent Rizky",
    email: "agent5@access.test",
    role: "agent",
  },
] as const satisfies ReadonlyArray<
  Pick<NewUser, "email" | "id" | "name" | "role">
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
