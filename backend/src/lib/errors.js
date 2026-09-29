import { ZodError } from 'zod';

/**
 * Application error carrying an HTTP status so controllers can stay declarative.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }
}

/**
 * Wraps an async express handler so rejected promises reach the error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const formatZodError = (error) =>
  error.issues.reduce((acc, issue) => {
    const key = issue.path.join('.') || '_';
    acc[key] = issue.message;
    return acc;
  }, {});

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatZodError(err),
    });
  }

  const statusCode = err.statusCode ?? 500;
  const payload = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  };

  if (err.details) payload.errors = err.details;

  if (statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  return res.status(statusCode).json(payload);
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
};
