import { t } from "elysia";

const userRoleSchema = t.Union(
  [t.Literal("agent"), t.Literal("manager"), t.Literal("admin")],
  { description: "Authorization role assigned to the internal user." },
);

export const authUserSchema = t.Object({
  id: t.String({
    format: "uuid",
    description: "Internal ACCESS user identifier.",
  }),
  name: t.String({ description: "Display name of the internal user." }),
  email: t.String({
    format: "email",
    description: "Normalized internal user email address.",
  }),
  role: userRoleSchema,
});

export const loginBodySchema = t.Object({
  email: t.String({
    format: "email",
    description: "Email address of a seeded internal ACCESS user.",
    examples: ["agent1@access.test"],
  }),
  password: t.String({
    minLength: 1,
    description: "User password.",
    examples: ["password123"],
  }),
});

export const loginResponseSchema = t.Object(
  {
    success: t.Literal(true),
    message: t.String(),
    data: t.Object({
      token: t.String({
        description: "Bearer JWT used to access protected API endpoints.",
      }),
      user: authUserSchema,
    }),
  },
  { description: "Successful authentication response." },
);

export const currentUserResponseSchema = t.Object(
  {
    success: t.Literal(true),
    message: t.String(),
    data: t.Object({
      user: authUserSchema,
    }),
  },
  { description: "Authenticated internal user response." },
);

export const authErrorResponseSchema = t.Object(
  {
    success: t.Literal(false),
    message: t.String(),
    error: t.Object({
      code: t.String(),
      details: t.Optional(t.Unknown()),
    }),
  },
  { description: "Standard authentication error response." },
);

export const jwtPayloadSchema = t.Object({
  email: t.String({ format: "email" }),
  role: userRoleSchema,
});
