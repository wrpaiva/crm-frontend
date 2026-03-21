import { ChevronLeft, ChevronRight } from 'lucide-react';

function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages } = meta;

  function getPageNumbers() {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);

    if (page <= 3) {
      end = Math.min(4, totalPages - 1);
    }
    if (page >= totalPages - 2) {
      start = Math.max(totalPages - 3, 2);
    }

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');

    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="settings-pagination" style={{ marginTop: 16 }}>
      <button
        className="pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>

      {getPageNumbers().map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="pagination-btn" style={{ cursor: 'default', opacity: 0.5 }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default Pagination;
