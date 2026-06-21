import type { QuickResponseSession } from "../../db/schema";
import type {
  ComplaintCategory,
  ComplaintSource,
} from "../complaints/complaints.types";

export type ResponseTarget = QuickResponseSession["responseTarget"];
export type StableQuickResponseOutcome =
  | "sent_resolved"
  | "sent_hea_action"
  | "copy_only";

export interface SaveQuickResponseInput {
  complaint: {
    complaintText: string;
    source?: ComplaintSource;
    sourceHandle?: string | null;
    sourceUrl?: string | null;
    complainerName?: string | null;
    complainerContact?: string | null;
    category: ComplaintCategory;
  };
  response: {
    responseTarget: ResponseTarget;
    responseTone?: string | null;
    selectedHear?: string | null;
    selectedEmpathize?: string | null;
    selectedApologize?: string | null;
    selectedTakeAction?: string | null;
    finalResponse?: string | null;
    outcome: StableQuickResponseOutcome;
  };
}

export interface CreateQuickResponseSessionInput {
  agentId: string;
  complaintId: string;
  ticketId?: string | null;
  sourceChannel: ComplaintSource;
  sourceHandle: string | null;
  responseTone: string | null;
  responseTarget: ResponseTarget;
  selectedHear: string | null;
  selectedEmpathize: string | null;
  selectedApologize: string | null;
  selectedTakeAction: string | null;
  finalResponse: string | null;
  outcome: StableQuickResponseOutcome;
}
