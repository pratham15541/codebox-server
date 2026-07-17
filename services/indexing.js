import crypto from "crypto";
import CodeChunk from "../models/CodeChunk.model.js";
import UserCodeModel from "../models/UserCode.model.js";
import { chunkCode } from "./chunking.js";
import {
  ensurePineconeIndex,
  upsertChunksToPinecone,
  deleteCodeFromPinecone,
} from "./pineconeStore.js";

export async function indexCodeForRetrieval(codeId, userId) {
  const userCode = await UserCodeModel.findOne({ _id: codeId, isDeleted: false });
  if (!userCode) {
    throw new Error("Code not found");
  }

  await ensurePineconeIndex();
  await deleteCodeFromPinecone(codeId);
  await CodeChunk.deleteMany({ codeId });

  const chunks = chunkCode(userCode.code, userCode.codeLanguage || "javascript");
  if (!chunks.length) {
    throw new Error("No chunks produced from code");
  }

  const chunkRecords = chunks.map((chunk) => ({
    codeId,
    userId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    language: userCode.codeLanguage || chunk.language,
    chunkType: chunk.chunkType,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    symbolName: chunk.symbolName,
    pineconeId: `${codeId}-${chunk.chunkIndex}-${crypto.randomBytes(4).toString("hex")}`,
    tokenCount: chunk.tokenCount,
    isIndexed: false,
  }));

  const savedChunks = await CodeChunk.insertMany(chunkRecords);
  await upsertChunksToPinecone(savedChunks);
  await CodeChunk.updateMany({ codeId }, { isIndexed: true });

  return savedChunks;
}
