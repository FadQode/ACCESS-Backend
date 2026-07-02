import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { successResponse } from "../../shared/http/response";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import type { AuthService } from "../auth/auth.service";
import {
  createReferenceBodySchema,
  createTagBodySchema,
  listReferencesQuerySchema,
  referenceDetailResponseSchema,
  referenceFileUrlResponseSchema,
  referenceListResponseSchema,
  referenceMutationResponseSchema,
  referenceParamsSchema,
  referenceTagMutationResponseSchema,
  referenceTagsResponseSchema,
  updateReferenceBodySchema,
  uploadReferenceBodySchema,
} from "./references.dto";
import type { ReferencesService } from "./references.service";

export interface ReferenceRoutesDependencies {
  authService: AuthService;
  referencesService: ReferencesService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  503: apiErrorResponseSchema,
};

const parseUploadTags = (
  tags: string | string[] | undefined,
): string[] | undefined => {
  if (Array.isArray(tags)) return tags;
  if (!tags?.trim()) return undefined;

  const trimmed = tags.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === "string")
          .filter(Boolean);
      }
    } catch {
      return [trimmed];
    }
  }

  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const createReferenceRoutes = (
  config: AppConfig,
  { authService, referencesService }: ReferenceRoutesDependencies,
) =>
  new Elysia({ name: "reference-routes", prefix: "/references" })
    .use(createAccessTokenPlugin(config))
    .get(
      "",
      async ({ accessToken, headers, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await referencesService.listReferences(query, currentUser);
        return successResponse(result, "References retrieved");
      },
      {
        query: listReferencesQuerySchema,
        response: { 200: referenceListResponseSchema, ...protectedErrors },
        detail: {
          tags: ["References"],
          summary: "List references",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "",
      async ({ accessToken, body, headers, set }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const reference = await referencesService.createReference(
          body,
          currentUser,
        );
        set.status = 201;
        return successResponse({ reference }, "Reference created");
      },
      {
        body: createReferenceBodySchema,
        response: {
          201: referenceMutationResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["References"],
          summary: "Create a text or link reference",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/tags",
      async ({ accessToken, headers }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const tags = await referencesService.listTags(currentUser);
        return successResponse({ tags }, "Reference tags retrieved");
      },
      {
        response: { 200: referenceTagsResponseSchema, ...protectedErrors },
        detail: {
          tags: ["References"],
          summary: "List reference tags",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "/tags",
      async ({ accessToken, body, headers, set }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const tag = await referencesService.createTag(body, currentUser);
        set.status = 201;
        return successResponse({ tag }, "Reference tag created");
      },
      {
        body: createTagBodySchema,
        response: {
          201: referenceTagMutationResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["References"],
          summary: "Create a reference tag",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "/upload",
      async ({ accessToken, body, headers, set }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const reference = await referencesService.uploadReference(
          {
            title: body.title,
            category: body.category,
            content: body.content,
            tags: parseUploadTags(body.tags),
            status: body.status,
            version: body.version,
            metadata: body.metadata,
          },
          body.file,
          currentUser,
        );
        set.status = 201;
        return successResponse({ reference }, "Reference file uploaded");
      },
      {
        body: uploadReferenceBodySchema,
        response: {
          201: referenceMutationResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["References"],
          summary: "Upload a private reference file",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/:id/file-url",
      async ({ accessToken, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await referencesService.getReferenceFileUrl(
          params.id,
          currentUser,
        );
        return successResponse(result, "Signed URL created");
      },
      {
        params: referenceParamsSchema,
        response: { 200: referenceFileUrlResponseSchema, ...protectedErrors },
        detail: {
          tags: ["References"],
          summary: "Create signed URL for a private reference file",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "/:id/archive",
      async ({ accessToken, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const reference = await referencesService.archiveReference(
          params.id,
          currentUser,
        );
        return successResponse({ reference }, "Reference archived");
      },
      {
        params: referenceParamsSchema,
        response: { 200: referenceMutationResponseSchema, ...protectedErrors },
        detail: {
          tags: ["References"],
          summary: "Archive a reference",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .patch(
      "/:id",
      async ({ accessToken, body, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const reference = await referencesService.updateReference(
          params.id,
          body,
          currentUser,
        );
        return successResponse({ reference }, "Reference updated");
      },
      {
        params: referenceParamsSchema,
        body: updateReferenceBodySchema,
        response: { 200: referenceMutationResponseSchema, ...protectedErrors },
        detail: {
          tags: ["References"],
          summary: "Update a reference",
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
        const reference = await referencesService.getReferenceDetail(
          params.id,
          currentUser,
        );
        return successResponse({ reference }, "Reference retrieved");
      },
      {
        params: referenceParamsSchema,
        response: { 200: referenceDetailResponseSchema, ...protectedErrors },
        detail: {
          tags: ["References"],
          summary: "Get reference detail",
          security: [{ bearerAuth: [] }],
        },
      },
    );
