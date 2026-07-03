#!/usr/bin/env bun

/**
 * Phase 5 Smoke Test
 * 
 * Tests the complete reference usage flow:
 * 1. Manager attaches reference to action request
 * 2. Agent sees reference in closure context
 * 3. Agent uses reference in final closure
 * 4. System records reference usage
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const API_BASE = BASE_URL;

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

interface ReferenceSource {
  id: string;
  title: string;
  sourceType: string;
  status: string;
}

interface Complaint {
  id: string;
  referenceNo: string;
  status: string;
}

interface Ticket {
  id: string;
  status: string;
}

interface ActionRequest {
  id: string;
  referenceNo: string;
  status: string;
}

interface ClosureContext {
  ticket: {
    id: string;
    status: string;
  };
  complaint: {
    id: string;
  };
  actionRequest: {
    id: string;
    status: string;
  };
  attachedReferences: Array<{
    id: string;
    referenceSourceId: string;
    usageType: string;
  }>;
}

class SmokeTestRunner {
  private managerToken: string = "";
  private agentToken: string = "";
  private managerUserId: string = "";
  private agentUserId: string = "";
  private referenceId: string = "";
  private complaintId: string = "";
  private ticketId: string = "";
  private actionRequestId: string = "";
  private referenceLinkId: string = "";

  private passed = 0;
  private failed = 0;

  async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok && response.status !== 400 && response.status !== 409) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${text}`,
      );
    }

    return response.json();
  }

  assert(condition: boolean, message: string): void {
    if (condition) {
      console.log(`✅ ${message}`);
      this.passed++;
    } else {
      console.log(`❌ ${message}`);
      this.failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  async loginManager(): Promise<void> {
    console.log("\n📝 Step 1: Login as Manager");
    const response = await this.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "manager1@access.test",
        password: "password123",
      }),
    });

    this.assert(response.success, "Manager login successful");
    this.assert(response.data.user.role === "manager", "User role is manager");
    this.managerToken = response.data.token;
    this.managerUserId = response.data.user.id;
    console.log(`   Manager ID: ${this.managerUserId}`);
  }

  async loginAgent(): Promise<void> {
    console.log("\n📝 Step 2: Login as Agent");
    const response = await this.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "agent1@access.test",
        password: "password123",
      }),
    });

    this.assert(response.success, "Agent login successful");
    this.assert(response.data.user.role === "agent", "User role is agent");
    this.agentToken = response.data.token;
    this.agentUserId = response.data.user.id;
    console.log(`   Agent ID: ${this.agentUserId}`);
  }

  async findOrCreateActiveReference(): Promise<void> {
    console.log("\n📝 Step 3: Find or Create Active Reference");
    
    // Try to find existing active reference
    const searchResponse = await this.fetch<{ items: ReferenceSource[] }>(
      "/references?status=active&limit=1",
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    if (searchResponse.data.items.length > 0) {
      this.referenceId = searchResponse.data.items[0]!.id;
      console.log(`   Found existing reference: ${this.referenceId}`);
      this.assert(true, "Active reference found");
      return;
    }

    // Create new reference
    const createResponse = await this.fetch<{ reference: ReferenceSource }>(
      "/references",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.managerToken}` },
        body: JSON.stringify({
          sourceType: "sop",
          title: "SOP Smoke Test Reference",
          category: "payment",
          content: "This is a test reference for Phase 5 smoke test.",
          status: "active",
        }),
      },
    );

    this.assert(createResponse.success, "Reference created");
    this.referenceId = createResponse.data.reference.id;
    console.log(`   Created reference: ${this.referenceId}`);
  }

  async createComplaintWithHeaAction(): Promise<void> {
    console.log("\n📝 Step 4: Create Complaint with sent_hea_action");
    
    const response = await this.fetch<{
      complaint: Complaint;
      ticket: Ticket;
      quickResponseSession: { id: string };
    }>("/quick-responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.agentToken}` },
      body: JSON.stringify({
        complaint: {
          complaintText:
            "Saldo saya terpotong tapi tiket tidak muncul. Mohon bantuannya.",
          source: "twitter",
          sourceHandle: "@smoketest_user",
          category: "payment",
        },
        response: {
          responseTarget: "public_reply",
          responseTone: "calm",
          selectedHear: "Kami sudah terima keluhan Anda",
          selectedEmpathize: "Kami memahami ini sangat mengganggu",
          selectedApologize: "Mohon maaf atas kendala ini",
          selectedTakeAction: "Tim kami akan segera melakukan pengecekan",
          finalResponse:
            "Terima kasih atas laporannya. Tim kami akan segera melakukan pengecekan dan menghubungi Anda kembali.",
          outcome: "sent_hea_action",
        },
      }),
    });

    this.assert(response.success, "Quick response created");
    this.assert(response.data.ticket !== null, "Ticket created");
    this.complaintId = response.data.complaint.id;
    this.ticketId = response.data.ticket.id;
    console.log(`   Complaint ID: ${this.complaintId}`);
    console.log(`   Ticket ID: ${this.ticketId}`);
  }

  async verifyTicketCreated(): Promise<void> {
    console.log("\n📝 Step 5: Verify Ticket Created");
    
    const response = await this.fetch<{ ticket: Ticket }>(
      `/tickets/${this.ticketId}`,
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );

    this.assert(response.success, "Ticket retrieved");
    this.assert(response.data.ticket.id === this.ticketId, "Ticket ID matches");
    this.assert(
      response.data.ticket.status === "hea_sent",
      "Ticket status is hea_sent",
    );
    console.log(`   Ticket status: ${response.data.ticket.status}`);
  }

  async escalateTicket(): Promise<void> {
    console.log("\n📝 Step 6: Escalate Ticket");
    
    const response = await this.fetch<{
      ticket: Ticket;
      actionRequest: ActionRequest;
      actionRequestReused: boolean;
    }>(`/tickets/${this.ticketId}/escalate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });

    this.assert(response.success, "Ticket escalated");
    this.assert(
      response.data.ticket.status === "waiting_manager_action",
      "Ticket status is waiting_manager_action",
    );
    this.actionRequestId = response.data.actionRequest.id;
    console.log(`   Action Request ID: ${this.actionRequestId}`);
    console.log(`   Action Request Reused: ${response.data.actionRequestReused}`);
  }

  async verifyActionRequestCreated(): Promise<void> {
    console.log("\n📝 Step 7: Verify Action Request Created/Reused");
    
    const response = await this.fetch<{ actionRequest: ActionRequest }>(
      `/action-requests/${this.actionRequestId}`,
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Action request retrieved");
    this.assert(
      response.data.actionRequest.id === this.actionRequestId,
      "Action request ID matches",
    );
    console.log(`   Status: ${response.data.actionRequest.status}`);
  }

  async managerAttachReference(): Promise<void> {
    console.log("\n📝 Step 8: Manager Attach Reference");
    
    const response = await this.fetch<{
      reference: {
        id: string;
        referenceSourceId: string;
        usageType: string;
      };
    }>(`/action-requests/${this.actionRequestId}/references`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.managerToken}` },
      body: JSON.stringify({
        referenceSourceId: this.referenceId,
        usageType: "policy_support",
        note: "Referensi untuk panduan penyelesaian masalah pembayaran",
      }),
    });

    this.assert(response.success, "Reference attached");
    this.assert(
      response.data.reference.referenceSourceId === this.referenceId,
      "Reference source ID matches",
    );
    this.referenceLinkId = response.data.reference.id;
    console.log(`   Reference Link ID: ${this.referenceLinkId}`);
  }

  async verifyReferenceAttached(): Promise<void> {
    console.log("\n📝 Step 9: Verify Reference Attached");
    
    const response = await this.fetch<{
      references: Array<{
        id: string;
        referenceSourceId: string;
        usageType: string;
      }>;
    }>(`/action-requests/${this.actionRequestId}/references`, {
      headers: { Authorization: `Bearer ${this.managerToken}` },
    });

    this.assert(response.success, "References retrieved");
    this.assert(
      response.data.references.length > 0,
      "At least one reference attached",
    );
    this.assert(
      response.data.references[0]?.referenceSourceId === this.referenceId,
      "Correct reference attached",
    );
    console.log(`   Total references: ${response.data.references.length}`);
  }

  async managerTakeAction(): Promise<void> {
    console.log("\n📝 Step 10: Manager Take Action");
    
    const response = await this.fetch<{
      actionRequest: ActionRequest;
      updatedTickets: number;
    }>(`/action-requests/${this.actionRequestId}/take-action`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${this.managerToken}` },
      body: JSON.stringify({
        actionTaken:
          "Tim pembayaran sudah melakukan verifikasi. Refund akan diproses dalam 1x24 jam.",
        closureMessage:
          "Sampaikan kepada pelanggan bahwa refund akan masuk dalam 1x24 jam ke rekening asal.",
      }),
    });

    this.assert(response.success, "Manager action recorded");
    this.assert(
      response.data.actionRequest.status === "action_taken",
      "Action request status is action_taken",
    );
    this.assert(
      response.data.updatedTickets > 0,
      "Linked tickets updated",
    );
    console.log(`   Updated tickets: ${response.data.updatedTickets}`);
  }

  async agentFetchClosureContext(): Promise<void> {
    console.log("\n📝 Step 11: Agent Fetch Closure Context");
    
    const response = await this.fetch<ClosureContext>(
      `/tickets/${this.ticketId}/closure-context`,
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );

    this.assert(response.success, "Closure context retrieved");
    this.assert(
      response.data.ticket.status === "manager_action_done",
      "Ticket status is manager_action_done",
    );
    this.assert(
      response.data.actionRequest.status === "action_taken",
      "Action request status is action_taken",
    );
    this.assert(
      response.data.attachedReferences.length > 0,
      "Attached references present",
    );
    this.assert(
      response.data.attachedReferences[0]?.referenceSourceId === this.referenceId,
      "Correct reference in closure context",
    );
    console.log(
      `   Attached references: ${response.data.attachedReferences.length}`,
    );
  }

  async agentSendFinalClosureWithReferences(): Promise<void> {
    console.log("\n📝 Step 12: Agent Send Final Closure with References");
    
    const response = await this.fetch<{
      complaint: { id: string; status: string; resolvedAt: string | null };
      ticket: { id: string; status: string };
      quickResponseSession: { id: string };
    }>(`/complaints/${this.complaintId}/quick-responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.agentToken}` },
      body: JSON.stringify({
        ticketId: this.ticketId,
        responseTarget: "public_reply",
        responseTone: "calm",
        finalResponse:
          "Terima kasih atas kesabarannya. Refund Anda sudah diproses dan akan masuk dalam 1x24 jam ke rekening asal. Mohon maaf atas ketidaknyamanannya.",
        outcome: "sent_resolved",
        references: [
          {
            referenceSourceId: this.referenceId,
            selectionSource: "manager_attached",
            usageType: "closure_support",
            note: "Menggunakan SOP refund untuk final closure",
          },
        ],
      }),
    });

    this.assert(response.success, "Final closure sent");
    this.assert(
      response.data.complaint.status === "resolved",
      "Complaint status is resolved",
    );
    this.assert(
      response.data.complaint.resolvedAt !== null,
      "Complaint resolved_at set",
    );
    this.assert(
      response.data.ticket.status === "closed",
      "Ticket status is closed",
    );
    console.log(`   Complaint status: ${response.data.complaint.status}`);
    console.log(`   Ticket status: ${response.data.ticket.status}`);
  }

  async verifyComplaintResolved(): Promise<void> {
    console.log("\n📝 Step 13: Verify Complaint Resolved");
    
    const response = await this.fetch<{ complaint: Complaint }>(
      `/complaints/${this.complaintId}`,
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );

    this.assert(response.success, "Complaint retrieved");
    this.assert(
      response.data.complaint.status === "resolved",
      "Complaint status is resolved",
    );
    console.log(`   Final status: ${response.data.complaint.status}`);
  }

  async verifyTicketClosed(): Promise<void> {
    console.log("\n📝 Step 14: Verify Ticket Closed");
    
    const response = await this.fetch<{ ticket: Ticket }>(
      `/tickets/${this.ticketId}`,
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );

    this.assert(response.success, "Ticket retrieved");
    this.assert(
      response.data.ticket.status === "closed",
      "Ticket status is closed",
    );
    console.log(`   Final status: ${response.data.ticket.status}`);
  }

  async run(): Promise<void> {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║       Phase 5 Reference Usage Smoke Test            ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log(`\nTesting against: ${BASE_URL}`);
    console.log(`Started at: ${new Date().toISOString()}\n`);

    try {
      await this.loginManager();
      await this.loginAgent();
      await this.findOrCreateActiveReference();
      await this.createComplaintWithHeaAction();
      await this.verifyTicketCreated();
      await this.escalateTicket();
      await this.verifyActionRequestCreated();
      await this.managerAttachReference();
      await this.verifyReferenceAttached();
      await this.managerTakeAction();
      await this.agentFetchClosureContext();
      await this.agentSendFinalClosureWithReferences();
      await this.verifyComplaintResolved();
      await this.verifyTicketClosed();

      console.log("\n╔══════════════════════════════════════════════════════╗");
      console.log("║                  TEST RESULTS                        ║");
      console.log("╚══════════════════════════════════════════════════════╝");
      console.log(`✅ Passed: ${this.passed}`);
      console.log(`❌ Failed: ${this.failed}`);
      console.log(`\nStatus: ${this.failed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
      console.log(`\nCompleted at: ${new Date().toISOString()}`);

      if (this.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error("\n💥 Test execution failed:");
      console.error(error);
      console.log(`\n✅ Passed: ${this.passed}`);
      console.log(`❌ Failed: ${this.failed + 1}`);
      process.exit(1);
    }
  }
}

// Run smoke test
const runner = new SmokeTestRunner();
runner.run();
