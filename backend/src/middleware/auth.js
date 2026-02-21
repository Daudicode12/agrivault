const jwt = require("jsonwebtoken");
const { config } = require("../config/env");
const { AppError } = require("./errorHandler");

const authenticate = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication required. Please provide a valid token.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);

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
const authenticateDevice = (req, _res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return next(new AppError("Device API key required.", 401));
  }

  // TODO: Validate API key against database of registered devices
  // For now, we pass it through and validate in the service layer
  req.deviceApiKey = apiKey;
  next();
};

module.exports = { authenticate, authenticateDevice };
