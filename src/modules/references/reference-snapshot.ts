import type { ReferenceSourceWithTags } from "./references.repository";

export const buildReferenceSnapshotText = (
  reference: Pick<
    ReferenceSourceWithTags,
    "content" | "fileName" | "sourceType" | "title" | "url"
  >,
): string => {
  const detail =
    reference.content ??
    reference.url ??
    reference.fileName ??
    reference.sourceType;
  const snapshot = [reference.title, detail]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" - ")
    .replace(/\s+/g, " ")
    .trim();

  return snapshot.length > 500 ? `${snapshot.slice(0, 497)}...` : snapshot;
};
