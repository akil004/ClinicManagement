/**
 * paginationHelper.js — consistent pagination math across every list endpoint.
 */
import { config } from '../config/env.js';

/**
 * parsePagination(query) — reads page/limit from a request query object,
 * applying centralized defaults and an upper bound (never hard-code
 * pagination limits inline in a controller).
 */
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requestedLimit = parseInt(query.limit, 10) || config.paginationDefaultLimit;
  const limit = Math.min(Math.max(1, requestedLimit), config.paginationMaxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/** buildPaginationMeta({ page, limit, total }) — response metadata block. */
const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export { parsePagination, buildPaginationMeta };
