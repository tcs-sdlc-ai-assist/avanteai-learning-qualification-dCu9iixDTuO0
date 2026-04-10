import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from './Spinner';

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg
        className="ml-1 inline-block h-4 w-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  if (direction === 'asc') {
    return (
      <svg
        className="ml-1 inline-block h-4 w-4 text-avante-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    );
  }

  return (
    <svg
      className="ml-1 inline-block h-4 w-4 text-avante-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

SortIcon.propTypes = {
  direction: PropTypes.oneOf(['asc', 'desc', null]),
};

SortIcon.defaultProps = {
  direction: null,
};

function SkeletonRow({ columnCount }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columnCount }).map((_, idx) => (
        <td key={idx} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
}

SkeletonRow.propTypes = {
  columnCount: PropTypes.number.isRequired,
};

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
      />
    </div>
  );
}

SearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

SearchInput.defaultProps = {
  placeholder: 'Search...',
};

function PaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          Showing {startItem} to {endItem} of {total} results
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="rounded px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="First page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pageNumbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={
              num === page
                ? 'rounded px-3 py-1 text-sm font-medium bg-avante-600 text-white'
                : 'rounded px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100'
            }
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="rounded px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Last page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

PaginationControls.propTypes = {
  page: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onPageSizeChange: PropTypes.func,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
};

PaginationControls.defaultProps = {
  onPageSizeChange: null,
  pageSizeOptions: [10, 20, 50, 100],
};

/**
 * Generic sortable/paginated data table component.
 *
 * @param {object} props
 * @param {Array<{ key: string, header: string, sortable?: boolean, render?: (value: *, row: object) => React.ReactNode, className?: string, headerClassName?: string }>} props.columns - Column configuration
 * @param {Array<object>} props.data - Array of row data objects
 * @param {number} props.total - Total number of records (for server-side pagination)
 * @param {number} props.page - Current page number (1-based)
 * @param {number} props.pageSize - Number of rows per page
 * @param {function} props.onPageChange - Callback when page changes: (page: number) => void
 * @param {function} [props.onPageSizeChange] - Callback when page size changes: (pageSize: number) => void
 * @param {{ key: string, direction: 'asc' | 'desc' } | null} [props.sortConfig] - Current sort configuration
 * @param {function} [props.onSort] - Callback when a sortable column header is clicked: (key: string, direction: 'asc' | 'desc') => void
 * @param {boolean} [props.isLoading] - Whether the table is in a loading state
 * @param {string} [props.searchValue] - Current search input value
 * @param {function} [props.onSearchChange] - Callback when search input changes: (value: string) => void
 * @param {string} [props.searchPlaceholder] - Placeholder text for the search input
 * @param {string} [props.emptyMessage] - Message to display when there is no data
 * @param {function} [props.rowKey] - Function to extract a unique key from a row: (row: object, index: number) => string | number
 * @param {function} [props.onRowClick] - Callback when a row is clicked: (row: object) => void
 * @param {Array<number>} [props.pageSizeOptions] - Available page size options
 * @param {string} [props.className] - Additional CSS classes for the table container
 */
export function DataTable({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortConfig,
  onSort,
  isLoading,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  emptyMessage,
  rowKey,
  onRowClick,
  pageSizeOptions,
  className,
}) {
  const [internalSearch, setInternalSearch] = useState('');

  const currentSearch = onSearchChange ? searchValue : internalSearch;
  const handleSearchChange = onSearchChange || setInternalSearch;

  const filteredData = useMemo(() => {
    if (onSearchChange || !currentSearch || currentSearch.trim() === '') {
      return data;
    }
    const term = currentSearch.toLowerCase().trim();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(term);
      })
    );
  }, [data, currentSearch, columns, onSearchChange]);

  const handleSort = useCallback(
    (key) => {
      if (!onSort) return;
      let direction = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      onSort(key, direction);
    },
    [onSort, sortConfig]
  );

  const getRowKey = useCallback(
    (row, index) => {
      if (rowKey) return rowKey(row, index);
      if (row.id !== undefined) return row.id;
      if (row.Id !== undefined) return row.Id;
      return index;
    },
    [rowKey]
  );

  const showSearch = onSearchChange !== undefined || columns.length > 0;
  const showPagination = total > 0;
  const skeletonRowCount = Math.min(pageSize, 5);

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${className || ''}`}>
      {showSearch && (
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="max-w-sm">
            <SearchInput
              value={currentSearch || ''}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false && onSort;
                const sortDirection =
                  sortConfig && sortConfig.key === col.key ? sortConfig.direction : null;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                      isSortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''
                    } ${col.headerClassName || ''}`}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                    aria-sort={
                      sortDirection === 'asc'
                        ? 'ascending'
                        : sortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {isSortable && <SortIcon direction={sortDirection} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, idx) => (
                <SkeletonRow key={`skeleton-${idx}`} columnCount={columns.length} />
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={`${getRowKey(row, rowIndex)}-${col.key}`}
                      className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${col.className || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center border-t border-gray-200 px-4 py-3">
          <Spinner size="sm" color="blue" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      )}

      {!isLoading && showPagination && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      render: PropTypes.func,
      className: PropTypes.string,
      headerClassName: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  total: PropTypes.number,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  onPageChange: PropTypes.func,
  onPageSizeChange: PropTypes.func,
  sortConfig: PropTypes.shape({
    key: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['asc', 'desc']).isRequired,
  }),
  onSort: PropTypes.func,
  isLoading: PropTypes.bool,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  emptyMessage: PropTypes.string,
  rowKey: PropTypes.func,
  onRowClick: PropTypes.func,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  className: PropTypes.string,
};

DataTable.defaultProps = {
  total: 0,
  page: 1,
  pageSize: 20,
  onPageChange: () => {},
  onPageSizeChange: null,
  sortConfig: null,
  onSort: null,
  isLoading: false,
  searchValue: '',
  onSearchChange: undefined,
  searchPlaceholder: 'Search...',
  emptyMessage: 'No data available',
  rowKey: null,
  onRowClick: null,
  pageSizeOptions: [10, 20, 50, 100],
  className: '',
};

export default DataTable;