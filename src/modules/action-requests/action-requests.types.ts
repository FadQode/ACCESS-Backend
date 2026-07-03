import type {
  ActionRequest,
  ActionRequestComplaint,
  ActionRequestReference,
  ReferenceSource,
} from "../../db/schema";
import type { ComplaintCategory } from "../complaints/complaints.types";

export type ActionRequestStatus = ActionRequest["status"];

export interface CreateActionRequestInput {
  referenceNo: string;
  category: ComplaintCategory;
  issueKey: string;
  groupingKey: string;
  clusterLabel: string;
  issueSummary: string;
  managerId?: string | null;
}

export interface ActionRequestFilters {
  status?: ActionRequestStatus;
  category?: ComplaintCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ActionRequestLinkInput {
  actionRequestId: string;
  complaintId: string;
  ticketId: string | null;
  agentId: string | null;
}

export interface ActionRequestListItem {
  id: string;
  referenceNo: string;
  category: ComplaintCategory;
  issueKey: string;
  groupingKey: string;
  clusterLabel: string | null;
  status: ActionRequestStatus;
  issueSummary: string;
  raisedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionRequestDetail extends ActionRequestListItem {
  actionTaken: string | null;
  closureMessage: string | null;
  linkedComplaints: Array<{
    id: ActionRequestComplaint["id"];
    actionRequestId: ActionRequestComplaint["actionRequestId"];
    complaintId: ActionRequestComplaint["complaintId"];
    ticketId: ActionRequestComplaint["ticketId"];
    agentId: ActionRequestComplaint["agentId"];
    linkedAt: string;
    complaintText: string;
    ticketStatus: string | null;
  }>;
  references: Array<{
    id: ActionRequestReference["id"];
    actionRequestId: ActionRequestReference["actionRequestId"];
    referenceSourceId: ActionRequestReference["referenceSourceId"];
    usageType: ActionRequestReference["usageType"];
    snapshotText: ActionRequestReference["snapshotText"];
    note: ActionRequestReference["note"];
    createdAt: string;
    attachedBy: {
      id: string;
      name: string;
      email: string;
    };
    referenceSource: Pick<
      ReferenceSource,
      | "category"
      | "content"
      | "fileMimeType"
      | "fileName"
      | "fileSize"
      | "fileUrl"
      | "id"
      | "sourceType"
      | "status"
      | "storageKey"
      | "storageProvider"
      | "title"
      | "url"
    >;
  }>;
}

export interface TakeActionInput {
  actionTaken: string;
  closureMessage: string;
}
