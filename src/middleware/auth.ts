import type { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/token";
import { HttpError } from "../utils/http-error";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token", "UNAUTHORIZED");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new HttpError(401, "Missing bearer token", "UNAUTHORIZED");
  }

  const payload = verifyAccessToken(token);
  req.auth = { accountId: payload.sub };
  next();
};
