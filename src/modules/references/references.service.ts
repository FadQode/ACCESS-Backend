import type { DatabaseTransactionManager } from "../../db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import {
  normalizeOptionalText,
  normalizeText,
} from "../../shared/utils/normalize-text";
import type { ReferenceUploadFile, SupabaseStorageService } from "../../integrations/supabase/supabase-storage.service";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateReferenceInput,
  CreateTagInput,
  ReferenceDetail,
  ReferenceFilters,
  ReferenceListItem,
  ReferenceTagItem,
  UpdateReferenceInput,
  UploadReferenceInput,
} from "./references.types";
import type {
  ReferenceSourceWithTags,
  ReferencesRepository,
} from "./references.repository";

const iso = (date: Date): string => date.toISOString();

const assertCanReadReferences = (currentUser: AuthUser): void => {
  if (!["agent", "manager", "admin"].includes(currentUser.role)) {
    throw new ForbiddenError(
      "You cannot access references",
      "REFERENCE_READ_FORBIDDEN",
    );
  }
};

const assertCanManageReferences = (currentUser: AuthUser): void => {
  if (currentUser.role !== "manager" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Only managers can manage references",
      "REFERENCE_MANAGE_FORBIDDEN",
    );
  }
};

const normalizeTagName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeTags = (tags: string[] | undefined): string[] => {
  const normalized = (tags ?? [])
    .map(normalizeTagName)
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(normalized));
};

