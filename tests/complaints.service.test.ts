import { describe, expect, test } from "bun:test";

import type { Complaint } from "../src/db/schema";
import type { AuthUser } from "../src/modules/auth/auth.types";
import type { ComplaintsRepository } from "../src/modules/complaints/complaints.repository";
import { createComplaintsService } from "../src/modules/complaints/complaints.service";

const now = new Date("2026-06-15T10:00:00.000Z");
const complaint: Complaint = {
  id: "10000000-0000-4000-8000-000000000001",
  referenceNo: "ACC-20260615-TEST",
  trackingToken: "trk_test",
  source: "app_store",
  sourceHandle: "user123",
  sourceUrl: null,
  complainerName: null,
  complainerContact: null,
  category: "app_update",
  complaintText: "Kereta terlambat dua jam.",
  socialComplaintId: null,
  status: "submitted",
  submittedAt: now,
  resolvedAt: null,
  createdAt: now,
  updatedAt: now,
};

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent One",
  email: "agent1@access.test",
  role: "agent",
};

const createRepository = (
  overrides: Partial<ComplaintsRepository> = {},
): ComplaintsRepository => ({
  createComplaint: async (input) => ({ ...complaint, ...input }),
  findComplaints: async () => ({ items: [complaint], total: 1 }),
  findComplaintById: async () => complaint,
  findComplaintDetailById: async () => ({
    complaint,
    quickResponseSessions: [],
  }),
  isReferenceNoInUse: async () => false,
  updateComplaint: async (_id, input) => ({ ...complaint, ...input }),
  updateComplaintStatus: async (_id, status, resolvedAt) => ({
    ...complaint,
    status,
    resolvedAt,
  }),
  ...overrides,
});

describe("complaints service", () => {
  test("lists complaints with the planned pagination shape", async () => {
    const service = createComplaintsService(createRepository());

    const result = await service.listComplaints({ page: 1, limit: 20 });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0]).toMatchObject({
      id: complaint.id,
      submittedAt: now.toISOString(),
    });
  });

  test("rejects manager updates", async () => {
    const service = createComplaintsService(createRepository());
    const manager: AuthUser = { ...agent, role: "manager" };

    await expect(
      service.updateComplaint(complaint.id, { category: "payment" }, manager),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "COMPLAINT_UPDATE_FORBIDDEN",
    });
  });

  test("sets and clears resolvedAt according to manual status", async () => {
    const statusUpdates: Array<{ status: string; resolvedAt: Date | null }> = [];
    const repository = createRepository({
      updateComplaintStatus: async (_id, status, resolvedAt) => {
        statusUpdates.push({ status, resolvedAt });
        return { ...complaint, status, resolvedAt };
      },
    });
    const service = createComplaintsService(repository);

    await service.updateComplaintStatus(complaint.id, "resolved", agent);
    await service.updateComplaintStatus(complaint.id, "waiting_action", agent);

    expect(statusUpdates[0]?.resolvedAt).toBeInstanceOf(Date);
    expect(statusUpdates[1]).toEqual({
      status: "waiting_action",
      resolvedAt: null,
    });
  });
});
