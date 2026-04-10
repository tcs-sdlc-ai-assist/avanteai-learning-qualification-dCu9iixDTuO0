import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants.js';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401 || status === 403) {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Log in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export async function login(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

/**
 * Register a new user.
 * @param {{ email: string, password: string, fullName: string, role?: string }} data
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export async function register(data) {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
}

/**
 * Refresh the current JWT token.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export async function refreshToken() {
  const response = await apiClient.post('/auth/refresh');
  return response.data;
}

/**
 * Get the current authenticated user info.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

/**
 * Log out the current user.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Ignore errors on logout
  } finally {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
}

// ─── Programs ────────────────────────────────────────────────────────────────

/**
 * List all compliance programs.
 * @param {{ page?: number, pageSize?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getPrograms(params = {}) {
  const response = await apiClient.get('/programs', { params });
  return response.data;
}

/**
 * Get a single program by ID.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getProgram(id) {
  const response = await apiClient.get(`/programs/${id}`);
  return response.data;
}

/**
 * Create a new compliance program.
 * @param {{ name: string, description?: string }} data
 * @returns {Promise<*>}
 */
export async function createProgram(data) {
  const response = await apiClient.post('/programs', data);
  return response.data;
}

/**
 * Update an existing compliance program.
 * @param {string} id
 * @param {{ name: string, description?: string, status: string }} data
 * @returns {Promise<*>}
 */
export async function updateProgram(id, data) {
  const response = await apiClient.put(`/programs/${id}`, data);
  return response.data;
}

/**
 * Delete a compliance program.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function deleteProgram(id) {
  const response = await apiClient.delete(`/programs/${id}`);
  return response.data;
}

// ─── Policies ────────────────────────────────────────────────────────────────

/**
 * List all policies, optionally filtered by program.
 * @param {{ programId?: string, page?: number, pageSize?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getPolicies(params = {}) {
  const response = await apiClient.get('/policies', { params });
  return response.data;
}

/**
 * Get a single policy by ID.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getPolicy(id) {
  const response = await apiClient.get(`/policies/${id}`);
  return response.data;
}

/**
 * Create a new policy.
 * @param {{ programId: string, name: string, minimumScore: number, retakeAllowed: boolean, maxRetakes: number, exemptionAllowed: boolean, exemptions?: string[] }} data
 * @returns {Promise<*>}
 */
export async function createPolicy(data) {
  const response = await apiClient.post('/policies', data);
  return response.data;
}

/**
 * Update an existing policy.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<*>}
 */
export async function updatePolicy(id, data) {
  const response = await apiClient.put(`/policies/${id}`, data);
  return response.data;
}

/**
 * Delete a policy.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function deletePolicy(id) {
  const response = await apiClient.delete(`/policies/${id}`);
  return response.data;
}

/**
 * Get version history for a policy.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getPolicyVersions(id) {
  const response = await apiClient.get(`/policies/${id}/versions`);
  return response.data;
}

// ─── Evidence ────────────────────────────────────────────────────────────────

/**
 * List evidence records with optional filters and pagination.
 * @param {{ page?: number, pageSize?: number, status?: string, programId?: string }} [params]
 * @returns {Promise<*>}
 */
export async function getEvidence(params = {}) {
  const response = await apiClient.get('/evidence', { params });
  return response.data;
}

/**
 * Get a single evidence record by ID.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getEvidenceById(id) {
  const response = await apiClient.get(`/evidence/${id}`);
  return response.data;
}

/**
 * Upload evidence file (CSV or Excel).
 * @param {File} file
 * @returns {Promise<*>}
 */
export async function uploadEvidence(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/evidence/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response.data;
}

/**
 * Validate evidence records by IDs.
 * @param {number[]} evidenceIds
 * @returns {Promise<*>}
 */
export async function validateEvidence(evidenceIds) {
  const response = await apiClient.post('/evidence/validate', { evidenceIds });
  return response.data;
}

// ─── Exceptions ──────────────────────────────────────────────────────────────

