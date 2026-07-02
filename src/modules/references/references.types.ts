import type { ReferenceSource, ReferenceTag } from "../../db/schema";
import type { ComplaintCategory } from "../complaints/complaints.types";

export type ReferenceSourceType = ReferenceSource["sourceType"];
export type ReferenceStatus = ReferenceSource["status"];

export interface ReferenceFilters {
  category?: ComplaintCategory;
  limit?: number;
  page?: number;
  query?: string;
  sourceType?: ReferenceSourceType;
  status?: ReferenceStatus;
  tag?: string;
}

export interface CreateReferenceInput {
  category?: ComplaintCategory | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  sourceType: ReferenceSourceType;
  status?: ReferenceStatus;
  tags?: string[];
  title: string;
  url?: string | null;
  version?: string;
}

export interface UploadReferenceInput {
  category?: ComplaintCategory | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: ReferenceStatus;
  tags?: string[];
  title: string;
  version?: string;
}

export interface UpdateReferenceInput {
  category?: ComplaintCategory | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: ReferenceStatus;
  tags?: string[];
  title?: string;
  url?: string | null;
  version?: string;
}

export interface CreateTagInput {
  name: string;
}

export interface ReferenceListItem {
  category: ComplaintCategory | null;
  content: string | null;
  createdAt: string;
  fileMimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  searchText: string | null;
  sourceType: ReferenceSourceType;
  status: ReferenceStatus;
  storageBucket: string | null;
  storageKey: string | null;
  storageProvider: string | null;
  tags: string[];
  title: string;
  updatedAt: string;
  url: string | null;
  version: string;
}

export interface ReferenceDetail extends ReferenceListItem {
  createdBy: string;
}

export interface ReferenceTagItem {
  createdAt: string;
  id: ReferenceTag["id"];
  name: string;
}
