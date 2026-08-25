import { Elysia } from "elysia";

import type { AppConfig } from "./config/env";
import { createTransactionManager, type Database } from "./db";
import { createActionRequestRoutes } from "./modules/action-requests/action-requests.routes";
import { createActionRequestReferencesRepository } from "./modules/action-requests/action-request-references.repository";
import { createActionRequestReferencesService } from "./modules/action-requests/action-request-references.service";
import { createActionRequestsRepository } from "./modules/action-requests/action-requests.repository";
import { createActionRequestsService } from "./modules/action-requests/action-requests.service";
import { createActionRequestGroupingService } from "./modules/action-requests/action-request-grouping.service";
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createAuthService } from "./modules/auth/auth.service";
import { createComplaintRoutes } from "./modules/complaints/complaints.routes";
import { createComplaintsRepository } from "./modules/complaints/complaints.repository";
import { createComplaintsService } from "./modules/complaints/complaints.service";
import { createDashboardRepository } from "./modules/dashboard/dashboard.repository";
import { createDashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { createDashboardService } from "./modules/dashboard/dashboard.service";
import { createHealthRoutes } from "./modules/health/health.routes";
import { createHolidayRoutes } from "./modules/holidays/holidays.routes";
import { createHolidaysRepository } from "./modules/holidays/holidays.repository";
import { createHolidaysService } from "./modules/holidays/holidays.service";
import { createHolidaySyncService } from "./modules/holidays/holidays.sync";
import { createApiIndonesiaHolidayProvider } from "./modules/holidays/providers/api-indonesia.provider";
import { createAiChatClient } from "./integrations/ai/ai.client";
import { createEmbeddingClient } from "./integrations/embeddings/embedding.client";
import { createSemanticContextRepository } from "./modules/context-suggestions/semantic-context.repository";
import { createSemanticContextService } from "./modules/context-suggestions/semantic-context.service";
import { createQuickResponsePreviewService } from "./modules/quick-responses/quick-response-preview.service";
import { createQuickResponseRoutes } from "./modules/quick-responses/quick-responses.routes";
import { createQuickResponseReferencesRepository } from "./modules/quick-responses/quick-response-references.repository";
import { createQuickResponseReferencesService } from "./modules/quick-responses/quick-response-references.service";
import { createQuickResponsesRepository } from "./modules/quick-responses/quick-responses.repository";
import { createQuickResponsesService } from "./modules/quick-responses/quick-responses.service";
import { createReferenceRoutes } from "./modules/references/references.routes";
import { createReferencesRepository } from "./modules/references/references.repository";
import { createReferencesService } from "./modules/references/references.service";
import { createReportsRepository } from "./modules/reports/reports.repository";
import { createReportRoutes } from "./modules/reports/reports.routes";
import { createReportsService } from "./modules/reports/reports.service";
import { createSupabaseStorageService } from "./integrations/supabase/supabase-storage.service";
import { createTicketRoutes } from "./modules/tickets/tickets.routes";
import { createTicketsRepository } from "./modules/tickets/tickets.repository";
import { createTicketsService } from "./modules/tickets/tickets.service";
import { createUsersRepository } from "./modules/users/users.repository";

export const createRoutes = (config: AppConfig, db: Database) => {
  const transactionManager = createTransactionManager(db);
  const authService = createAuthService(createUsersRepository(db));
  const complaintsRepository = createComplaintsRepository(db);
  const complaintsService = createComplaintsService(complaintsRepository);
  const actionRequestsRepository = createActionRequestsRepository(db);
  const actionRequestReferencesRepository =
    createActionRequestReferencesRepository(db);
  const referencesRepository = createReferencesRepository(db);
  const actionRequestsService = createActionRequestsService(
    transactionManager,
    actionRequestsRepository,
    createActionRequestGroupingService(),
    actionRequestReferencesRepository,
  );
  const actionRequestReferencesService = createActionRequestReferencesService(
    actionRequestsRepository,
    referencesRepository,
    actionRequestReferencesRepository,
  );
  const ticketsService = createTicketsService(
    transactionManager,
    createTicketsRepository(db),
    complaintsRepository,
    actionRequestsService,
    actionRequestReferencesRepository,
  );
  const quickResponseReferencesService = createQuickResponseReferencesService(
    referencesRepository,
    actionRequestReferencesRepository,
    createQuickResponseReferencesRepository(db),
  );
  const quickResponsesService = createQuickResponsesService(
    transactionManager,
    complaintsService,
    complaintsRepository,
    createQuickResponsesRepository(db),
    ticketsService,
    quickResponseReferencesService,
  );
  const referencesService = createReferencesService(
    transactionManager,
    referencesRepository,
    createSupabaseStorageService(config.supabase),
  );
  const dashboardService = createDashboardService(
    createDashboardRepository(db),
  );
  const reportsService = createReportsService(createReportsRepository(db));
  const holidaysRepository = createHolidaysRepository(db);
  const holidaysService = createHolidaysService(holidaysRepository);
  const holidaySyncService = createHolidaySyncService({
    transactionManager,
    holidaysRepository,
    holidayProvider: createApiIndonesiaHolidayProvider({
      config: config.apiIndonesia,
    }),
  });
  const semanticContextService = createSemanticContextService(
    config.semanticContext,
    config.embedding,
    createEmbeddingClient(config.embedding),
    createSemanticContextRepository(db),
  );
  const previewContextService = {
    getContextSuggestions: semanticContextService.getSemanticContextSuggestions,
  };

  return new Elysia({ name: "application-routes" })
    .use(createHealthRoutes(config))
    .use(createAuthRoutes(config, { authService }))
    .use(
      createComplaintRoutes(config, {
        authService,
        complaintsService,
        quickResponsesService,
      }),
    )
    .use(
      createQuickResponseRoutes(config, {
        authService,
        quickResponsePreviewService: createQuickResponsePreviewService(
          config.ai,
          createAiChatClient(config.ai),
          previewContextService,
        ),
        quickResponsesService,
      }),
    )
    .use(createReferenceRoutes(config, { authService, referencesService }))
    .use(createDashboardRoutes(config, { authService, dashboardService }))
    .use(createReportRoutes(config, { authService, reportsService }))
    .use(createTicketRoutes(config, { authService, ticketsService }))
    .use(
      createHolidayRoutes(config, {
        authService,
        holidaysService,
        holidaySyncService,
      }),
    )
    .use(
      createActionRequestRoutes(config, {
        authService,
        actionRequestReferencesService,
        actionRequestsService,
      }),
    );
};
