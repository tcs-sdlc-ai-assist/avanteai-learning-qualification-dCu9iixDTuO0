import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { Spinner } from '../components/Spinner';
import {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyVersions,
  getPrograms,
} from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { runValidation, required, minValue, maxValue } from '../utils/validators';

const INITIAL_FORM_STATE = {
  programId: '',
  name: '',
  minimumScore: 80,
  retakeAllowed: false,
  maxRetakes: 0,
  exemptionAllowed: false,
  exemptions: '',
  status: 'Draft',
};

function PolicyForm({ form, errors, programs, onChange, onSubmit, onCancel, isEditing, isSubmitting }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      onChange({ ...form, [name]: checked });
    } else if (type === 'number') {
      onChange({ ...form, [name]: value === '' ? '' : Number(value) });
    } else {
      onChange({ ...form, [name]: value });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!isEditing && (
        <div>
          <label htmlFor="programId" className="mb-1 block text-sm font-medium text-gray-700">
            Program <span className="text-red-500">*</span>
          </label>
          <select
            id="programId"
            name="programId"
            value={form.programId}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          >
            <option value="">Select a program...</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.programId && (
            <p className="mt-1 text-sm text-red-600">{errors.programId}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Policy Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          placeholder="Enter policy name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="minimumScore" className="mb-1 block text-sm font-medium text-gray-700">
          Minimum Score (0–100) <span className="text-red-500">*</span>
        </label>
        <input
          id="minimumScore"
          name="minimumScore"
          type="number"
          min={0}
          max={100}
          value={form.minimumScore}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
        />
        {errors.minimumScore && (
          <p className="mt-1 text-sm text-red-600">{errors.minimumScore}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          id="retakeAllowed"
          name="retakeAllowed"
          type="checkbox"
          checked={form.retakeAllowed}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-avante-600 focus:ring-avante-500"
        />
        <label htmlFor="retakeAllowed" className="text-sm font-medium text-gray-700">
          Retake Allowed
        </label>
      </div>

      {form.retakeAllowed && (
        <div>
          <label htmlFor="maxRetakes" className="mb-1 block text-sm font-medium text-gray-700">
            Max Retakes
          </label>
          <input
            id="maxRetakes"
            name="maxRetakes"
            type="number"
            min={1}
            max={99}
            value={form.maxRetakes}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          />
          {errors.maxRetakes && (
            <p className="mt-1 text-sm text-red-600">{errors.maxRetakes}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          id="exemptionAllowed"
          name="exemptionAllowed"
          type="checkbox"
          checked={form.exemptionAllowed}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-avante-600 focus:ring-avante-500"
        />
        <label htmlFor="exemptionAllowed" className="text-sm font-medium text-gray-700">
          Exemption Allowed
        </label>
      </div>

      {form.exemptionAllowed && (
        <div>
          <label htmlFor="exemptions" className="mb-1 block text-sm font-medium text-gray-700">
            Exemptions (comma-separated)
          </label>
          <input
            id="exemptions"
            name="exemptions"
            type="text"
            value={form.exemptions}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
            placeholder="e.g. Medical, Parental Leave"
          />
        </div>
      )}

      {isEditing && (
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-avante-500 focus:outline-none focus:ring-1 focus:ring-avante-500"
          >
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Deprecated">Deprecated</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-avante-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avante-700 disabled:opacity-50"
        >
          {isSubmitting && <Spinner size="sm" color="white" />}
          <span className={isSubmitting ? 'ml-2' : ''}>{isEditing ? 'Update Policy' : 'Create Policy'}</span>
        </button>
      </div>
    </form>
  );
}

function VersionHistoryPanel({ versions, isLoading, policyName }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" color="blue" />
        <span className="ml-2 text-sm text-gray-500">Loading version history...</span>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        No version history available for this policy.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Showing {versions.length} version{versions.length !== 1 ? 's' : ''} for <strong>{policyName}</strong>
      </p>
      <div className="space-y-3">
        {versions.map((version) => {
          let changesDisplay = '';
          try {
            const parsed = JSON.parse(version.changes || '{}');
            if (Array.isArray(parsed)) {
              changesDisplay = parsed
                .map((c) => `${c.field || c.Field}: ${c.oldValue || c.OldValue} → ${c.newValue || c.NewValue}`)
                .join(', ');
            } else if (parsed.message) {
              changesDisplay = parsed.message;
            } else {
              changesDisplay = version.changes || 'No change details';
            }
          } catch {
            changesDisplay = version.changes || 'No change details';
          }

          return (
            <div
              key={version.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-avante-100 px-2.5 py-0.5 text-xs font-medium text-avante-800">
                    v{version.versionNumber}
                  </span>
                  <StatusBadge status={version.status} size="sm" />
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(version.changedAt)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-4">
                <div>
                  <span className="font-medium">Min Score:</span> {version.minimumScore}
                </div>
                <div>
                  <span className="font-medium">Retake:</span> {version.retakeAllowed ? `Yes (max ${version.maxRetakes})` : 'No'}
                </div>
                <div>
                  <span className="font-medium">Exemption:</span> {version.exemptionAllowed ? 'Yes' : 'No'}
                </div>
                {version.exemptions && version.exemptions.length > 0 && (
                  <div>
                    <span className="font-medium">Exemptions:</span> {version.exemptions.join(', ')}
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Changes:</span> {changesDisplay}
              </div>
              {version.changedBy && (
                <div className="mt-1 text-xs text-gray-400">
                  Changed by: {version.changedBy}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeleteConfirmation({ policyName, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        Are you sure you want to delete the policy <strong>{policyName}</strong>? This action cannot be undone.
      </p>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting && <Spinner size="sm" color="white" />}
          <span className={isDeleting ? 'ml-2' : ''}>Delete</span>
        </button>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortConfig, setSortConfig] = useState(null);
  const [searchValue, setSearchValue] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM_STATE });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsPolicyName, setVersionsPolicyName] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getPolicies();
      const list = Array.isArray(data) ? data : data.policies || data.items || [];
      setPolicies(list);
      setTotal(list.length);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
      setError('Failed to load policies. Please try again.');
      setPolicies([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const data = await getPrograms();
      const list = Array.isArray(data) ? data : data.programs || data.items || [];
      setPrograms(list);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
      setPrograms([]);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchPrograms();
  }, [fetchPolicies, fetchPrograms]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...policies];

    if (searchValue.trim()) {
      const term = searchValue.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.programName && p.programName.toLowerCase().includes(term)) ||
          (p.status && p.status.toLowerCase().includes(term))
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const comparison = typeof aVal === 'string'
          ? aVal.localeCompare(bVal)
          : aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [policies, searchValue, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, page, pageSize]);

  const paginatedTotal = filteredAndSortedData.length;

  const handleSort = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const openCreateForm = useCallback(() => {
    setForm({ ...INITIAL_FORM_STATE });
    setFormErrors({});
    setIsEditing(false);
    setEditingPolicyId(null);
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback(async (policy) => {
    setFormErrors({});
    setIsEditing(true);
    setEditingPolicyId(policy.id);
    try {
      const detail = await getPolicy(policy.id);
      const data = detail || policy;
      setForm({
        programId: data.programId || '',
        name: data.name || '',
        minimumScore: data.minimumScore ?? 80,
        retakeAllowed: data.retakeAllowed ?? false,
        maxRetakes: data.maxRetakes ?? 0,
        exemptionAllowed: data.exemptionAllowed ?? false,
        exemptions: Array.isArray(data.exemptions) ? data.exemptions.join(', ') : '',
        status: data.status || 'Draft',
      });
    } catch {
      setForm({
        programId: policy.programId || '',
        name: policy.name || '',
        minimumScore: policy.minimumScore ?? 80,
        retakeAllowed: policy.retakeAllowed ?? false,
        maxRetakes: policy.maxRetakes ?? 0,
        exemptionAllowed: policy.exemptionAllowed ?? false,
        exemptions: Array.isArray(policy.exemptions) ? policy.exemptions.join(', ') : '',
        status: policy.status || 'Draft',
      });
    }
    setIsFormOpen(true);
  }, []);

  const validateForm = useCallback(() => {
    const rules = {
      name: [required('Policy Name')],
      minimumScore: [
        required('Minimum Score'),
        minValue(0, 'Minimum Score'),
        maxValue(100, 'Minimum Score'),
      ],
    };

    if (!isEditing) {
      rules.programId = [required('Program')];
    }

    if (form.retakeAllowed) {
      rules.maxRetakes = [
        required('Max Retakes'),
        minValue(1, 'Max Retakes'),
      ];
    }

    return runValidation(form, rules);
  }, [form, isEditing]);

  const handleFormSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errors = validateForm();
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setIsSubmitting(true);
      try {
        const exemptionsList = form.exemptionAllowed && form.exemptions
          ? form.exemptions.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        if (isEditing && editingPolicyId) {
          const updateData = {
            name: form.name,
            minimumScore: Number(form.minimumScore),
            retakeAllowed: form.retakeAllowed,
            maxRetakes: form.retakeAllowed ? Number(form.maxRetakes) : 0,
            exemptionAllowed: form.exemptionAllowed,
            exemptions: exemptionsList,
            status: form.status,
          };
          await updatePolicy(editingPolicyId, updateData);
        } else {
          const createData = {
            programId: form.programId,
            name: form.name,
            minimumScore: Number(form.minimumScore),
            retakeAllowed: form.retakeAllowed,
            maxRetakes: form.retakeAllowed ? Number(form.maxRetakes) : 0,
            exemptionAllowed: form.exemptionAllowed,
            exemptions: exemptionsList,
          };
          await createPolicy(createData);
        }

        setIsFormOpen(false);
        setForm({ ...INITIAL_FORM_STATE });
        setFormErrors({});
        await fetchPolicies();
      } catch (err) {
        console.error('Failed to save policy:', err);
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          'Failed to save policy. Please try again.';
        setFormErrors({ _form: message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, isEditing, editingPolicyId, validateForm, fetchPolicies]
  );

  const openVersionHistory = useCallback(async (policy) => {
    setVersionsPolicyName(policy.name);
    setVersionsLoading(true);
    setVersions([]);
    setIsVersionsOpen(true);
    try {
      const data = await getPolicyVersions(policy.id);
      const list = Array.isArray(data) ? data : data.versions || data.items || [];
      setVersions(list);
    } catch (err) {
      console.error('Failed to fetch version history:', err);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  const openDeleteConfirm = useCallback((policy) => {
    setDeletingPolicy(policy);
    setIsDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingPolicy) return;
    setIsDeleting(true);
    try {
      await deletePolicy(deletingPolicy.id);
      setIsDeleteOpen(false);
      setDeletingPolicy(null);
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to delete policy:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingPolicy, fetchPolicies]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Policy Name',
        sortable: true,
        render: (value) => (
          <span className="font-medium text-gray-900">{value || '—'}</span>
        ),
      },
      {
        key: 'programName',
        header: 'Program',
        sortable: true,
        render: (value) => value || '—',
      },
      {
        key: 'minimumScore',
        header: 'Min Score',
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{value ?? '—'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'currentVersion',
        header: 'Version',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            v{value || 1}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-gray-500">{formatDateTime(value)}</span>
        ),
      },
      {
        key: 'id',
        header: 'Actions',
        sortable: false,
        render: (_value, row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openVersionHistory(row);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-avante-600 transition-colors hover:bg-avante-50"
              title="View version history"
            >
              History
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditForm(row);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
              title="Edit policy"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteConfirm(row);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              title="Delete policy"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [openVersionHistory, openEditForm, openDeleteConfirm]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage compliance policies, configure validation rules, and view version history.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center rounded-lg bg-avante-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Policy
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginatedData}
        total={paginatedTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortConfig={sortConfig}
        onSort={handleSort}
        isLoading={isLoading}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search policies by name, program, or status..."
        emptyMessage="No policies found. Click 'Add Policy' to create one."
        rowKey={(row) => row.id}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsFormOpen(false);
            setFormErrors({});
          }
        }}
        title={isEditing ? 'Edit Policy' : 'Create Policy'}
      >
        {formErrors._form && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formErrors._form}
          </div>
        )}
        <PolicyForm
          form={form}
          errors={formErrors}
          programs={programs}
          onChange={setForm}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setFormErrors({});
          }}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Version History Drawer */}
      <Modal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        title={`Version History — ${versionsPolicyName}`}
        variant="drawer"
      >
        <VersionHistoryPanel
          versions={versions}
          isLoading={versionsLoading}
          policyName={versionsPolicyName}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false);
            setDeletingPolicy(null);
          }
        }}
        title="Delete Policy"
      >
        <DeleteConfirmation
          policyName={deletingPolicy?.name || ''}
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDeleteOpen(false);
            setDeletingPolicy(null);
          }}
          isDeleting={isDeleting}
        />
      </Modal>
    </div>
  );
}