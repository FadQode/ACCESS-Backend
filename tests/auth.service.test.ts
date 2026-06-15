import { describe, expect, test } from "bun:test";

import { createAuthService } from "../src/modules/auth/auth.service";
import type {
  LoginUserRecord,
  SafeUserRecord,
  UsersRepository,
} from "../src/modules/users/users.repository";

const userId = "00000000-0000-4000-8000-000000000004";
const now = new Date("2026-01-01T00:00:00.000Z");

const loginUser: LoginUserRecord = {
  id: userId,
  name: "Agent One",
  email: "agent1@access.test",
  passwordHash: "stored-password-hash",
  role: "agent",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const safeUser: SafeUserRecord = {
  id: loginUser.id,
  name: loginUser.name,
  email: loginUser.email,
  role: loginUser.role,
  isActive: loginUser.isActive,
  createdAt: loginUser.createdAt,
  updatedAt: loginUser.updatedAt,
};

const createRepository = (
  overrides: Partial<UsersRepository> = {},
): UsersRepository => ({
  findUserByEmail: async () => loginUser,
  findUserById: async () => safeUser,
  ...overrides,
});

describe("auth service", () => {
  test("verifies the Argon2id hashes used by the user seeder", async () => {
    const passwordHash = await Bun.password.hash("password123", {
      algorithm: "argon2id",
    });
    const service = createAuthService(
      createRepository({
        findUserByEmail: async () => ({ ...loginUser, passwordHash }),
      }),
    );

    await expect(
      service.login({ email: loginUser.email, password: "password123" }),
    ).resolves.toMatchObject({ id: userId, email: loginUser.email });
  });

  test("logs in with normalized email and returns no password hash", async () => {
    let queriedEmail = "";
    const service = createAuthService(
      createRepository({
        findUserByEmail: async (email) => {
          queriedEmail = email;
          return loginUser;
        },
      }),
      { verify: async (password, hash) => password === "password123" && hash === loginUser.passwordHash },
    );

    const user = await service.login({
      email: "  AGENT1@ACCESS.TEST ",
      password: "password123",
    });

    expect(queriedEmail).toBe("agent1@access.test");
    expect(user).toEqual({
      id: userId,
      name: "Agent One",
      email: "agent1@access.test",
      role: "agent",
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  test("uses the same error for an unknown email and wrong password", async () => {
    const missingUserService = createAuthService(
      createRepository({ findUserByEmail: async () => null }),
    );
    const wrongPasswordService = createAuthService(createRepository(), {
      verify: async () => false,
    });

    await expect(
      missingUserService.login({ email: "missing@access.test", password: "x" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
    await expect(
      wrongPasswordService.login({
        email: "agent1@access.test",
        password: "wrong",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });

  test("rejects inactive users during login and current-user lookup", async () => {
    const inactiveLoginUser = { ...loginUser, isActive: false };
    const inactiveSafeUser = { ...safeUser, isActive: false };
    const service = createAuthService(
      createRepository({
        findUserByEmail: async () => inactiveLoginUser,
        findUserById: async () => inactiveSafeUser,
      }),
    );

    await expect(
      service.login({ email: loginUser.email, password: "password123" }),
    ).rejects.toMatchObject({ code: "ACCOUNT_INACTIVE", statusCode: 401 });
    await expect(service.getCurrentUser(userId)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  });
});
