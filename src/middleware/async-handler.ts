import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return function wrapped(req, res, next) {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
