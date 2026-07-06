export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CreateChatCompletionInput {
  messages: AiChatMessage[];
}

export interface AiChatClient {
  createChatCompletion(input: CreateChatCompletionInput): Promise<string>;
}

export type AiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
