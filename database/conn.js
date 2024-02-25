import mongoose from "mongoose";

const Connection = async () => {
  try {
    const URL = process.env.MONGODB_URI;
    await mongoose.connect(URL);
    console.log("Database Connected Successfully");
  } catch (error) {
    console.log("Error: ", error.message);
  }
};

export default Connection;