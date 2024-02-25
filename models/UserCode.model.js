import mongoose from "mongoose";

export const UserCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
    },
    codeLanguage: {
      type:String,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    username: {
      type: String,
      ref: "User"
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model.UserCodes || mongoose.model("UserCode", UserCodeSchema);
