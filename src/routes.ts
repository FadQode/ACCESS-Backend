import { Elysia } from "elysia";

import type { AppConfig } from "./config/env";
import { createTransactionManager, type Database } from "./db";
import { createActionRequestRoutes } from "./modules/action-requests/action-requests.routes";
import { createActionRequestsRepository } from "./modules/action-requests/action-requests.repository";
import { createActionRequestsService } from "./modules/action-requests/action-requests.service";
import { createActionRequestGroupingService } from "./modules/action-requests/action-request-grouping.service";
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createAuthService } from "./modules/auth/auth.service";
import { createComplaintRoutes } from "./modules/complaints/complaints.routes";
import { createComplaintsRepository } from "./modules/complaints/complaints.repository";
import { createComplaintsService } from "./modules/complaints/complaints.service";
import { createHealthRoutes } from "./modules/health/health.routes";
import { createQuickResponseRoutes } from "./modules/quick-responses/quick-responses.routes";
import { createQuickResponsesRepository } from "./modules/quick-responses/quick-responses.repository";
import { createQuickResponsesService } from "./modules/quick-responses/quick-responses.service";
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
  const actionRequestsService = createActionRequestsService(
    transactionManager,
    actionRequestsRepository,
    createActionRequestGroupingService(),
  );
  const ticketsService = createTicketsService(
    transactionManager,
    createTicketsRepository(db),
    complaintsRepository,
    actionRequestsService,
  );
  const quickResponsesService = createQuickResponsesService(
    transactionManager,
    complaintsService,
    complaintsRepository,
    createQuickResponsesRepository(db),
    ticketsService,
  );

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
        quickResponsesService,
      }),
    )
    .use(createTicketRoutes(config, { authService, ticketsService }))
    .use(
      createActionRequestRoutes(config, {
        authService,
        actionRequestsService,
      }),
    );
};
