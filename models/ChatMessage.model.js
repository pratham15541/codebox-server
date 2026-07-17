import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    retrievedChunks: [
      {
        chunkId: { type: mongoose.Schema.Types.ObjectId, ref: "CodeChunk" },
        score: Number,
        source: { type: String, enum: ["bm25", "vector", "hybrid", "rerank"] },
      },
    ],
    metadata: {
      model: String,
      tokensUsed: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageSchema);
