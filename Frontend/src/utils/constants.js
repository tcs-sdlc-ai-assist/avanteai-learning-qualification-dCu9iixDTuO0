/**
 * Shared constants and enum definitions for the frontend application.
 */

/** Base API URL from environment or default */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * API endpoint paths
 * @enum {string}
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    ME: `${API_BASE_URL}/auth/me`,
  },
  DOCUMENTS: {
    BASE: `${API_BASE_URL}/documents`,
    BY_ID: (id) => `${API_BASE_URL}/documents/${id}`,
    UPLOAD: `${API_BASE_URL}/documents/upload`,
    ANALYZE: (id) => `${API_BASE_URL}/documents/${id}/analyze`,
    DOWNLOAD: (id) => `${API_BASE_URL}/documents/${id}/download`,
  },
  COMPLIANCE: {
    BASE: `${API_BASE_URL}/compliance`,
    CHECKS: `${API_BASE_URL}/compliance/checks`,
    CHECK_BY_ID: (id) => `${API_BASE_URL}/compliance/checks/${id}`,
    RULES: `${API_BASE_URL}/compliance/rules`,
    RULE_BY_ID: (id) => `${API_BASE_URL}/compliance/rules/${id}`,
    REPORTS: `${API_BASE_URL}/compliance/reports`,
    REPORT_BY_ID: (id) => `${API_BASE_URL}/compliance/reports/${id}`,
  },
  RISKS: {
    BASE: `${API_BASE_URL}/risks`,
    BY_ID: (id) => `${API_BASE_URL}/risks/${id}`,
    ASSESSMENTS: `${API_BASE_URL}/risks/assessments`,
    ASSESSMENT_BY_ID: (id) => `${API_BASE_URL}/risks/assessments/${id}`,
  },
  AUDIT: {
    BASE: `${API_BASE_URL}/audit`,
    LOGS: `${API_BASE_URL}/audit/logs`,
    LOG_BY_ID: (id) => `${API_BASE_URL}/audit/logs/${id}`,
  },
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    BY_ID: (id) => `${API_BASE_URL}/users/${id}`,
  },
  DASHBOARD: {
    SUMMARY: `${API_BASE_URL}/dashboard/summary`,
    METRICS: `${API_BASE_URL}/dashboard/metrics`,
  },
};

/**
 * User role definitions
 * @enum {string}
 */
export const USER_ROLES = {
  ADMIN: 'Admin',
  COMPLIANCE_OFFICER: 'ComplianceOfficer',
  AUDITOR: 'Auditor',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
};

/**
 * Human-readable labels for user roles
 * @type {Record<string, string>}
 */
export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.COMPLIANCE_OFFICER]: 'Compliance Officer',
  [USER_ROLES.AUDITOR]: 'Auditor',
  [USER_ROLES.ANALYST]: 'Analyst',
  [USER_ROLES.VIEWER]: 'Viewer',
};

/**
 * Document status enum
 * @enum {string}
 */
export const DOCUMENT_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  ANALYZED: 'Analyzed',
  REVIEW_REQUIRED: 'ReviewRequired',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

/**
 * Human-readable labels for document statuses
 * @type {Record<string, string>}
 */
export const DOCUMENT_STATUS_LABELS = {
  [DOCUMENT_STATUS.PENDING]: 'Pending',
  [DOCUMENT_STATUS.PROCESSING]: 'Processing',
  [DOCUMENT_STATUS.ANALYZED]: 'Analyzed',
  [DOCUMENT_STATUS.REVIEW_REQUIRED]: 'Review Required',
  [DOCUMENT_STATUS.APPROVED]: 'Approved',
  [DOCUMENT_STATUS.REJECTED]: 'Rejected',
  [DOCUMENT_STATUS.ARCHIVED]: 'Archived',
};

/**
 * Compliance check status enum
 * @enum {string}
 */
export const COMPLIANCE_STATUS = {
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'NonCompliant',
  PARTIALLY_COMPLIANT: 'PartiallyCompliant',
  PENDING_REVIEW: 'PendingReview',
  NOT_APPLICABLE: 'NotApplicable',
};

