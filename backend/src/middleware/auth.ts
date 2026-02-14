import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication required. Please provide a valid token.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };

    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Invalid or expired token.", 401));
    }
  }
};

/**
 * Middleware to authenticate IoT devices via API key.
 * Devices send their key in x-api-key header.
 */
export const authenticateDevice = (req: Request, _res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return next(new AppError("Device API key required.", 401));
  }

  // TODO: Validate API key against database of registered devices
  // For now, we pass it through and validate in the service layer
  (req as any).deviceApiKey = apiKey;
  next();
};
