import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import { successResponse } from "../../shared/http/response";
import type { AuthService } from "../auth/auth.service";
import {
  complaintDetailResponseSchema,
  complaintListQuerySchema,
  complaintListResponseSchema,
  complaintMutationResponseSchema,
  complaintParamsSchema,
  updateComplaintBodySchema,
  updateComplaintStatusBodySchema,
} from "./complaints.dto";
import type { ComplaintsService } from "./complaints.service";

export interface ComplaintRoutesDependencies {
  authService: AuthService;
  complaintsService: ComplaintsService;
}

const protectedErrors = {
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

export const createComplaintRoutes = (
  config: AppConfig,
  { authService, complaintsService }: ComplaintRoutesDependencies,
) =>
  new Elysia({ name: "complaint-routes", prefix: "/complaints" })
    .use(createAccessTokenPlugin(config))
    .get(
      "",
      async ({ accessToken, headers, query }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const result = await complaintsService.listComplaints(query);
        return successResponse(result, "Complaints retrieved");
      },
      {
        query: complaintListQuerySchema,
        response: { 200: complaintListResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Complaints"],
          summary: "List complaints",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/:id",
      async ({ accessToken, headers, params }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const result = await complaintsService.getComplaintDetail(params.id);
        return successResponse(result, "Complaint retrieved");
      },
      {
        params: complaintParamsSchema,
        response: { 200: complaintDetailResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Complaints"],
          summary: "Get complaint detail",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .patch(
      "/:id",
      async ({ accessToken, headers, params, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const complaint = await complaintsService.updateComplaint(
          params.id,
          body,
          currentUser,
        );
        return successResponse({ complaint }, "Complaint updated");
      },
      {
        params: complaintParamsSchema,
        body: updateComplaintBodySchema,
        response: { 200: complaintMutationResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Complaints"],
          summary: "Update complaint information",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .patch(
      "/:id/status",
      async ({ accessToken, headers, params, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const complaint = await complaintsService.updateComplaintStatus(
          params.id,
          body.status,
          currentUser,
        );
        return successResponse({ complaint }, "Complaint status updated");
      },
      {
        params: complaintParamsSchema,
        body: updateComplaintStatusBodySchema,
        response: { 200: complaintMutationResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Complaints"],
          summary: "Update complaint status",
          security: [{ bearerAuth: [] }],
        },
      },
    );
