import mongoose from "mongoose";

function maskUri(uri) {
  return uri.replace(/\/\/([^:/]+):([^@]+)@/, "//$1:****@");
}

function buildMongoUri() {
  const directUri = process.env.MONGODB_URI?.trim();
  if (directUri) {
    return directUri;
  }

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD;
  const cluster = process.env.MONGODB_CLUSTER?.trim();
  const dbName = process.env.MONGODB_DB?.trim() || "codebox";

  if (user && password && cluster) {
    const encodedPassword = encodeURIComponent(password);
    return `mongodb+srv://${user}:${encodedPassword}@${cluster}/${dbName}?retryWrites=true&w=majority&appName=codebox`;
  }

  throw new Error(
    "MongoDB is not configured. Set MONGODB_URI or MONGODB_USER + MONGODB_PASSWORD + MONGODB_CLUSTER in .env"
  );
}

const Connection = async () => {
  const uri = buildMongoUri();

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`MongoDB connected: database="${mongoose.connection.name}"`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Target:", maskUri(uri));

    if (error.message?.toLowerCase().includes("auth")) {
      console.error(
        "Authentication failed — verify username/password in MongoDB Atlas (Database Access), reset the DB user password if needed, and URL-encode special characters in the password."
      );
    } else if (error.message?.toLowerCase().includes("enotfound")) {
      console.error(
        "Cluster host not found — check MONGODB_URI / MONGODB_CLUSTER and your network connection."
      );
    } else if (error.message?.toLowerCase().includes("whitelist")) {
      console.error(
        "IP not allowed — add your IP (or 0.0.0.0/0 for dev) under Atlas → Network Access."
      );
    }

    throw error;
  }
};

export default Connection;
