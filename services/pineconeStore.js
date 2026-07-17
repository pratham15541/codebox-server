import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { createEmbeddings } from "./ai/config.js";

let pineconeClient = null;
let vectorStore = null;

export function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

export async function getVectorStore() {
  if (vectorStore) return vectorStore;

  const indexName = process.env.PINECONE_INDEX || "codebox-code-chunks";
  const pinecone = getPineconeClient();
  const pineconeIndex = pinecone.index(indexName);
  const embeddings = createEmbeddings();

  vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    textKey: "content",
  });

  return vectorStore;
}

export async function ensurePineconeIndex() {
  const pinecone = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || "codebox-code-chunks";
  const dimension = Number(process.env.EMBEDDING_DIMENSION) || 1536;

  const indexes = await pinecone.listIndexes();
  const exists = indexes.indexes?.some((idx) => idx.name === indexName);

  if (!exists) {
    await pinecone.createIndex({
      name: indexName,
      dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: process.env.PINECONE_CLOUD || "aws",
          region: process.env.PINECONE_REGION || "us-east-1",
        },
      },
    });

    // Wait briefly for index to become ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return indexName;
}

export async function upsertChunksToPinecone(chunks) {
  const store = await getVectorStore();
  const documents = chunks.map((chunk) => ({
    pageContent: chunk.content,
    metadata: {
      codeId: String(chunk.codeId),
      userId: String(chunk.userId),
      chunkIndex: chunk.chunkIndex,
      language: chunk.language,
      chunkType: chunk.chunkType,
      symbolName: chunk.symbolName || "",
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      pineconeId: chunk.pineconeId,
    },
  }));

  await store.addDocuments(documents, chunks.map((c) => c.pineconeId));
}

export async function deleteCodeFromPinecone(codeId) {
  const store = await getVectorStore();
  await store.delete({ filter: { codeId: String(codeId) } });
}
