import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<typeof mongoose> {
  await mongoose.connect(env.mongodbUri);
  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