/**
 * List exceptions with optional filters and pagination.
 * @param {{ page?: number, pageSize?: number, status?: string }} [params]
 * @returns {Promise<*>}
 */
export async function getExceptions(params = {}) {
  const response = await apiClient.get('/exceptions', { params });
  return response.data;
}

/**
 * Get a single exception by ID.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getException(id) {
  const response = await apiClient.get(`/exceptions/${id}`);
  return response.data;
}

/**
 * Review an exception (approve, override, or reject).
 * @param {{ exceptionId: number, action: string, justification?: string }} data
 * @returns {Promise<*>}
 */
export async function reviewException(data) {
  const response = await apiClient.post('/exceptions/review', data);
  return response.data;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

/**
 * Get dashboard summary data.
 * @returns {Promise<*>}
 */
export async function getDashboardSummary() {
  const response = await apiClient.get('/dashboard/summary');
  return response.data;
}

/**
 * Get exception trend data for charts.
 * @param {{ days?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getExceptionTrends(params = {}) {
  const response = await apiClient.get('/dashboard/exception-trends', { params });
  return response.data;
}

/**
 * Get SLA metrics data.
 * @returns {Promise<*>}
 */
export async function getSlaMetrics() {
  const response = await apiClient.get('/dashboard/sla-metrics');
  return response.data;
}

/**
 * Get overdue training records.
 * @param {{ page?: number, pageSize?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getOverdueTraining(params = {}) {
  const response = await apiClient.get('/dashboard/overdue-training', { params });
  return response.data;
}

// ─── Notifications / Alerts ──────────────────────────────────────────────────

/**
 * Get unread alerts for the current user.
 * @returns {Promise<*>}
 */
export async function getUnreadAlerts() {
  const response = await apiClient.get('/alerts/unread');
  return response.data;
}

/**
 * Get paginated alerts for the current user.
 * @param {{ page?: number, pageSize?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getAlerts(params = {}) {
  const response = await apiClient.get('/alerts', { params });
  return response.data;
}

/**
 * Mark specific alerts as read.
 * @param {string[]} alertIds
 * @returns {Promise<*>}
 */
export async function markAlertsRead(alertIds) {
  const response = await apiClient.post('/alerts/mark-read', { alertIds });
  return response.data;
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

/**
 * Query audit logs with optional filters and pagination.
 * @param {{ entityType?: string, action?: string, userId?: string, fromDate?: string, toDate?: string, page?: number, pageSize?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getAuditLogs(params = {}) {
  const response = await apiClient.get('/audit-logs', { params });
  return response.data;
}

/**
 * Get a single audit log entry by ID.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getAuditLog(id) {
  const response = await apiClient.get(`/audit-logs/${id}`);
  return response.data;
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Export data in the specified format.
 * @param {{ entityType: string, format: string, page?: number, pageSize?: number, fromDate?: string, toDate?: string, userId?: string, action?: string, relatedEntityType?: string, relatedEntityId?: string, additionalFilters?: Record<string, string> }} data
 * @returns {Promise<Blob>}
 */
export async function exportData(data) {
  const response = await apiClient.post('/export', data, {
    responseType: 'blob',
    timeout: 60000,
  });
  return response;
}

/**
 * Trigger a file download from an export response.
 * @param {import('axios').AxiosResponse} response
 * @param {string} [fallbackFilename='export']
 */
export function downloadExportFile(response, fallbackFilename = 'export') {
  const contentDisposition = response.headers['content-disposition'];
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '');
    }
  }

  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ─── Users ───────────────────────────────────────────────────────────────────

/**
 * List all users (admin only).
 * @param {{ page?: number, pageSize?: number }} [params]
 * @returns {Promise<*>}
 */
export async function getUsers(params = {}) {
  const response = await apiClient.get('/users', { params });
  return response.data;
}

/**
 * Get a single user by ID.
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function getUser(id) {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
}

/**
 * Update a user profile.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<*>}
 */
export async function updateUser(id, data) {
  const response = await apiClient.put(`/users/${id}`, data);
  return response.data;
}

/**
 * Delete a user (admin only).
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function deleteUser(id) {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
}

export default apiClient;