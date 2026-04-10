import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuditLogs } from '../services/api';
import DataTable from '../components/DataTable';
import { formatDateTime } from '../utils/formatters';

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'Program', label: 'Program' },
  { value: 'Policy', label: 'Policy' },
  { value: 'Evidence', label: 'Evidence' },
  { value: 'Exception', label: 'Exception' },
  { value: 'Alert', label: 'Alert' },
  { value: 'User', label: 'User' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'Create', label: 'Create' },
  { value: 'Update', label: 'Update' },
  { value: 'Delete', label: 'Delete' },
  { value: 'Upload', label: 'Upload' },
  { value: 'Validate', label: 'Validate' },
  { value: 'Approve', label: 'Approve' },
  { value: 'Reject', label: 'Reject' },
  { value: 'Override', label: 'Override' },
  { value: 'Login', label: 'Login' },
  { value: 'Export', label: 'Export' },
];

function DetailsCell({ details }) {
  const [expanded, setExpanded] = useState(false);

  if (!details) {
    return <span className="text-gray-400">—</span>;
  }

  let formatted;
  try {
    if (typeof details === 'string') {
      const parsed = JSON.parse(details);
      formatted = JSON.stringify(parsed, null, 2);
    } else {
      formatted = JSON.stringify(details, null, 2);
    }
  } catch {
    formatted = String(details);
  }

  const isLong = formatted.length > 80;

  if (!isLong) {
    return (
      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 font-mono">
        {formatted}
      </code>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
        className="text-xs font-medium text-avante-600 hover:text-avante-700 focus:outline-none"
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>
      {expanded && (
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700 font-mono border border-gray-200">
          {formatted}
        </pre>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = {
        page,
        pageSize,
      };

      if (entityType) {
        params.entityType = entityType;
      }
      if (action) {
        params.action = action;
      }
      if (userId.trim()) {
        params.userId = userId.trim();
      }
      if (fromDate) {
        params.fromDate = new Date(fromDate).toISOString();
      }
      if (toDate) {
        params.toDate = new Date(toDate + 'T23:59:59').toISOString();
      }

      const data = await getAuditLogs(params);

      if (data && data.logs) {
        setLogs(data.logs);
        setTotal(data.total || 0);
      } else if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load audit logs';
      setError(message);
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, entityType, action, userId, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const handleSort = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, []);

  const handleResetFilters = useCallback(() => {
    setEntityType('');
    setAction('');
    setUserId('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }, []);

  const hasActiveFilters = entityType || action || userId.trim() || fromDate || toDate;

  const sortedLogs = useMemo(() => {
    if (!sortConfig || !logs.length) return logs;

    const sorted = [...logs].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'timestamp') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [logs, sortConfig]);

  const columns = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        sortable: true,
        render: (value) => (
          <span className="whitespace-nowrap text-gray-900 font-medium">
            {formatDateTime(value)}
          </span>
        ),
      },
      {
        key: 'userEmail',
        header: 'User',
        sortable: true,
        render: (value) => (
          <span className="text-gray-700">{value || '—'}</span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center rounded-full bg-avante-100 px-2.5 py-0.5 text-xs font-medium text-avante-800">
            {value}
          </span>
        ),
      },
      {
        key: 'entity',
        header: 'Entity Type',
        sortable: true,
        render: (value) => (
          <span className="text-gray-700">{value || '—'}</span>
        ),
      },
      {
        key: 'entityId',
        header: 'Entity ID',
        sortable: false,
        render: (value) => {
          if (!value) return <span className="text-gray-400">—</span>;
          const short = String(value).length > 12
            ? `${String(value).substring(0, 8)}…`
            : String(value);
          return (
            <span
              className="font-mono text-xs text-gray-600"
              title={String(value)}
            >
              {short}
            </span>
          );
        },
      },
      {
        key: 'details',
        header: 'Details',
        sortable: false,
        render: (value) => <DetailsCell details={value} />,
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Immutable record of all system actions. Entries cannot be modified or deleted.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-medium text-avante-600 hover:text-avante-700 focus:outline-none"
            >
              Reset filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label
              htmlFor="filter-entity-type"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Entity Type
            </label>
            <select
              id="filter-entity-type"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-action"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Action
            </label>
            <select
              id="filter-action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-user-id"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              User ID
            </label>
            <input
              id="filter-user-id"
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
              placeholder="Enter user ID..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
            />
          </div>

          <div>
            <label
              htmlFor="filter-from-date"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              From Date
            </label>
            <input
              id="filter-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
            />
          </div>

          <div>
            <label
              htmlFor="filter-to-date"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              To Date
            </label>
            <input
              id="filter-to-date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <svg
              className="mr-2 h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none"
          >
            Try again
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={sortedLogs}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortConfig={sortConfig}
        onSort={handleSort}
        isLoading={isLoading}
        emptyMessage="No audit log entries found matching the current filters."
        rowKey={(row) => row.id || row.Id}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
}