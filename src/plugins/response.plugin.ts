import { Elysia } from "elysia";

import {
  paginatedResponse,
  successResponse,
} from "../shared/http/response";

export const responsePlugin = new Elysia({ name: "response" }).decorate(
  "apiResponse",
  {
    paginated: paginatedResponse,
    success: successResponse,
  },
);
