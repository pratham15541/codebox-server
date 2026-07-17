import mongoose from "mongoose";

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    codeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserCode",
      index: true,
    },
    title: {
      type: String,
      default: "Code explanation chat",
    },
    language: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionSchema);
