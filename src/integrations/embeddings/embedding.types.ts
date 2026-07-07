export type EmbeddingFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface EmbeddingHealthResponse {
  dimension: number;
  model: string;
  status: string;
}

export interface EmbedInput {
  text: string;
}

export interface EmbedResponse {
  dimension: number;
  embedding: number[];
  model: string;
  textLength?: number;
}

export interface EmbedBatchInput {
  texts: string[];
}

export interface EmbedBatchResponse {
  dimension: number;
  embeddings: number[][];
  model: string;
}

export interface EmbeddingClient {
  embed(input: EmbedInput): Promise<EmbedResponse>;
  embedBatch(input: EmbedBatchInput): Promise<EmbedBatchResponse>;
  health(): Promise<EmbeddingHealthResponse>;
}
