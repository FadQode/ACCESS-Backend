import type { Ticket } from "../../db/schema";
import type { actionRequestReferenceItemSchema } from "../action-requests/action-requests.dto";
import type {
  ComplaintCategory,
  ComplaintStatus,
} from "../complaints/complaints.types";

export type TicketStatus = Ticket["status"];
export type TicketPriority = Ticket["priority"];

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  agentId?: string;
  category?: ComplaintCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTicketInput {
  complaintId: string;
  agentId: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  heaResponse?: string | null;
  heaSentAt?: Date | null;
}

export interface TicketListItem {
  id: string;
  complaintId: string;
  agentId: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: ComplaintCategory;
  complaintStatus: ComplaintStatus;
  complaintText: string;
  referenceNo: string;
  createdAt: string;
  updatedAt: string;
  managerAction: {
    actionRequestId: string;
    actionTaken: string | null;
    closureMessage: string | null;
  } | null;
}

export interface TicketDetail extends TicketListItem {
  heaResponse: string | null;
  heaSentAt: string | null;
  closureMessage: string | null;
  closureSentAt: string | null;
  agent: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface TicketClosureContext {
  actionRequest: {
    actionTaken: string | null;
    closureMessage: string | null;
    clusterLabel: string | null;
    id: string;
    referenceNo: string;
    status: string;
  };
  attachedReferences: Array<typeof actionRequestReferenceItemSchema.static>;
  complaint: {
    category: ComplaintCategory;
    complaintText: string;
    id: string;
    referenceNo: string;
    status: ComplaintStatus;
  };
  ticket: {
    id: string;
    priority: TicketPriority;
    status: TicketStatus;
  };
}
