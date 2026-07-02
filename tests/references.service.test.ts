import { describe, expect, test } from "bun:test";

import type { DatabaseTransactionManager } from "../src/db";
import type { ReferenceUploadFile, SupabaseStorageService } from "../src/integrations/supabase/supabase-storage.service";
import type { AuthUser } from "../src/modules/auth/auth.types";
import {
  createReferencesService,
  type ReferencesService,
} from "../src/modules/references/references.service";
import type {
  ReferenceSourceWithTags,
  ReferencesRepository,
} from "../src/modules/references/references.repository";

const now = new Date("2026-07-02T00:00:00.000Z");

const manager: AuthUser = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Manager",
  email: "manager@example.test",
  role: "manager",
};

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent",
  email: "agent@example.test",
  role: "agent",
};

const activeReference: ReferenceSourceWithTags = {
  id: "00000000-0000-4000-8006-000000000001",
  createdBy: manager.id,
  sourceType: "sop",
  title: "SOP Refund",
  category: "refund",
  content: "Refund handling steps",
  url: null,
  fileUrl: null,
  storageProvider: null,
  storageBucket: null,
  storageKey: null,
  fileName: null,
  fileMimeType: null,
  fileSize: null,
  status: "active",
  version: "1.0",
  searchText: "sop refund",
  metadata: null,
  createdAt: now,
  updatedAt: now,
  tags: ["refund"],
};

const archivedReference: ReferenceSourceWithTags = {
  ...activeReference,
  id: "00000000-0000-4000-8006-000000000002",
  status: "archived",
};

const legacyFileReference: ReferenceSourceWithTags = {
  ...activeReference,
  id: "00000000-0000-4000-8006-000000000003",
  sourceType: "uploaded_file",
  fileUrl: "https://files.example.test/reference.pdf",
};

const supabaseFileReference: ReferenceSourceWithTags = {
  ...activeReference,
  id: "00000000-0000-4000-8006-000000000004",
  sourceType: "uploaded_file",
  storageProvider: "supabase",
  storageBucket: "references_storage",
  storageKey: "references/2026/07/file.pdf",
  fileName: "file.pdf",
  fileMimeType: "application/pdf",
  fileSize: 128,
};

const transactionManager: DatabaseTransactionManager = {
  transaction: (callback) => callback({} as never),
};

const createRepository = (
  overrides: Partial<ReferencesRepository> = {},
): ReferencesRepository =>
  ({
    async archiveReference() {
      return activeReference;
    },
    async attachTagsToReference() {},
    async createReferenceSource() {
      return activeReference;
    },
    async createTag(name: string) {
      return {
        id: `tag-${name}`,
        name,
        createdAt: now,
      };
    },
    async findReferenceById() {
      return activeReference;
    },
    async findReferences() {
      return { items: [activeReference], total: 1 };
    },
    async findTags() {
      return [];
    },
    async findTagsByNames() {
      return [];
    },
    async replaceReferenceTags() {},
    async updateReference() {
      return activeReference;
    },
    ...overrides,
  }) as ReferencesRepository;

const createStorage = (
  overrides: Partial<SupabaseStorageService> = {},
): SupabaseStorageService => ({
  async createReferenceSignedUrl() {
    return { signedUrl: "https://signed.example.test", expiresIn: 3600 };
  },
  async deleteReferenceFile() {},
  async uploadReferenceFile() {
    return {
      storageProvider: "supabase",
      storageBucket: "references_storage",
      storageKey: "references/2026/07/file.txt",
      fileName: "file.txt",
      fileMimeType: "text/plain",
      fileSize: 12,
    };
  },
  ...overrides,
});

const createFile = (): ReferenceUploadFile => ({
  name: "file.txt",
  size: 12,
  type: "text/plain",
  async arrayBuffer() {
    return new ArrayBuffer(12);
  },
});

describe("references service", () => {
  test("rejects uploaded_file creation outside the upload endpoint", async () => {
    const service = createReferencesService(
      transactionManager,
      createRepository(),
      createStorage(),
    );

    await expect(
      service.createReference(
        {
          sourceType: "uploaded_file" as never,
          title: "File metadata only",
          content: "metadata",
        },
        manager,
      ),
    ).rejects.toThrow("Uploaded file references must use the upload endpoint");
  });

  test("forces agents to list only active references", async () => {
    let receivedStatus: string | undefined;
    const service = createReferencesService(
      transactionManager,
      createRepository({
        async findReferences(filters) {
          receivedStatus = filters.status;
          return { items: [activeReference], total: 1 };
        },
      }),
      createStorage(),
    );

    await service.listReferences({ status: "archived" }, agent);

    expect(receivedStatus).toBe("active");
  });

  test("returns 404 when an agent reads an archived reference", async () => {
    const service = createReferencesService(
      transactionManager,
      createRepository({
        async findReferenceById() {
          return archivedReference;
        },
      }),
      createStorage(),
    );

    await expect(
      service.getReferenceDetail(archivedReference.id, agent),
    ).rejects.toThrow("Reference not found");
  });

  test("does not create a signed URL from legacy fileUrl metadata", async () => {
    let signedUrlCalled = false;
    const service = createReferencesService(
      transactionManager,
      createRepository({
        async findReferenceById() {
          return legacyFileReference;
        },
      }),
      createStorage({
        async createReferenceSignedUrl() {
          signedUrlCalled = true;
          return { signedUrl: "https://signed.example.test", expiresIn: 3600 };
        },
      }),
    );

    await expect(
      service.getReferenceFileUrl(legacyFileReference.id, manager),
    ).rejects.toThrow("Reference does not have a private Supabase file");
    expect(signedUrlCalled).toBe(false);
  });

  test("creates a signed URL for Supabase file references", async () => {
    const service = createReferencesService(
      transactionManager,
      createRepository({
        async findReferenceById() {
          return supabaseFileReference;
        },
      }),
      createStorage(),
    );

    await expect(
      service.getReferenceFileUrl(supabaseFileReference.id, manager),
    ).resolves.toEqual({
      signedUrl: "https://signed.example.test",
      expiresIn: 3600,
    });
  });

  test("cleans up an uploaded file when DB insert fails", async () => {
    const cleanupKeys: string[] = [];
    const service = createReferencesService(
      transactionManager,
      createRepository({
        async createReferenceSource() {
          throw new Error("insert failed");
        },
      }),
      createStorage({
        async deleteReferenceFile(storageKey) {
          cleanupKeys.push(storageKey);
        },
      }),
    );

    await expect(
      service.uploadReference(
        {
          title: "Uploaded File",
          content: "File notes",
          tags: ["payment"],
        },
        createFile(),
        manager,
      ),
    ).rejects.toThrow("insert failed");
    expect(cleanupKeys).toEqual(["references/2026/07/file.txt"]);
  });
});
