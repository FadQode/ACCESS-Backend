import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { agentPerformance, type NewAgentPerformance } from "../schema";

export const agentPerformanceSeedData = [
  {
    id: "00000000-0000-4000-8011-000000000001",
    agentId: "00000000-0000-4000-8000-000000000004",
    periodMonth: 5,
    periodYear: 2026,
    complaintsResolved: 18,
    escalationsCount: 4,
    avgFirstResponseMin: "18.50",
    avgResolutionHrs: "7.20",
    qualityScore: "91.00",
    complianceRespondedBeforeAction: "98.00",
    complianceReferencedIssue: "94.00",
    complianceActionOnClose: "90.00",
    complianceFirstReplyUnder1h: "96.00",
    complianceNoSlaBreach: "93.00",
  },
  {
    id: "00000000-0000-4000-8011-000000000002",
    agentId: "00000000-0000-4000-8000-000000000005",
    periodMonth: 5,
    periodYear: 2026,
    complaintsResolved: 22,
    escalationsCount: 3,
    avgFirstResponseMin: "15.75",
    avgResolutionHrs: "6.50",
    qualityScore: "93.50",
    complianceRespondedBeforeAction: "99.00",
    complianceReferencedIssue: "95.00",
    complianceActionOnClose: "92.00",
    complianceFirstReplyUnder1h: "97.00",
    complianceNoSlaBreach: "95.00",
  },
  {
    id: "00000000-0000-4000-8011-000000000003",
    agentId: "00000000-0000-4000-8000-000000000006",
    periodMonth: 5,
    periodYear: 2026,
    complaintsResolved: 16,
    escalationsCount: 5,
    avgFirstResponseMin: "24.10",
    avgResolutionHrs: "10.00",
    qualityScore: "88.00",
    complianceRespondedBeforeAction: "96.00",
    complianceReferencedIssue: "90.00",
    complianceActionOnClose: "86.00",
    complianceFirstReplyUnder1h: "91.00",
    complianceNoSlaBreach: "89.00",
  },
  {
    id: "00000000-0000-4000-8011-000000000004",
    agentId: "00000000-0000-4000-8000-000000000007",
    periodMonth: 5,
    periodYear: 2026,
    complaintsResolved: 20,
    escalationsCount: 6,
    avgFirstResponseMin: "20.00",
    avgResolutionHrs: "8.40",
    qualityScore: "89.50",
    complianceRespondedBeforeAction: "97.00",
    complianceReferencedIssue: "92.00",
    complianceActionOnClose: "88.00",
    complianceFirstReplyUnder1h: "94.00",
    complianceNoSlaBreach: "90.00",
  },
  {
    id: "00000000-0000-4000-8011-000000000005",
    agentId: "00000000-0000-4000-8000-000000000008",
    periodMonth: 5,
    periodYear: 2026,
    complaintsResolved: 14,
    escalationsCount: 2,
    avgFirstResponseMin: "28.30",
    avgResolutionHrs: "9.75",
    qualityScore: "87.00",
    complianceRespondedBeforeAction: "95.00",
    complianceReferencedIssue: "89.00",
    complianceActionOnClose: "85.00",
    complianceFirstReplyUnder1h: "88.00",
    complianceNoSlaBreach: "87.00",
  },
] as const satisfies ReadonlyArray<NewAgentPerformance>;

export const seedAgentPerformance = async (
  db: Database,
): Promise<number> => {
  const calculatedAt = new Date("2026-05-27T03:30:00.000Z");

  const seededSnapshots = await db
    .insert(agentPerformance)
    .values(
      agentPerformanceSeedData.map((snapshot) => ({
        ...snapshot,
        calculatedAt,
      })),
    )
    .onConflictDoUpdate({
      target: agentPerformance.id,
      set: {
        agentId: sql`excluded.agent_id`,
        periodMonth: sql`excluded.period_month`,
        periodYear: sql`excluded.period_year`,
        complaintsResolved: sql`excluded.complaints_resolved`,
        escalationsCount: sql`excluded.escalations_count`,
        avgFirstResponseMin: sql`excluded.avg_first_response_min`,
        avgResolutionHrs: sql`excluded.avg_resolution_hrs`,
        qualityScore: sql`excluded.quality_score`,
        complianceRespondedBeforeAction:
          sql`excluded.compliance_responded_before_action`,
        complianceReferencedIssue: sql`excluded.compliance_referenced_issue`,
        complianceActionOnClose: sql`excluded.compliance_action_on_close`,
        complianceFirstReplyUnder1h:
          sql`excluded.compliance_first_reply_under_1h`,
        complianceNoSlaBreach: sql`excluded.compliance_no_sla_breach`,
        calculatedAt: sql`excluded.calculated_at`,
      },
    })
    .returning({ id: agentPerformance.id });

  return seededSnapshots.length;
};
