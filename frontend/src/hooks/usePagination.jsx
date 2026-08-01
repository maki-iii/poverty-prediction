import { useState, useMemo } from "react";

// Generic client-side pagination. Give it a full array, get back the
// current page's slice plus everything needed to drive <Pagination />.
export default function usePagination(items = [], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp currentPage if the underlying data shrinks (e.g. after a delete
  // or a new search/filter) and it would otherwise be out of range.
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Call this whenever filters/search change, so pagination resets to page 1
  const resetPage = () => setCurrentPage(1);

  return {
    paginatedItems,
    currentPage: safePage,
    totalItems: items.length,
    pageSize,
    goToPage,
    resetPage,
  };
}