import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";
import type { AccountResponse } from "../types/domain";

type VerifiedTokenPayload = JwtPayload & { sub: string };

export function signAccessToken(account: Pick<AccountResponse, "id" | "email">): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(
    {
      sub: account.id,
      email: account.email
    },
    env.jwtSecret,
    options
  );
}

export function verifyAccessToken(token: string): VerifiedTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      throw new HttpError(401, "Invalid or expired token", "UNAUTHORIZED");
    }

    return payload as VerifiedTokenPayload;
  } catch {
    throw new HttpError(401, "Invalid or expired token", "UNAUTHORIZED");
  }
}
