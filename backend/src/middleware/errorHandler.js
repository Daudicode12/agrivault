const { logger } = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message} [${err.statusCode}]`);
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  logger.error("Unhandled error:", err);
  return res.status(500).json({
    error: "Internal server error",
  });
};

module.exports = { AppError, errorHandler };
