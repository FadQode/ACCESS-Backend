import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { successResponse } from "../../shared/http/response";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import type { AuthService } from "../auth/auth.service";
import type { TicketsService } from "./tickets.service";
import {
  ticketDetailResponseSchema,
  ticketEscalationResponseSchema,
  ticketListQuerySchema,
  ticketListResponseSchema,
  ticketParamsSchema,
} from "./tickets.dto";

export interface TicketRoutesDependencies {
  authService: AuthService;
  ticketsService: TicketsService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

export const createTicketRoutes = (
  config: AppConfig,
  { authService, ticketsService }: TicketRoutesDependencies,
) =>
  new Elysia({ name: "ticket-routes", prefix: "/tickets" })
    .use(createAccessTokenPlugin(config))
    .get(
      "",
      async ({ accessToken, headers, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await ticketsService.listTickets(query, currentUser);
        return successResponse(result, "Tickets retrieved");
      },
      {
        query: ticketListQuerySchema,
        response: { 200: ticketListResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Tickets"],
          summary: "List tickets",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/:id",
      async ({ accessToken, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const ticket = await ticketsService.getTicketDetail(
          params.id,
          currentUser,
        );
        return successResponse({ ticket }, "Ticket retrieved");
      },
      {
        params: ticketParamsSchema,
        response: { 200: ticketDetailResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Tickets"],
          summary: "Get ticket detail",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "/:id/escalate",
      async ({ accessToken, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await ticketsService.escalateTicket(
          params.id,
          currentUser,
        );
        return successResponse(result, "Ticket escalated");
      },
      {
        params: ticketParamsSchema,
        response: { 200: ticketEscalationResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Tickets"],
          summary: "Escalate ticket to a grouped manager action request",
          security: [{ bearerAuth: [] }],
        },
      },
    );