const buildSearchText = (input: {
  category?: string | null;
  content?: string | null;
  fileName?: string | null;
  sourceType: string;
  tags?: string[];
  title: string;
  url?: string | null;
}): string =>
  [
    input.title,
    input.category,
    input.sourceType,
    input.content,
    input.url,
    input.fileName,
    ...(input.tags ?? []),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s:_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toListItem = (reference: ReferenceSourceWithTags): ReferenceListItem => ({
  id: reference.id,
  sourceType: reference.sourceType,
  title: reference.title,
  category: reference.category,
  content: reference.content,
  url: reference.url,
  fileUrl: reference.fileUrl,
  storageProvider: reference.storageProvider,
  storageBucket: reference.storageBucket,
  storageKey: reference.storageKey,
  fileName: reference.fileName,
  fileMimeType: reference.fileMimeType,
  fileSize: reference.fileSize,
  status: reference.status,
  version: reference.version,
  searchText: reference.searchText,
  metadata: reference.metadata ?? null,
  tags: reference.tags,
  createdAt: iso(reference.createdAt),
  updatedAt: iso(reference.updatedAt),
});

const toDetail = (reference: ReferenceSourceWithTags): ReferenceDetail => ({
  ...toListItem(reference),
  createdBy: reference.createdBy,
});

const toTagItem = (
  tag: Awaited<ReturnType<ReferencesRepository["findTags"]>>[number],
): ReferenceTagItem => ({
  id: tag.id,
  name: tag.name,
  createdAt: iso(tag.createdAt),
});

const assertCanAccessReference = (
  reference: ReferenceSourceWithTags,
  currentUser: AuthUser,
): void => {
  if (currentUser.role === "agent" && reference.status !== "active") {
    throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
  }
};

export interface ReferencesService {
  archiveReference(
    id: string,
    currentUser: AuthUser,
  ): Promise<ReferenceDetail>;
  createReference(
    input: CreateReferenceInput,
    currentUser: AuthUser,
  ): Promise<ReferenceDetail>;
  createTag(
    input: CreateTagInput,
    currentUser: AuthUser,
  ): Promise<ReferenceTagItem>;
  getReferenceDetail(
    id: string,
    currentUser: AuthUser,
  ): Promise<ReferenceDetail>;
  getReferenceFileUrl(
    id: string,
    currentUser: AuthUser,
  ): Promise<{ expiresIn: number; signedUrl: string }>;
  listReferences(
    filters: ReferenceFilters,
    currentUser: AuthUser,
  ): Promise<{
    items: ReferenceListItem[];
    pagination: {
      limit: number;
      page: number;
      total: number;
      totalPages: number;
    };
  }>;
  listTags(currentUser: AuthUser): Promise<ReferenceTagItem[]>;
  updateReference(
    id: string,
    input: UpdateReferenceInput,
    currentUser: AuthUser,
  ): Promise<ReferenceDetail>;
  uploadReference(
    input: UploadReferenceInput,
    file: ReferenceUploadFile,
    currentUser: AuthUser,
  ): Promise<ReferenceDetail>;
}

export const createReferencesService = (
  transactionManager: DatabaseTransactionManager,
  repository: ReferencesRepository,
  storageService: SupabaseStorageService,
): ReferencesService => {
  const ensureTags = async (
    tags: string[],
    executor?: Parameters<ReferencesRepository["createTag"]>[1],
  ): Promise<string[]> => {
    const existingTags = await repository.findTagsByNames(tags);
    const existingNames = new Set(existingTags.map((tag) => tag.name));
    const createdTags = [];

    for (const tag of tags) {
      if (!existingNames.has(tag)) {
        createdTags.push(await repository.createTag(tag, executor));
      }
    }

    return [...existingTags, ...createdTags].map((tag) => tag.id);
  };

  const requireReference = async (
    id: string,
    currentUser: AuthUser,
  ): Promise<ReferenceSourceWithTags> => {
    const reference = await repository.findReferenceById(id);

    if (!reference) {
      throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
    }

    assertCanAccessReference(reference, currentUser);
    return reference;
  };

  return {
    async archiveReference(id, currentUser) {
      assertCanManageReferences(currentUser);
      const existing = await repository.findReferenceById(id);

      if (!existing) {
        throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
      }

      await repository.archiveReference(id);
      return this.getReferenceDetail(id, currentUser);
    },

    async createReference(input, currentUser) {
      assertCanManageReferences(currentUser);

      if (input.sourceType === "uploaded_file") {
        throw new BadRequestError(
          "Uploaded file references must use the upload endpoint",
          "REFERENCE_UPLOAD_REQUIRED",
        );
      }

      const title = normalizeText(input.title);
      const content = normalizeOptionalText(input.content);
      const url = normalizeOptionalText(input.url);

      if (input.sourceType === "external_link" && !url) {
        throw new BadRequestError(
          "External link references require a URL",
          "REFERENCE_URL_REQUIRED",
        );
      }

      if (!content && !url) {
        throw new BadRequestError(
          "Reference content or URL is required",
          "REFERENCE_BODY_REQUIRED",
        );
      }

      const tags = normalizeTags(input.tags);
      const searchText = buildSearchText({
        title,
        category: input.category,
        sourceType: input.sourceType,
        content,
        url,
        tags,
      });

      const createdId = await transactionManager.transaction(async (executor) => {
        const reference = await repository.createReferenceSource(
          {
            createdBy: currentUser.id,
            sourceType: input.sourceType,
            title,
            category: input.category ?? null,
            content,
            url,
            status: input.status ?? "active",
            version: input.version ?? "1.0",
            metadata: input.metadata ?? null,
            searchText,
          },
          executor,
        );
        const tagIds = await ensureTags(tags, executor);
        await repository.attachTagsToReference(reference.id, tagIds, executor);
        return reference.id;
      });

      return this.getReferenceDetail(createdId, currentUser);
    },

    async createTag(input, currentUser) {
      assertCanManageReferences(currentUser);
      const name = normalizeTagName(input.name);

      if (!name) {
        throw new BadRequestError("Tag name is required", "REFERENCE_TAG_REQUIRED");
      }

      return toTagItem(await repository.createTag(name));
    },

    async getReferenceDetail(id, currentUser) {
      assertCanReadReferences(currentUser);
      return toDetail(await requireReference(id, currentUser));
    },

    async getReferenceFileUrl(id, currentUser) {
      assertCanReadReferences(currentUser);
      const reference = await requireReference(id, currentUser);

      if (
        reference.sourceType !== "uploaded_file" ||
        reference.storageProvider !== "supabase" ||
        !reference.storageKey
      ) {
        throw new BadRequestError(
          "Reference does not have a private Supabase file",
          "REFERENCE_FILE_URL_UNAVAILABLE",
        );
      }

      return storageService.createReferenceSignedUrl(reference.storageKey);
    },

    async listReferences(filters, currentUser) {
      assertCanReadReferences(currentUser);
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const scopedFilters =
        currentUser.role === "agent"
          ? { ...filters, status: "active" as const }
          : filters;

      const result = await repository.findReferences({
        ...scopedFilters,
        tag: scopedFilters.tag ? normalizeTagName(scopedFilters.tag) : undefined,
        page,
        limit,
      });

      return {
        items: result.items.map(toListItem),
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      };
    },

    async listTags(currentUser) {
      assertCanReadReferences(currentUser);
      return (await repository.findTags()).map(toTagItem);
    },

    async updateReference(id, input, currentUser) {
      assertCanManageReferences(currentUser);
      const existing = await repository.findReferenceById(id);

      if (!existing) {
        throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
      }

      const title =
        input.title === undefined ? existing.title : normalizeText(input.title);
      const content =
        input.content === undefined
          ? existing.content
          : normalizeOptionalText(input.content);
      const url =
        input.url === undefined ? existing.url : normalizeOptionalText(input.url);
      const category =
        input.category === undefined ? existing.category : input.category;
      const tags =
        input.tags === undefined ? existing.tags : normalizeTags(input.tags);
      const sourceType = existing.sourceType;

      if (sourceType === "external_link" && !url) {
        throw new BadRequestError(
          "External link references require a URL",
          "REFERENCE_URL_REQUIRED",
        );
      }

      if (sourceType !== "uploaded_file" && !content && !url) {
        throw new BadRequestError(
          "Reference content or URL is required",
          "REFERENCE_BODY_REQUIRED",
        );
      }

      const searchText = buildSearchText({
        title,
        category,
        sourceType,
        content,
        url,
        fileName: existing.fileName,
        tags,
      });

      await transactionManager.transaction(async (executor) => {
        const updated = await repository.updateReference(
          id,
          {
            ...(input.title === undefined ? {} : { title }),
            ...(input.category === undefined ? {} : { category }),
            ...(input.content === undefined ? {} : { content }),
            ...(input.url === undefined ? {} : { url }),
            ...(input.status === undefined ? {} : { status: input.status }),
            ...(input.version === undefined ? {} : { version: input.version }),
            ...(input.metadata === undefined
              ? {}
              : { metadata: input.metadata }),
            searchText,
          },
          executor,
        );

        if (!updated) {
          throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
        }

        if (input.tags !== undefined) {
          const tagIds = await ensureTags(tags, executor);
          await repository.replaceReferenceTags(id, tagIds, executor);
        }
      });

      return this.getReferenceDetail(id, currentUser);
    },

    async uploadReference(input, file, currentUser) {
      assertCanManageReferences(currentUser);
      const title = normalizeText(input.title);
      const content = normalizeOptionalText(input.content);
      const tags = normalizeTags(input.tags);
      const uploadedFile = await storageService.uploadReferenceFile(file);
      const searchText = buildSearchText({
        title,
        category: input.category,
        sourceType: "uploaded_file",
        content,
        fileName: uploadedFile.fileName,
        tags,
      });

      try {
        const createdId = await transactionManager.transaction(
          async (executor) => {
            const reference = await repository.createReferenceSource(
              {
                createdBy: currentUser.id,
                sourceType: "uploaded_file",
                title,
                category: input.category ?? null,
                content,
                status: input.status ?? "active",
                version: input.version ?? "1.0",
                metadata: input.metadata ?? null,
                searchText,
                ...uploadedFile,
              },
              executor,
            );
            const tagIds = await ensureTags(tags, executor);
            await repository.attachTagsToReference(reference.id, tagIds, executor);
            return reference.id;
          },
        );

        return this.getReferenceDetail(createdId, currentUser);
      } catch (error) {
        try {
          await storageService.deleteReferenceFile(uploadedFile.storageKey);
        } catch (cleanupError) {
          console.error("[references] Failed to cleanup uploaded file", {
            storageKey: uploadedFile.storageKey,
            error: cleanupError,
          });
        }

        throw error;
      }
    },
  };
};
