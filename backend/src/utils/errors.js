export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: err.message || "Internal server error",
      details: err.details || null
    }
  });
}
