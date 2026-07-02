import type { SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config/env";
import { BadRequestError, ServiceUnavailableError } from "../../shared/errors";
import { createSupabaseClient } from "./supabase.client";

const allowedReferenceMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const sanitizeFileName = (fileName: string): string => {
  const normalized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "reference-file";
};

const buildStorageKey = (fileName: string, date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `references/${year}/${month}/${crypto.randomUUID()}-${sanitizeFileName(
    fileName,
  )}`;
};

const assertConfigured = (config: SupabaseConfig): void => {
  if (!config.url || !config.serviceRoleKey) {
    throw new ServiceUnavailableError(
      "Storage is not configured",
      "STORAGE_NOT_CONFIGURED",
    );
  }
};

export interface ReferenceUploadFile {
  arrayBuffer(): Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
}

export interface UploadedReferenceFileMetadata {
  fileMimeType: string;
  fileName: string;
  fileSize: number;
  storageBucket: string;
  storageKey: string;
  storageProvider: "supabase";
}

export interface SupabaseStorageService {
  createReferenceSignedUrl(storageKey: string): Promise<{
    expiresIn: number;
    signedUrl: string;
  }>;
  deleteReferenceFile(storageKey: string): Promise<void>;
  uploadReferenceFile(
    file: ReferenceUploadFile,
  ): Promise<UploadedReferenceFileMetadata>;
}

export const createSupabaseStorageService = (
  config: SupabaseConfig,
  clientFactory: (config: SupabaseConfig) => SupabaseClient = createSupabaseClient,
): SupabaseStorageService => {
  const getClient = () => {
    assertConfigured(config);
    return clientFactory(config);
  };

  return {
    async uploadReferenceFile(file) {
      if (!file) {
        throw new BadRequestError("File is required", "REFERENCE_FILE_REQUIRED");
      }

      if (!allowedReferenceMimeTypes.has(file.type)) {
        throw new BadRequestError(
          "Unsupported reference file type",
          "REFERENCE_FILE_TYPE_UNSUPPORTED",
        );
      }

      const maxBytes = config.referenceMaxFileSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new BadRequestError(
          `Reference file must be ${config.referenceMaxFileSizeMb}MB or smaller`,
          "REFERENCE_FILE_TOO_LARGE",
        );
      }

      const storageKey = buildStorageKey(file.name);
      const client = getClient();
      const { error } = await client.storage
        .from(config.referenceBucket)
        .upload(storageKey, await file.arrayBuffer(), {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        throw new ServiceUnavailableError(
          "Reference file upload failed",
          "REFERENCE_FILE_UPLOAD_FAILED",
          { reason: error.message },
        );
      }

      return {
        storageProvider: "supabase",
        storageBucket: config.referenceBucket,
        storageKey,
        fileName: file.name,
        fileMimeType: file.type,
        fileSize: file.size,
      };
    },

    async createReferenceSignedUrl(storageKey) {
      const client = getClient();
      const { data, error } = await client.storage
        .from(config.referenceBucket)
        .createSignedUrl(storageKey, config.signedUrlExpiresSeconds);

      if (error || !data?.signedUrl) {
        throw new ServiceUnavailableError(
          "Reference signed URL creation failed",
          "REFERENCE_SIGNED_URL_FAILED",
          { reason: error?.message },
        );
      }

      return {
        signedUrl: data.signedUrl,
        expiresIn: config.signedUrlExpiresSeconds,
      };
    },

    async deleteReferenceFile(storageKey) {
      const client = getClient();
      const { error } = await client.storage
        .from(config.referenceBucket)
        .remove([storageKey]);

      if (error) {
        throw new ServiceUnavailableError(
          "Reference file cleanup failed",
          "REFERENCE_FILE_CLEANUP_FAILED",
          { reason: error.message },
        );
      }
    },
  };
};
