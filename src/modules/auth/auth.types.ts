import type { UserRole } from "../../shared/constants/roles";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
