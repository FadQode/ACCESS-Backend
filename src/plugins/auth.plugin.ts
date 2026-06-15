import { jwt } from "@elysiajs/jwt";

import type { AppConfig } from "../config/env";
import { jwtPayloadSchema } from "../modules/auth/auth.dto";
import { UnauthorizedError } from "../shared/errors";
import type { AuthService } from "../modules/auth/auth.service";

export interface VerifiedJwtPayload {
  sub?: string;
}

export interface JwtVerifier {
  verify(token?: string): Promise<VerifiedJwtPayload | false>;
}

export const createAccessTokenPlugin = (config: AppConfig) =>
  jwt({
    name: "accessToken",
    secret: config.auth.accessTokenSecret,
    exp: `${config.auth.accessTokenTtlSeconds}s`,
    iat: true,
    schema: jwtPayloadSchema,
  });

export const extractBearerToken = (authorization?: string): string => {
  if (!authorization) {
    throw new UnauthorizedError();
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    throw new UnauthorizedError();
  }

  return token;
};

export const requireAuth = async (
  authorization: string | undefined,
  jwt: JwtVerifier,
  authService: AuthService,
) => {
  const token = extractBearerToken(authorization);
  const payload = await jwt.verify(token);

  if (!payload || typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new UnauthorizedError();
  }

  return authService.getCurrentUser(payload.sub);
};
