import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`
    }
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues
      }
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }
  });
};
