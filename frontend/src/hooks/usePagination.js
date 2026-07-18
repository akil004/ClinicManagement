import { useState, useMemo } from 'react';

/**
 * usePagination — client-side pagination over a data array.
 *
 * @param {Array}  data     The full data set to paginate
 * @param {number} perPage  Rows per page (default 10)
 * @returns {{ page, totalPages, paginated, setPage, reset }}
 */
const usePagination = (data = [], perPage = 10) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / perPage));

  // Clamp page when data shrinks (e.g. after filtering)
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(
    () => data.slice((safePage - 1) * perPage, safePage * perPage),
    [data, safePage, perPage]
  );

  const reset = () => setPage(1);

  return { page: safePage, totalPages, paginated, setPage, reset };
};

export default usePagination;
