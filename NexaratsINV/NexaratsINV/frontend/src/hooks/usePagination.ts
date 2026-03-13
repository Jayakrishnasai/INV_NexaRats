import { useState, useMemo, useCallback } from 'react';

/**
 * usePagination — generic pagination hook
 * @param items  Full array of items
 * @param pageSize  Items per page (default 25)
 * @returns Paginated slice + controls
 */
export function usePagination<T>(items: T[], pageSize = 25) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(items.length / pageSize)),
        [items.length, pageSize]
    );

    // Clamp current page when items length changes (e.g. after filter)
    const safePage = Math.min(currentPage, totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, safePage, pageSize]);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const nextPage = useCallback(() => goToPage(safePage + 1), [safePage, goToPage]);
    const prevPage = useCallback(() => goToPage(safePage - 1), [safePage, goToPage]);

    // Reset to page 1 whenever the items list length changes (i.e. filter applied)
    const resetPage = useCallback(() => setCurrentPage(1), []);

    return {
        currentPage: safePage,
        totalPages,
        paginatedItems,
        goToPage,
        nextPage,
        prevPage,
        resetPage,
        totalItems: items.length,
        startIndex: (safePage - 1) * pageSize + 1,
        endIndex: Math.min(safePage * pageSize, items.length),
    };
}

export default usePagination;
