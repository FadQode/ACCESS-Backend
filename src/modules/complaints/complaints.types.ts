import type { Complaint } from "../../db/schema";

export type ComplaintSource = Complaint["source"];
export type ComplaintCategory = Complaint["category"];
export type ComplaintStatus = Complaint["status"];

export interface CreateComplaintInput {
  source?: ComplaintSource;
  sourceHandle?: string | null;
  sourceUrl?: string | null;
  complainerName?: string | null;
  complainerContact?: string | null;
  category: ComplaintCategory;
  complaintText: string;
  socialComplaintId?: string | null;
  status?: ComplaintStatus;
  resolvedAt?: Date | null;
}

export interface UpdateComplaintInput {
  source?: ComplaintSource;
  sourceHandle?: string | null;
  sourceUrl?: string | null;
  complainerName?: string | null;
  complainerContact?: string | null;
  category?: ComplaintCategory;
  complaintText?: string;
}

export interface ComplaintFilters {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  source?: ComplaintSource;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ComplaintListItem {
  id: string;
  referenceNo: string;
  source: ComplaintSource;
  sourceHandle: string | null;
  category: ComplaintCategory;
  complaintText: string;
  status: ComplaintStatus;
  submittedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintDetail extends ComplaintListItem {
  trackingToken: string;
  sourceUrl: string | null;
  complainerName: string | null;
  complainerContact: string | null;
}

export interface ComplaintQuickResponseDetail {
  id: string;
  agent: {
    id: string;
    name: string;
    email: string;
  };
  sourceChannel: ComplaintSource;
  sourceHandle: string | null;
  responseTone: string | null;
  responseTarget: "public_reply" | "dm" | "app_review" | "internal_note";
  selectedHear: string | null;
  selectedEmpathize: string | null;
  selectedApologize: string | null;
  selectedTakeAction: string | null;
  finalResponse: string | null;
  outcome:
    | "sent_resolved"
    | "sent_hea_action"
    | "saved_ticket"
    | "escalated"
    | "copy_only";
  references: Array<{
    id: string;
    referenceSourceId: string;
    selectionSource: string;
    usageType: string;
    snapshotText: string | null;
    note: string | null;
    createdAt: string;
    referenceSource: {
      id: string;
      title: string;
      sourceType: string;
      category: ComplaintCategory | null;
      status: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}
