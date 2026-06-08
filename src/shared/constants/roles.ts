export const userRoles = ["agent", "manager", "admin"] as const;

export type UserRole = (typeof userRoles)[number];
