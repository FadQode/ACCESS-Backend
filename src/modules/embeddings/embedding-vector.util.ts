export const assertEmbeddingDimension = (
  embedding: number[],
  expectedDimension: number,
): void => {
  if (embedding.length !== expectedDimension) {
    throw new Error(
      `Embedding dimension must be ${expectedDimension}, received ${embedding.length}`,
    );
  }

  if (!embedding.every((value) => Number.isFinite(value))) {
    throw new Error("Embedding must contain only finite numbers");
  }
};

export const toPgVectorLiteral = (embedding: number[]): string =>
  `[${embedding.join(",")}]`;

export const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};
