import mongoose from "mongoose";

export const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please provide unique Username"],
      unique: [true, "Username Exist"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      unique: false,
    },
    email: {
      type: String,
      required: [true, "Please provide a unique email"],
      unique: true,
    },
    firstName: { type: String },
    lastName: { type: String },
    mobileNumber: { type: Number },
    profile: { type: String },
    isDeleted: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model.Users || mongoose.model("User", UserSchema);
