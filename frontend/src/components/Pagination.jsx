import React from 'react';

/**
 * Pagination — Bootstrap-styled page controls.
 *
 * Props:
 *   page        number   current page (1-indexed)
 *   totalPages  number   total number of pages
 *   onPage      fn(n)    called when user selects a page
 *   total       number   optional total record count for display
 *   perPage     number   optional records per page for display
 */
const Pagination = ({ page, totalPages, onPage, total, perPage }) => {
  if (totalPages <= 1) return null;

  const from = perPage ? (page - 1) * perPage + 1 : null;
  const to   = perPage && total ? Math.min(page * perPage, total) : null;

  // Build page number window (max 5 visible)
  const window = [];
  const half   = 2;
  let start    = Math.max(1, page - half);
  let end      = Math.min(totalPages, page + half);
  if (end - start < 4) {
    if (start === 1) end   = Math.min(totalPages, 5);
    else             start = Math.max(1, end - 4);
  }
  for (let i = start; i <= end; i++) window.push(i);

  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
      {/* Record count */}
      {total != null && perPage != null && (
        <small className="text-muted">
          Showing {from}–{to} of {total} records
        </small>
      )}

      {/* Page buttons */}
      <nav aria-label="Table pagination">
        <ul className="pagination pagination-sm mb-0">
          {/* Prev */}
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPage(page - 1)} disabled={page === 1}>
              ‹
            </button>
          </li>

          {/* First page + ellipsis */}
          {start > 1 && (
            <>
              <li className="page-item">
                <button className="page-link" onClick={() => onPage(1)}>1</button>
              </li>
              {start > 2 && <li className="page-item disabled"><span className="page-link">…</span></li>}
            </>
          )}

          {/* Page window */}
          {window.map((n) => (
            <li key={n} className={`page-item ${n === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPage(n)}>{n}</button>
            </li>
          ))}

          {/* Last page + ellipsis */}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}
              <li className="page-item">
                <button className="page-link" onClick={() => onPage(totalPages)}>{totalPages}</button>
              </li>
            </>
          )}

          {/* Next */}
          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
              ›
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
