import { UnauthorizedError } from "../../shared/errors";
import type { UsersRepository } from "../users/users.repository";
import type { AuthUser, LoginInput } from "./auth.types";

export interface PasswordVerifier {
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface AuthService {
  login(input: LoginInput): Promise<AuthUser>;
  getCurrentUser(userId: string): Promise<AuthUser>;
}

const defaultPasswordVerifier: PasswordVerifier = {
  verify: (password, passwordHash) => Bun.password.verify(password, passwordHash),
};

const toAuthUser = (user: {
  id: string;
  name: string;
  email: string;
  role: AuthUser["role"];
}): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const createAuthService = (
  usersRepository: UsersRepository,
  passwordVerifier: PasswordVerifier = defaultPasswordVerifier,
): AuthService => ({
  async login(input) {
    const user = await usersRepository.findUserByEmail(
      input.email.trim().toLowerCase(),
    );

    if (!user) {
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is inactive", "ACCOUNT_INACTIVE");
    }

    const passwordIsValid = await passwordVerifier.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    }

    return toAuthUser(user);
  },

  async getCurrentUser(userId) {
    const user = await usersRepository.findUserById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError();
    }

    return toAuthUser(user);
  },
});
