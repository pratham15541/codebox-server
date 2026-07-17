import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").trim();

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: process.env.AI_API_KEY,
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    configuration: { baseURL: baseUrl },
  });
}

export function createChatModel() {
  return new ChatOpenAI({
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    configuration: { baseURL: baseUrl },
  });
}

export const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 800;
export const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP) || 120;
export const RETRIEVAL_TOP_K = Number(process.env.RETRIEVAL_TOP_K) || 6;
export const RERANK_TOP_K = Number(process.env.RERANK_TOP_K) || 4;
