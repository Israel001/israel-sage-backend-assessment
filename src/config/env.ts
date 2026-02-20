import dotenv from "dotenv";

dotenv.config();

interface Env {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const env: Env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wallet-assessment",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d"
};
