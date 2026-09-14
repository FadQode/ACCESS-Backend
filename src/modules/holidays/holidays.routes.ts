import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import type { Holiday } from "../../db/schema";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import {
  ForbiddenError,
  ServiceUnavailableError,
} from "../../shared/errors";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import { successResponse } from "../../shared/http/response";
import type { AuthService } from "../auth/auth.service";
import type { AuthUser } from "../auth/auth.types";
import type { HolidaySyncService } from "./holidays.sync";
import type { HolidaysService } from "./holidays.service";
import {
  calendarQuerySchema,
  calendarResponseSchema,
  createHolidayBodySchema,
  holidayDeleteResponseSchema,
  holidayListQuerySchema,
  holidayListResponseSchema,
  holidayOverviewResponseSchema,
  holidayParamsSchema,
  holidayResponseSchema,
  holidaySyncBodySchema,
  holidaySyncResponseSchema,
  updateHolidayBodySchema,
} from "./holidays.dto";

export interface HolidayRoutesDependencies {
  authService: AuthService;
  holidaysService: HolidaysService;
  holidaySyncService: HolidaySyncService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

const syncProtectedErrors = {
  ...protectedErrors,
  503: apiErrorResponseSchema,
};

/**
 * Holiday write operations (including monitoring overrides) are administrative.
 * Read endpoints stay available to every authenticated user.
 */
const assertCanManageHolidays = (currentUser: AuthUser): void => {
  if (currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Only admins can manage holidays",
      "HOLIDAY_MANAGE_FORBIDDEN",
    );
  }
};

const toHolidayItem = (holiday: Holiday) => ({
  id: holiday.id,
  name: holiday.name,
  date: holiday.date,
  category: holiday.category,
  isJointLeave: holiday.isJointLeave,
  source: holiday.source,
  sourceReference: holiday.sourceReference,
  monitoringBefore: holiday.monitoringBefore,
  monitoringAfter: holiday.monitoringAfter,
  createdAt: holiday.createdAt.toISOString(),
  updatedAt: holiday.updatedAt.toISOString(),
});

// Static paths (/calendar, /overview) are registered before /:id so Elysia
// does not swallow them as an id parameter.
export const createHolidayRoutes = (
  config: AppConfig,
  {
    authService,
    holidaysService,
    holidaySyncService,
  }: HolidayRoutesDependencies,
) =>
  new Elysia({ name: "holiday-routes", prefix: "/holidays" })
    .use(createAccessTokenPlugin(config))
    .get(
      "",
      async ({ accessToken, headers, query }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const result = await holidaysService.getHolidays({
          year: query.year,
          category: query.category,
          source: query.source,
        });
        return successResponse(
          { holidays: result.map(toHolidayItem) },
          "Holidays retrieved",
        );
      },
      {
        query: holidayListQuerySchema,
        response: { 200: holidayListResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "List holidays",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/calendar",
      async ({ accessToken, headers, query }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const result = await holidaysService.getCalendar(query.start, query.end);
        return successResponse(result, "Holiday calendar retrieved");
      },
      {
        query: calendarQuerySchema,
        response: { 200: calendarResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "Get holiday calendar for a date range",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/overview",
      async ({ accessToken, headers }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const result = await holidaysService.getOverview();
        return successResponse(result, "Holiday overview retrieved");
      },
      {
        response: { 200: holidayOverviewResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "Get current holiday status and next monitoring period",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "/sync",
      async ({ accessToken, headers, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        assertCanManageHolidays(currentUser);
        if (!config.apiIndonesia.apiKey) {
          throw new ServiceUnavailableError(
            "Holiday sync is not configured",
            "HOLIDAY_SYNC_NOT_CONFIGURED",
          );
        }
        const result = await holidaySyncService.syncYear(body.year);
        return successResponse(result, "Holiday sync completed");
      },
      {
        body: holidaySyncBodySchema,
        response: { 200: holidaySyncResponseSchema, ...syncProtectedErrors },
        detail: {
          tags: ["Holidays"],
          summary:
            "Synchronize holidays for a year from the external provider",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "",
      async ({ accessToken, headers, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        assertCanManageHolidays(currentUser);
        const holiday = await holidaysService.createHoliday(body);
        return successResponse(
          { holiday: toHolidayItem(holiday) },
          "Holiday created",
        );
      },
      {
        body: createHolidayBodySchema,
        response: { 200: holidayResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "Create a holiday",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/:id",
      async ({ accessToken, headers, params }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const holiday = await holidaysService.getHolidayById(params.id);
        return successResponse(
          { holiday: toHolidayItem(holiday) },
          "Holiday retrieved",
        );
      },
      {
        params: holidayParamsSchema,
        response: { 200: holidayResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "Get holiday by id",
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
        assertCanManageHolidays(currentUser);
        const holiday = await holidaysService.updateHoliday(params.id, body);
        return successResponse(
          { holiday: toHolidayItem(holiday) },
          "Holiday updated",
        );
      },
      {
        params: holidayParamsSchema,
        body: updateHolidayBodySchema,
        response: { 200: holidayResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "Update a holiday",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .delete(
      "/:id",
      async ({ accessToken, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        assertCanManageHolidays(currentUser);
        await holidaysService.deleteHoliday(params.id);
        return successResponse({ deleted: true }, "Holiday deleted");
      },
      {
        params: holidayParamsSchema,
        response: { 200: holidayDeleteResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Holidays"],
          summary: "Delete a holiday",
          security: [{ bearerAuth: [] }],
        },
      },
    );
