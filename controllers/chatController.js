import CodeChunk from "../models/CodeChunk.model.js";
import ChatSession from "../models/ChatSession.model.js";
import ChatMessage from "../models/ChatMessage.model.js";
import UserCodeModel from "../models/UserCode.model.js";
import { indexCodeForRetrieval } from "../services/indexing.js";
import {
  hybridRetrieve,
  chunksToDocuments,
} from "../services/retrieval/hybridRetriever.js";
import { runCodeExplanationChain } from "../services/chat/chain.js";

async function getOrCreateSession({ sessionId, userId, codeId, language, title }) {
  if (sessionId) {
    const existing = await ChatSession.findOne({ _id: sessionId, userId });
    if (existing) return existing;
  }

  return ChatSession.create({
    userId,
    codeId,
    language,
    title: title || "Code explanation chat",
  });
}

export async function indexCode(req, res) {
  try {
    const { codeId } = req.body;
    const userId = req.user.userId;

    if (!codeId) {
      return res.status(400).json({ error: "codeId is required" });
    }

    const savedChunks = await indexCodeForRetrieval(codeId, userId);

    res.status(201).json({
      message: "Code indexed successfully",
      codeId,
      chunkCount: savedChunks.length,
      chunks: savedChunks.map((c) => ({
        id: c._id,
        chunkIndex: c.chunkIndex,
        chunkType: c.chunkType,
        symbolName: c.symbolName,
        startLine: c.startLine,
        endLine: c.endLine,
      })),
    });
  } catch (error) {
    console.error("indexCode error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function chat(req, res) {
  try {
    const { message, codeId, sessionId, codeSnippet, language } = req.body;
    const userId = req.user.userId;

    if (!message?.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    let resolvedLanguage = language;
    let chunkDocs = [];

    if (codeId) {
      const userCode = await UserCodeModel.findById(codeId);
      resolvedLanguage = resolvedLanguage || userCode?.codeLanguage;

      const dbChunks = await CodeChunk.find({ codeId }).sort({ chunkIndex: 1 });
      chunkDocs = chunksToDocuments(dbChunks);

      if (!dbChunks.length && userCode?.code) {
        await indexCodeForRetrieval(codeId, userId);
        const refreshed = await CodeChunk.find({ codeId }).sort({ chunkIndex: 1 });
        chunkDocs = chunksToDocuments(refreshed);
      }
    }

    const session = await getOrCreateSession({
      sessionId,
      userId,
      codeId,
      language: resolvedLanguage,
      title: message.slice(0, 80),
    });

    const priorMessages = await ChatMessage.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .limit(20);

    await ChatMessage.create({
      sessionId: session._id,
      role: "user",
      content: message,
    });

    const retrievedChunks = codeId
      ? await hybridRetrieve({
          query: message,
          codeId,
          chunkDocuments: chunkDocs,
        })
      : [];

    const answer = await runCodeExplanationChain({
      question: message,
      retrievedChunks,
      history: priorMessages,
      language: resolvedLanguage,
      codeSnippet,
    });

    const assistantMessage = await ChatMessage.create({
      sessionId: session._id,
      role: "assistant",
      content: answer,
      retrievedChunks: retrievedChunks.map((item) => ({
        chunkId: item.doc.metadata?.chunkId,
        score: item.score,
        source: item.source,
      })),
      metadata: {
        model: process.env.AI_MODEL,
      },
    });

    res.status(200).json({
      sessionId: session._id,
      answer,
      messageId: assistantMessage._id,
      retrievedChunks: retrievedChunks.map((item) => ({
        content: item.doc.pageContent,
        score: item.score,
        source: item.source,
        metadata: item.doc.metadata,
      })),
    });
  } catch (error) {
    console.error("chat error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getChatSessions(req, res) {
  try {
    const userId = req.user.userId;
    const sessions = await ChatSession.find({ userId, isActive: true })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getChatMessages(req, res) {
  try {
    const { sessionId } = req.query;
    const userId = req.user.userId;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 });

    res.status(200).json({ session, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCodeChunks(req, res) {
  try {
    const { codeId } = req.query;

    if (!codeId) {
      return res.status(400).json({ error: "codeId is required" });
    }

    const chunks = await CodeChunk.find({ codeId }).sort({ chunkIndex: 1 });
    res.status(200).json({ chunks, count: chunks.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