/**
 * Human-readable labels for compliance statuses
 * @type {Record<string, string>}
 */
export const COMPLIANCE_STATUS_LABELS = {
  [COMPLIANCE_STATUS.COMPLIANT]: 'Compliant',
  [COMPLIANCE_STATUS.NON_COMPLIANT]: 'Non-Compliant',
  [COMPLIANCE_STATUS.PARTIALLY_COMPLIANT]: 'Partially Compliant',
  [COMPLIANCE_STATUS.PENDING_REVIEW]: 'Pending Review',
  [COMPLIANCE_STATUS.NOT_APPLICABLE]: 'Not Applicable',
};

/**
 * Risk severity levels
 * @enum {string}
 */
export const RISK_SEVERITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFORMATIONAL: 'Informational',
};

/**
 * Human-readable labels for risk severity
 * @type {Record<string, string>}
 */
export const RISK_SEVERITY_LABELS = {
  [RISK_SEVERITY.CRITICAL]: 'Critical',
  [RISK_SEVERITY.HIGH]: 'High',
  [RISK_SEVERITY.MEDIUM]: 'Medium',
  [RISK_SEVERITY.LOW]: 'Low',
  [RISK_SEVERITY.INFORMATIONAL]: 'Informational',
};

/**
 * AI confidence level definitions
 * @enum {string}
 */
export const CONFIDENCE_LEVEL = {
  VERY_HIGH: 'VeryHigh',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  VERY_LOW: 'VeryLow',
};

/**
 * Human-readable labels for confidence levels
 * @type {Record<string, string>}
 */
export const CONFIDENCE_LEVEL_LABELS = {
  [CONFIDENCE_LEVEL.VERY_HIGH]: 'Very High (90–100%)',
  [CONFIDENCE_LEVEL.HIGH]: 'High (75–89%)',
  [CONFIDENCE_LEVEL.MEDIUM]: 'Medium (50–74%)',
  [CONFIDENCE_LEVEL.LOW]: 'Low (25–49%)',
  [CONFIDENCE_LEVEL.VERY_LOW]: 'Very Low (0–24%)',
};

/**
 * Confidence score thresholds for mapping numeric scores to levels
 * @type {Array<{ min: number, max: number, level: string }>}
 */
export const CONFIDENCE_THRESHOLDS = [
  { min: 90, max: 100, level: CONFIDENCE_LEVEL.VERY_HIGH },
  { min: 75, max: 89, level: CONFIDENCE_LEVEL.HIGH },
  { min: 50, max: 74, level: CONFIDENCE_LEVEL.MEDIUM },
  { min: 25, max: 49, level: CONFIDENCE_LEVEL.LOW },
  { min: 0, max: 24, level: CONFIDENCE_LEVEL.VERY_LOW },
];

/**
 * Returns the confidence level for a given numeric score.
 * @param {number} score - A value between 0 and 100
 * @returns {string} The matching confidence level
 */
export const getConfidenceLevel = (score) => {
  const match = CONFIDENCE_THRESHOLDS.find(
    (t) => score >= t.min && score <= t.max
  );
  return match ? match.level : CONFIDENCE_LEVEL.VERY_LOW;
};

/**
 * SLA thresholds in hours
 * @type {Record<string, number>}
 */
export const SLA_THRESHOLDS = {
  CRITICAL_RESPONSE: 4,
  HIGH_RESPONSE: 24,
  MEDIUM_RESPONSE: 72,
  LOW_RESPONSE: 168,
  DOCUMENT_REVIEW: 48,
  COMPLIANCE_CHECK: 24,
  RISK_ASSESSMENT: 72,
  AUDIT_COMPLETION: 720,
};

/**
 * SLA status enum
 * @enum {string}
 */
export const SLA_STATUS = {
  ON_TRACK: 'OnTrack',
  AT_RISK: 'AtRisk',
  BREACHED: 'Breached',
};

/**
 * Tailwind CSS color class mappings for document status badges
 * @type {Record<string, string>}
 */
