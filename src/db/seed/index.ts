import { env } from "../../config/env";
import { createDatabase } from "../index";
import { seedActionRequests } from "./action-requests.seed";
import { seedAgentPerformance } from "./agent-performance.seed";
import { seedComplaints } from "./complaints.seed";
import { seedQuickResponseSessions } from "./quick-response.seed";
import { seedReferences } from "./references.seed";
import { seedTicketEvents } from "./ticket-events.seed";
import { seedTickets } from "./tickets.seed";
import { seedUsers } from "./users.seed";

export const runSeeds = async (): Promise<void> => {
  if (env.nodeEnv === "production") {
    throw new Error("Development seed data cannot be loaded in production");
  }

  const database = createDatabase(env.database);

  try {
    const userCount = await seedUsers(database.db);
    console.log(`Seeded ${userCount} users`);

    const complaintCount = await seedComplaints(database.db);
    console.log(`Seeded ${complaintCount} complaints`);

    const ticketCount = await seedTickets(database.db);
    console.log(`Seeded ${ticketCount} tickets`);

    const quickResponseCount = await seedQuickResponseSessions(database.db);
    console.log(`Seeded ${quickResponseCount} quick response sessions`);

    const actionRequestCount = await seedActionRequests(database.db);
    console.log(`Seeded ${actionRequestCount} action request records`);

    const referenceCount = await seedReferences(database.db);
    console.log(`Seeded ${referenceCount} reference records`);

    const ticketEventCount = await seedTicketEvents(database.db);
    console.log(`Seeded ${ticketEventCount} ticket events`);

    const agentPerformanceCount = await seedAgentPerformance(database.db);
    console.log(`Seeded ${agentPerformanceCount} performance snapshots`);
  } finally {
    await database.close();
  }
};

if (import.meta.main) {
  try {
    await runSeeds();
  } catch (error) {
    console.error("Database seeding failed", error);
    process.exitCode = 1;
  }
}
