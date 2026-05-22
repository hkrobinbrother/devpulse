import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

// Centralized error handler — catches all errors passed via next(err)
const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('❌ Unhandled Error:', err.message);

  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred.',
    err.message
  );
};

export default errorHandler;
