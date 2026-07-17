import mongoose from "mongoose";

const CodeChunkSchema = new mongoose.Schema(
  {
    codeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserCode",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "javascript",
    },
    chunkType: {
      type: String,
      enum: ["function", "class", "import", "block", "line"],
      default: "block",
    },
    startLine: Number,
    endLine: Number,
    symbolName: String,
    pineconeId: {
      type: String,
      required: true,
      unique: true,
    },
    tokenCount: Number,
    isIndexed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

CodeChunkSchema.index({ codeId: 1, chunkIndex: 1 }, { unique: true });

export default mongoose.models.CodeChunk ||
  mongoose.model("CodeChunk", CodeChunkSchema);
