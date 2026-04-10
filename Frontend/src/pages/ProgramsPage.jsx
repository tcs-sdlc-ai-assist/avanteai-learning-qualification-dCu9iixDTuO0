import React, { useState, useEffect, useCallback } from 'react';
import { getPrograms, createProgram, updateProgram, deleteProgram } from '../services/api';
import DataTable from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatDateTime } from '../utils/formatters';
import { runValidation, required, maxLength } from '../utils/validators';

const PROGRAM_STATUSES = ['Active', 'Inactive', 'Archived'];

const INITIAL_FORM = {
  name: '',
  description: '',
  status: 'Active',
};

const VALIDATION_RULES_CREATE = {
  name: [required('Program name'), maxLength(100, 'Program name')],
};

const VALIDATION_RULES_UPDATE = {
  name: [required('Program name'), maxLength(100, 'Program name')],
};

function ProgramFormFields({ form, errors, onChange, isEdit }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="program-name" className="mb-1 block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="program-name"
          type="text"
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
          maxLength={100}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 ${
            errors.name
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-avante-500 focus:ring-avante-500'
          }`}
          placeholder="Enter program name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="program-description" className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="program-description"
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          placeholder="Enter program description (optional)"
        />
      </div>

      {isEdit && (
        <div>
          <label htmlFor="program-status" className="mb-1 block text-sm font-medium text-gray-700">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            id="program-status"
            value={form.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          >
            {PROGRAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getPrograms({ page, pageSize });
      if (Array.isArray(data)) {
        setPrograms(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.programs)) {
        setPrograms(data.programs);
        setTotal(data.total || data.programs.length);
      } else if (data && Array.isArray(data.items)) {
        setPrograms(data.items);
        setTotal(data.total || data.items.length);
      } else {
        setPrograms(Array.isArray(data) ? data : []);
        setTotal(0);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load programs';
      setError(message);
      setPrograms([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleFieldChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSubmitError('');
  }, []);

  const openCreateModal = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setFormErrors({});
    setSubmitError('');
    setIsCreateModalOpen(true);
  }, []);

  const openEditModal = useCallback((program) => {
    setSelectedProgram(program);
    setForm({
      name: program.name || '',
      description: program.description || '',
      status: program.status || 'Active',
    });
    setFormErrors({});
    setSubmitError('');
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((program) => {
    setSelectedProgram(program);
    setIsDeleteModalOpen(true);
    setSubmitError('');
  }, []);

  const handleCreate = useCallback(async () => {
    const errors = runValidation(form, VALIDATION_RULES_CREATE);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await createProgram({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setIsCreateModalOpen(false);
      setForm({ ...INITIAL_FORM });
      await fetchPrograms();
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create program';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, fetchPrograms]);

  const handleUpdate = useCallback(async () => {
    if (!selectedProgram) return;

    const errors = runValidation(form, VALIDATION_RULES_UPDATE);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await updateProgram(selectedProgram.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
      });
      setIsEditModalOpen(false);
      setSelectedProgram(null);
      setForm({ ...INITIAL_FORM });
      await fetchPrograms();
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update program';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, selectedProgram, fetchPrograms]);

  const handleDelete = useCallback(async () => {
    if (!selectedProgram) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await deleteProgram(selectedProgram.id);
      setIsDeleteModalOpen(false);
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete program';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProgram, fetchPrograms]);

  const handleSort = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'policyCount',
      header: 'Policies',
      sortable: true,
      render: (value) => (
        <span className="text-gray-700">{value ?? 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-gray-500">{formatDateTime(value)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="rounded px-2 py-1 text-sm font-medium text-avante-600 transition-colors hover:bg-avante-50 focus:outline-none focus:ring-2 focus:ring-avante-500"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(row);
            }}
            className="rounded px-2 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const sortedPrograms = React.useMemo(() => {
    if (!sortConfig) return programs;
    const { key, direction } = sortConfig;
    return [...programs].sort((a, b) => {
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [programs, sortConfig]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Programs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization&apos;s compliance training programs.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-avante-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Program
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={sortedPrograms}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortConfig={sortConfig}
        onSort={handleSort}
        isLoading={isLoading}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search programs..."
        emptyMessage="No compliance programs found. Click 'Add Program' to create one."
        rowKey={(row) => row.id}
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsCreateModalOpen(false);
          }
        }}
        title="Add Program"
      >
        <ProgramFormFields
          form={form}
          errors={formErrors}
          onChange={handleFieldChange}
          isEdit={false}
        />

        {submitError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-avante-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Program'
            )}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsEditModalOpen(false);
            setSelectedProgram(null);
          }
        }}
        title="Edit Program"
      >
        <ProgramFormFields
          form={form}
          errors={formErrors}
          onChange={handleFieldChange}
          isEdit={true}
        />

        {submitError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setIsEditModalOpen(false);
              setSelectedProgram(null);
            }}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-avante-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsDeleteModalOpen(false);
            setSelectedProgram(null);
          }
        }}
        title="Delete Program"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Are you sure you want to delete the program{' '}
                <span className="font-semibold text-gray-900">
                  {selectedProgram?.name}
                </span>
                ? This action cannot be undone and will also remove all associated policies.
              </p>
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedProgram(null);
              }}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                'Delete Program'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}