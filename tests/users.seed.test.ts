import { describe, expect, test } from "bun:test";

import {
  developmentUserPassword,
  developmentUsers,
} from "../src/db/seed/users.seed";

describe("user seed data", () => {
  test("contains the planned internal users", () => {
    expect(developmentUsers).toHaveLength(8);
    expect(developmentUsers.filter((user) => user.role === "admin")).toHaveLength(
      1,
    );
    expect(
      developmentUsers.filter((user) => user.role === "manager"),
    ).toHaveLength(2);
    expect(developmentUsers.filter((user) => user.role === "agent")).toHaveLength(
      5,
    );
  });

  test("uses unique normalized emails and the documented password", () => {
    const emails = developmentUsers.map((user) => user.email);

    expect(new Set(emails).size).toBe(emails.length);
    expect(emails.every((email) => email === email.toLowerCase())).toBe(true);
    expect(developmentUserPassword).toBe("password123");
  });
});