export const DOCUMENT_STATUS_COLORS = {
  [DOCUMENT_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [DOCUMENT_STATUS.PROCESSING]: 'bg-blue-100 text-blue-800',
  [DOCUMENT_STATUS.ANALYZED]: 'bg-indigo-100 text-indigo-800',
  [DOCUMENT_STATUS.REVIEW_REQUIRED]: 'bg-yellow-100 text-yellow-800',
  [DOCUMENT_STATUS.APPROVED]: 'bg-green-100 text-green-800',
  [DOCUMENT_STATUS.REJECTED]: 'bg-red-100 text-red-800',
  [DOCUMENT_STATUS.ARCHIVED]: 'bg-gray-200 text-gray-600',
};

/**
 * Tailwind CSS color class mappings for compliance status badges
 * @type {Record<string, string>}
 */
export const COMPLIANCE_STATUS_COLORS = {
  [COMPLIANCE_STATUS.COMPLIANT]: 'bg-green-100 text-green-800',
  [COMPLIANCE_STATUS.NON_COMPLIANT]: 'bg-red-100 text-red-800',
  [COMPLIANCE_STATUS.PARTIALLY_COMPLIANT]: 'bg-yellow-100 text-yellow-800',
  [COMPLIANCE_STATUS.PENDING_REVIEW]: 'bg-blue-100 text-blue-800',
  [COMPLIANCE_STATUS.NOT_APPLICABLE]: 'bg-gray-100 text-gray-600',
};

/**
 * Tailwind CSS color class mappings for risk severity badges
 * @type {Record<string, string>}
 */
export const RISK_SEVERITY_COLORS = {
  [RISK_SEVERITY.CRITICAL]: 'bg-red-200 text-red-900',
  [RISK_SEVERITY.HIGH]: 'bg-orange-100 text-orange-800',
  [RISK_SEVERITY.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [RISK_SEVERITY.LOW]: 'bg-green-100 text-green-800',
  [RISK_SEVERITY.INFORMATIONAL]: 'bg-blue-100 text-blue-800',
};

/**
 * Tailwind CSS color class mappings for confidence level badges
 * @type {Record<string, string>}
 */
export const CONFIDENCE_LEVEL_COLORS = {
  [CONFIDENCE_LEVEL.VERY_HIGH]: 'bg-green-100 text-green-800',
  [CONFIDENCE_LEVEL.HIGH]: 'bg-emerald-100 text-emerald-800',
  [CONFIDENCE_LEVEL.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [CONFIDENCE_LEVEL.LOW]: 'bg-orange-100 text-orange-800',
  [CONFIDENCE_LEVEL.VERY_LOW]: 'bg-red-100 text-red-800',
};

/**
 * Tailwind CSS color class mappings for SLA status badges
 * @type {Record<string, string>}
 */
export const SLA_STATUS_COLORS = {
  [SLA_STATUS.ON_TRACK]: 'bg-green-100 text-green-800',
  [SLA_STATUS.AT_RISK]: 'bg-yellow-100 text-yellow-800',
  [SLA_STATUS.BREACHED]: 'bg-red-100 text-red-800',
};

/**
 * Pagination defaults
 * @type {Record<string, number>}
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
};

/**
 * Date/time format strings
 * @type {Record<string, string>}
 */
export const DATE_FORMATS = {
  DISPLAY_DATE: 'MMM dd, yyyy',
  DISPLAY_DATETIME: 'MMM dd, yyyy HH:mm',
  DISPLAY_TIME: 'HH:mm:ss',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
  API_DATE: 'yyyy-MM-dd',
};

/**
 * Local storage keys
 * @type {Record<string, string>}
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'avante_access_token',
  REFRESH_TOKEN: 'avante_refresh_token',
  USER_PREFERENCES: 'avante_user_preferences',
  THEME: 'avante_theme',
  SIDEBAR_COLLAPSED: 'avante_sidebar_collapsed',
};

/**
 * Accepted file types for document upload
 * @type {Record<string, string[]>}
 */
export const ACCEPTED_FILE_TYPES = {
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  SPREADSHEETS: ['.xls', '.xlsx', '.csv'],
  ALL: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.csv'],
};

/**
 * Maximum file upload size in bytes (50 MB)
 * @type {number}
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Toast notification durations in milliseconds
 * @type {Record<string, number>}
 */
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
};