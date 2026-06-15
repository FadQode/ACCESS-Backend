import { Elysia } from "elysia";

import type { AppConfig } from "./config/env";
import { createTransactionManager, type Database } from "./db";
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createAuthService } from "./modules/auth/auth.service";
import { createComplaintRoutes } from "./modules/complaints/complaints.routes";
import { createComplaintsRepository } from "./modules/complaints/complaints.repository";
import { createComplaintsService } from "./modules/complaints/complaints.service";
import { createHealthRoutes } from "./modules/health/health.routes";
import { createQuickResponseRoutes } from "./modules/quick-responses/quick-responses.routes";
import { createQuickResponsesRepository } from "./modules/quick-responses/quick-responses.repository";
import { createQuickResponsesService } from "./modules/quick-responses/quick-responses.service";
import { createUsersRepository } from "./modules/users/users.repository";

export const createRoutes = (config: AppConfig, db: Database) => {
  const authService = createAuthService(createUsersRepository(db));
  const complaintsService = createComplaintsService(
    createComplaintsRepository(db),
  );
  const quickResponsesService = createQuickResponsesService(
    createTransactionManager(db),
    complaintsService,
    createQuickResponsesRepository(db),
  );

  return new Elysia({ name: "application-routes" })
    .use(createHealthRoutes(config))
    .use(createAuthRoutes(config, { authService }))
    .use(createComplaintRoutes(config, { authService, complaintsService }))
    .use(
      createQuickResponseRoutes(config, {
        authService,
        quickResponsesService,
      }),
    );
};
