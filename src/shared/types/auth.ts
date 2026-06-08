import type { UserRole } from "../constants/roles";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
