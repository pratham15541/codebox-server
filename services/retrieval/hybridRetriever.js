import { Document } from "@langchain/core/documents";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { getVectorStore } from "../pineconeStore.js";
import { createChatModel, RETRIEVAL_TOP_K, RERANK_TOP_K } from "../ai/config.js";

function reciprocalRankFusion(resultLists, k = 60) {
  const scores = new Map();

  for (const results of resultLists) {
    results.forEach((doc, rank) => {
      const id = doc.metadata?.pineconeId || doc.pageContent.slice(0, 80);
      const current = scores.get(id) || { doc, score: 0 };
      current.score += 1 / (k + rank + 1);
      scores.set(id, current);
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ doc, score }) => ({ doc, score, source: "hybrid" }));
}

async function vectorSearch(query, codeId, topK) {
  const store = await getVectorStore();
  const filter = codeId ? { codeId: String(codeId) } : undefined;

  const results = await store.similaritySearchWithScore(query, topK, filter);

  return results.map(([doc, score]) => ({
    doc,
    score,
    source: "vector",
  }));
}

async function bm25Search(query, documents, topK) {
  if (!documents.length) return [];

  const retriever = BM25Retriever.fromDocuments(documents, { k: topK });
  const results = await retriever.invoke(query);

  return results.map((doc, index) => ({
    doc,
    score: 1 / (index + 1),
    source: "bm25",
  }));
}

async function llmRerank(query, candidates) {
  if (candidates.length <= 1) return candidates;

  const model = createChatModel();
  const snippetList = candidates
    .map(
      (item, i) =>
        `[${i}] (${item.doc.metadata?.symbolName || "snippet"}, lines ${item.doc.metadata?.startLine}-${item.doc.metadata?.endLine})\n${item.doc.pageContent.slice(0, 400)}`
    )
    .join("\n\n");

  const prompt = `You are a code retrieval reranker. Given a user question and code snippets, return ONLY a JSON array of snippet indices ordered from most to least relevant.

Question: ${query}

Snippets:
${snippetList}

Return format: [0, 2, 1]`;

  try {
    const response = await model.invoke(prompt);
    const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const match = text.match(/\[[\d,\s]+\]/);

    if (!match) return candidates.slice(0, RERANK_TOP_K);

    const order = JSON.parse(match[0]);
    const reranked = order
      .filter((idx) => Number.isInteger(idx) && candidates[idx])
      .map((idx, rank) => ({
        ...candidates[idx],
        score: 1 - rank * 0.1,
        source: "rerank",
      }));

    return reranked.length ? reranked.slice(0, RERANK_TOP_K) : candidates.slice(0, RERANK_TOP_K);
  } catch {
    return candidates.slice(0, RERANK_TOP_K);
  }
}

/**
 * Hybrid retrieval pipeline: BM25 + dense vector search, fused with RRF, then LLM reranking.
 */
export async function hybridRetrieve({ query, codeId, chunkDocuments, topK = RETRIEVAL_TOP_K }) {
  const [vectorResults, bm25Results] = await Promise.all([
    vectorSearch(query, codeId, topK),
    bm25Search(query, chunkDocuments, topK),
  ]);

  const fused = reciprocalRankFusion([
    vectorResults.map((r) => r.doc),
    bm25Results.map((r) => r.doc),
  ]);

  const candidateMap = new Map();
  for (const item of [...vectorResults, ...bm25Results, ...fused]) {
    const id = item.doc?.metadata?.pineconeId || item.doc?.pageContent;
    if (!candidateMap.has(id)) {
      candidateMap.set(id, item);
    }
  }

  const candidates = [...candidateMap.values()].slice(0, topK * 2);
  const reranked = await llmRerank(query, candidates);

  return reranked;
}

export function chunksToDocuments(chunks) {
  return chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.content,
        metadata: {
          chunkId: String(chunk._id),
          codeId: String(chunk.codeId),
          pineconeId: chunk.pineconeId,
          chunkIndex: chunk.chunkIndex,
          language: chunk.language,
          chunkType: chunk.chunkType,
          symbolName: chunk.symbolName || "",
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        },
      })
  );
}
