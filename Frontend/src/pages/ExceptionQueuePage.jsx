import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SlaCountdown from '../components/SlaCountdown';
import Modal from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { getExceptions, reviewException } from '../services/api';
import { formatDateTime } from '../utils/formatters';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Overridden', label: 'Overridden' },
  { value: 'Rejected', label: 'Rejected' },
];

const REVIEW_ACTIONS = {
  APPROVED: 'Approved',
  OVERRIDDEN: 'Overridden',
  REJECTED: 'Rejected',
};

function ExceptionQueuePage() {
  const [exceptions, setExceptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedExceptionId, setSelectedExceptionId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerException, setDrawerException] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [reviewAction, setReviewAction] = useState('');
  const [justification, setJustification] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const fetchExceptions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        pageSize,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const data = await getExceptions(params);
      setExceptions(data.exceptions || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load exceptions.';
      setError(message);
      setExceptions([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

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

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  }, []);

  const handleRowClick = useCallback((row) => {
    setSelectedExceptionId(row.exceptionId);
    setDrawerException(row);
    setDrawerOpen(true);
    setReviewAction('');
    setJustification('');
    setReviewError('');
    setReviewSuccess('');
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedExceptionId(null);
    setDrawerException(null);
    setReviewAction('');
    setJustification('');
    setReviewError('');
    setReviewSuccess('');
    setDrawerLoading(false);
  }, []);

  const handleReviewSubmit = useCallback(
    async (action) => {
      if (!drawerException) return;

      if (action === REVIEW_ACTIONS.OVERRIDDEN && !justification.trim()) {
        setReviewError('Justification is required for override actions.');
        return;
      }

      setReviewSubmitting(true);
      setReviewError('');
      setReviewSuccess('');

      try {
        const payload = {
          exceptionId: drawerException.exceptionId,
          action,
        };
        if (justification.trim()) {
          payload.justification = justification.trim();
        }

        const result = await reviewException(payload);
        setReviewSuccess(
          `Exception ${result.exceptionId || drawerException.exceptionId} has been ${(result.status || action).toLowerCase()}.`
        );
        setReviewAction(action);

        setDrawerException((prev) =>
          prev
            ? {
                ...prev,
                status: result.status || action,
                reviewAction: action,
                justification: justification.trim() || prev.justification,
                reviewedAt: new Date().toISOString(),
              }
            : prev
        );

        await fetchExceptions();
      } catch (err) {
        const message =
          err?.response?.data?.error ||
          err?.message ||
          'Failed to submit review.';
        setReviewError(message);
      } finally {
        setReviewSubmitting(false);
      }
    },
    [drawerException, justification, fetchExceptions]
  );

  const columns = [
    {
      key: 'employeeId',
      header: 'Employee',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
        </div>
      ),
    },
    {
      key: 'programId',
      header: 'Program',
      sortable: true,
    },
    {
      key: 'reason',
      header: 'Reason',
      sortable: false,
      render: (value) => (
        <span className="max-w-xs truncate block" title={value}>
          {value || '—'}
        </span>
      ),
    },
    {
      key: 'slaDeadline',
      header: 'SLA',
      sortable: true,
      render: (value, row) => (
        <SlaCountdown
          deadline={row.slaDeadline || row.sLADeadline}
          showIcon
          compact
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => <StatusBadge status={value} size="sm" />,
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm">{value ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-gray-500 text-xs">{formatDateTime(value)}</span>
      ),
    },
  ];

  const isExceptionOpen =
    drawerException &&
    (drawerException.status === 'Open' || drawerException.status === 'open');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exception Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and manage flagged compliance exceptions with SLA tracking.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
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
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {total} exception{total !== 1 ? 's' : ''} found
        </div>
      </div>

      <DataTable
        columns={columns}
        data={exceptions}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortConfig={sortConfig}
        onSort={handleSort}
        isLoading={isLoading}
        emptyMessage="No exceptions found."
        onRowClick={handleRowClick}
        rowKey={(row) => row.exceptionId}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      <Modal
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        title="Exception Details"
        variant="drawer"
      >
        {drawerLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="blue" />
          </div>
        )}

        {!drawerLoading && drawerException && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Exception ID
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {drawerException.exceptionId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={drawerException.status} size="md" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Employee ID
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {drawerException.employeeId || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Program ID
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {drawerException.programId || '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Evidence ID
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {drawerException.evidenceId || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Score
                  </p>
                  <p className="mt-1 text-sm font-mono text-gray-900">
                    {drawerException.score ?? '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Completion Date
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDateTime(drawerException.completionDate) || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Created
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDateTime(drawerException.createdAt) || '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  SLA Deadline
                </p>
                <div className="mt-1">
                  <SlaCountdown
                    deadline={
                      drawerException.slaDeadline || drawerException.sLADeadline
                    }
                    showIcon
                    compact={false}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Reason
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {drawerException.reason || '—'}
                </p>
              </div>

              {drawerException.isSLABreached && (
                <div className="rounded-md bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-red-400"
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
                    <span className="text-sm font-medium text-red-800">
                      SLA has been breached
                    </span>
                  </div>
                </div>
              )}

              {drawerException.reviewAction && (
                <div className="rounded-md bg-gray-50 p-4 space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Review Details
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Action</p>
                      <p className="text-sm font-medium text-gray-900">
                        {drawerException.reviewAction}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reviewed At</p>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(drawerException.reviewedAt) || '—'}
                      </p>
                    </div>
                  </div>
                  {drawerException.justification && (
                    <div>
                      <p className="text-xs text-gray-500">Justification</p>
                      <p className="text-sm text-gray-900">
                        {drawerException.justification}
                      </p>
                    </div>
                  )}
                  {drawerException.reviewerId && (
                    <div>
                      <p className="text-xs text-gray-500">Reviewer</p>
                      <p className="text-sm text-gray-900">
                        {drawerException.reviewerId}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isExceptionOpen && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Review Exception
                </h3>

                <div className="mb-4">
                  <label
                    htmlFor="justification"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Justification
                    <span className="ml-1 text-xs text-gray-400">
                      (required for override)
                    </span>
                  </label>
                  <textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => {
                      setJustification(e.target.value);
                      setReviewError('');
                    }}
                    rows={3}
                    placeholder="Enter justification for your review decision..."
                    disabled={reviewSubmitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:bg-gray-50 disabled:opacity-60"
                  />
                </div>

                {reviewError && (
                  <div className="mb-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-700">{reviewError}</p>
                  </div>
                )}

                {reviewSuccess && (
                  <div className="mb-4 rounded-md bg-green-50 p-3">
                    <p className="text-sm text-green-700">{reviewSuccess}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleReviewSubmit(REVIEW_ACTIONS.APPROVED)}
                    disabled={reviewSubmitting || !!reviewSuccess}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewSubmitting && reviewAction === '' ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <>
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewSubmit(REVIEW_ACTIONS.OVERRIDDEN)}
                    disabled={reviewSubmitting || !!reviewSuccess}
                    className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewSubmitting && reviewAction === '' ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <>
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Override
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewSubmit(REVIEW_ACTIONS.REJECTED)}
                    disabled={reviewSubmitting || !!reviewSuccess}
                    className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewSubmitting && reviewAction === '' ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <>
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isExceptionOpen && !drawerException.reviewAction && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 italic">
                  This exception has already been reviewed and is no longer open.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ExceptionQueuePage;