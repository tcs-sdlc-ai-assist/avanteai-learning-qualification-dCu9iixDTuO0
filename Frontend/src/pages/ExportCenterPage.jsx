import React, { useState, useCallback } from 'react';
import { exportData, downloadExportFile } from '../services/api';
import Spinner from './Spinner';

const ENTITY_TYPES = [
  { value: 'Programs', label: 'Compliance Programs' },
  { value: 'Policies', label: 'Policies' },
  { value: 'Evidence', label: 'Evidence Records' },
  { value: 'Exceptions', label: 'Exceptions' },
  { value: 'AuditLogs', label: 'Audit Logs' },
  { value: 'Alerts', label: 'Alerts' },
];

const FORMAT_OPTIONS = [
  { value: 'CSV', label: 'CSV' },
  { value: 'JSON', label: 'JSON' },
];

const STATUS_OPTIONS_BY_ENTITY = {
  Programs: ['Active', 'Inactive', 'Archived'],
  Policies: ['Draft', 'Active', 'Deprecated'],
  Evidence: ['Pending', 'Validated', 'Flagged', 'Rejected'],
  Exceptions: ['Open', 'Approved', 'Overridden', 'Rejected'],
  AuditLogs: [],
  Alerts: [],
};

const ACTION_OPTIONS = [
  'Create',
  'Update',
  'Delete',
  'Upload',
  'Validate',
  'Review',
  'Approve',
  'Reject',
  'Override',
];

function getDefaultFilters() {
  return {
    entityType: 'Programs',
    format: 'CSV',
    fromDate: '',
    toDate: '',
    status: '',
    action: '',
    page: '',
    pageSize: '',
  };
}

export default function ExportCenterPage() {
  const [filters, setFilters] = useState(getDefaultFilters);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const statusOptions = STATUS_OPTIONS_BY_ENTITY[filters.entityType] || [];
  const showStatusFilter = statusOptions.length > 0;
  const showActionFilter = filters.entityType === 'AuditLogs';

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setError('');
    setSuccessMessage('');
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'entityType') {
        next.status = '';
        next.action = '';
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFilters(getDefaultFilters());
    setError('');
    setSuccessMessage('');
  }, []);

  const handleExport = useCallback(async () => {
    setError('');
    setSuccessMessage('');

    if (!filters.entityType) {
      setError('Please select an entity type.');
      return;
    }
    if (!filters.format) {
      setError('Please select an export format.');
      return;
    }

    if (filters.fromDate && filters.toDate) {
      const from = new Date(filters.fromDate);
      const to = new Date(filters.toDate);
      if (from > to) {
        setError('From date must be before To date.');
        return;
      }
    }

    const requestPayload = {
      entityType: filters.entityType,
      format: filters.format,
    };

    if (filters.fromDate) {
      requestPayload.fromDate = new Date(filters.fromDate).toISOString();
    }
    if (filters.toDate) {
      requestPayload.toDate = new Date(filters.toDate).toISOString();
    }
    if (filters.page && Number(filters.page) > 0) {
      requestPayload.page = Number(filters.page);
    }
    if (filters.pageSize && Number(filters.pageSize) > 0) {
      requestPayload.pageSize = Number(filters.pageSize);
    }
    if (showActionFilter && filters.action) {
      requestPayload.action = filters.action;
    }

    const additionalFilters = {};
    if (showStatusFilter && filters.status) {
      additionalFilters.status = filters.status;
    }
    if (Object.keys(additionalFilters).length > 0) {
      requestPayload.additionalFilters = additionalFilters;
    }

    setIsExporting(true);

    try {
      const response = await exportData(requestPayload);
      const fallbackName = `${filters.entityType.toLowerCase()}_export.${filters.format.toLowerCase() === 'csv' ? 'csv' : 'json'}`;
      downloadExportFile(response, fallbackName);
      setSuccessMessage('Export completed successfully. Your download should begin shortly.');
    } catch (err) {
      if (err.response && err.response.data) {
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            setError(parsed.error || parsed.message || 'Export failed. Please try again.');
          } catch {
            setError('Export failed. Please try again.');
          }
        } else {
          setError(err.response.data.error || err.response.data.message || 'Export failed. Please try again.');
        }
      } else {
        setError('Export failed. Please check your connection and try again.');
      }
    } finally {
      setIsExporting(false);
    }
  }, [filters, showStatusFilter, showActionFilter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Export Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Export compliance data in CSV or JSON format. Apply filters to narrow down the exported records.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {/* Entity Type */}
          <div>
            <label htmlFor="entityType" className="block text-sm font-medium text-gray-700">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entityType"
              name="entityType"
              value={filters.entityType}
              onChange={handleChange}
              disabled={isExporting}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export Format */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700">
              Export Format <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 flex gap-4">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    filters.format === opt.value
                      ? 'border-avante-500 bg-avante-50 text-avante-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  } ${isExporting ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={opt.value}
                    checked={filters.format === opt.value}
                    onChange={handleChange}
                    disabled={isExporting}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700">
                From Date
              </label>
              <input
                type="date"
                id="fromDate"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleChange}
                disabled={isExporting}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="toDate" className="block text-sm font-medium text-gray-700">
                To Date
              </label>
              <input
                type="date"
                id="toDate"
                name="toDate"
                value={filters.toDate}
                onChange={handleChange}
                disabled={isExporting}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Status Filter */}
          {showStatusFilter && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleChange}
                disabled={isExporting}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Filter (Audit Logs) */}
          {showActionFilter && (
            <div>
              <label htmlFor="action" className="block text-sm font-medium text-gray-700">
                Action
              </label>
              <select
                id="action"
                name="action"
                value={filters.action}
                onChange={handleChange}
                disabled={isExporting}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pagination */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="page" className="block text-sm font-medium text-gray-700">
                Page
              </label>
              <input
                type="number"
                id="page"
                name="page"
                value={filters.page}
                onChange={handleChange}
                disabled={isExporting}
                min="1"
                placeholder="All pages"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700">
                Page Size
              </label>
              <input
                type="number"
                id="pageSize"
                name="pageSize"
                value={filters.pageSize}
                onChange={handleChange}
                disabled={isExporting}
                min="1"
                max="10000"
                placeholder="Default"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3" role="alert">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 flex-shrink-0 text-red-500"
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
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3" role="status">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={handleReset}
              disabled={isExporting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-md bg-avante-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Export Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}