/**
 * responseHelper.js — consistent JSON response shapes across every route.
 */
import { MESSAGES } from '../constants/messages.js';

const sendSuccess = (res, { status = 200, message, data = {} } = {}) =>
  res.status(status).json({ message, ...data });

const sendError = (res, { status = 500, message = MESSAGES.SERVER_ERROR, errors } = {}) =>
  res.status(status).json({ message, ...(errors ? { errors } : {}) });

/** Wraps an async controller so unexpected errors fall through to sendError. */
const asyncHandler = (fn, fallbackMessage = MESSAGES.SERVER_ERROR) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error(`${req.method} ${req.originalUrl}:`, error.message);
    sendError(res, { status: 500, message: fallbackMessage });
  }
};

export { sendSuccess, sendError, asyncHandler };
