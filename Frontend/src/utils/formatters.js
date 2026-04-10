/**
 * Data formatting utility functions for the Avante AI Compliance frontend.
 * Provides date formatting, number formatting, percentage calculation,
 * SLA time remaining calculation, file size formatting, and CSV/JSON data transformation.
 */

/**
 * Formats a date string or Date object into a human-readable string.
 * @param {string | Date | number | null | undefined} date - The date to format
 * @param {object} [options] - Intl.DateTimeFormat options
 * @param {string} [options.locale='en-US'] - The locale to use
 * @param {string} [options.dateStyle] - 'full' | 'long' | 'medium' | 'short'
 * @param {string} [options.timeStyle] - 'full' | 'long' | 'medium' | 'short'
 * @returns {string} Formatted date string or empty string if invalid
 */
export function formatDate(date, options = {}) {
  if (date === null || date === undefined) {
    return '';
  }

  const parsed = date instanceof Date ? date : new Date(date);

  if (isNaN(parsed.getTime())) {
    return '';
  }

  const { locale = 'en-US', ...formatOptions } = options;

  if (!formatOptions.dateStyle && !formatOptions.timeStyle && !formatOptions.year) {
    formatOptions.dateStyle = 'medium';
  }

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(parsed);
  } catch {
    return parsed.toLocaleDateString();
  }
}

/**
 * Formats a date as a short date string (MM/DD/YYYY).
 * @param {string | Date | number | null | undefined} date - The date to format
 * @returns {string} Formatted short date string
 */
export function formatShortDate(date) {
  return formatDate(date, { dateStyle: 'short' });
}

/**
 * Formats a date with time (e.g., "Jan 15, 2024, 3:30 PM").
 * @param {string | Date | number | null | undefined} date - The date to format
 * @returns {string} Formatted date-time string
 */
export function formatDateTime(date) {
  return formatDate(date, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Returns a relative time string (e.g., "2 hours ago", "in 3 days").
 * @param {string | Date | number | null | undefined} date - The date to compare
 * @param {string} [locale='en-US'] - The locale to use
 * @returns {string} Relative time string or empty string if invalid
 */
export function formatRelativeTime(date, locale = 'en-US') {
  if (date === null || date === undefined) {
    return '';
  }

  const parsed = date instanceof Date ? date : new Date(date);

  if (isNaN(parsed.getTime())) {
    return '';
  }

  const now = Date.now();
  const diffMs = parsed.getTime() - now;
  const absDiffMs = Math.abs(diffMs);

  const seconds = Math.round(absDiffMs / 1000);
  const minutes = Math.round(absDiffMs / (1000 * 60));
  const hours = Math.round(absDiffMs / (1000 * 60 * 60));
  const days = Math.round(absDiffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.round(absDiffMs / (1000 * 60 * 60 * 24 * 7));
  const months = Math.round(absDiffMs / (1000 * 60 * 60 * 24 * 30));
  const years = Math.round(absDiffMs / (1000 * 60 * 60 * 24 * 365));

  const sign = diffMs < 0 ? -1 : 1;

  let value;
  let unit;

  if (seconds < 60) {
    value = sign * seconds;
    unit = 'second';
  } else if (minutes < 60) {
    value = sign * minutes;
    unit = 'minute';
  } else if (hours < 24) {
    value = sign * hours;
    unit = 'hour';
  } else if (days < 7) {
    value = sign * days;
    unit = 'day';
  } else if (weeks < 4) {
    value = sign * weeks;
    unit = 'week';
  } else if (months < 12) {
    value = sign * months;
    unit = 'month';
  } else {
    value = sign * years;
    unit = 'year';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return rtf.format(value, unit);
  } catch {
    const absValue = Math.abs(value);
    const pluralUnit = absValue === 1 ? unit : `${unit}s`;
    return diffMs < 0
      ? `${absValue} ${pluralUnit} ago`
      : `in ${absValue} ${pluralUnit}`;
  }
}

/**
 * Formats a number with locale-aware separators.
 * @param {number | string | null | undefined} value - The number to format
 * @param {object} [options] - Formatting options
 * @param {string} [options.locale='en-US'] - The locale to use
 * @param {number} [options.minimumFractionDigits=0] - Minimum decimal places
 * @param {number} [options.maximumFractionDigits=2] - Maximum decimal places
 * @returns {string} Formatted number string or '—' if invalid
 */
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    return '—';
  }

  const {
    locale = 'en-US',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    ...rest
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      ...rest,
    }).format(num);
  } catch {
    return num.toFixed(maximumFractionDigits);
  }
}

/**
 * Formats a number as currency.
 * @param {number | string | null | undefined} value - The amount to format
 * @param {string} [currency='USD'] - ISO 4217 currency code
 * @param {string} [locale='en-US'] - The locale to use
 * @returns {string} Formatted currency string or '—' if invalid
 */
export function formatCurrency(value, currency = 'USD', locale = 'en-US') {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

/**
 * Calculates and formats a percentage from a numerator and denominator.
 * @param {number} numerator - The numerator
 * @param {number} denominator - The denominator
 * @param {number} [decimalPlaces=1] - Number of decimal places
 * @returns {string} Formatted percentage string (e.g., "85.5%") or '—' if invalid
 */
export function formatPercentage(numerator, denominator, decimalPlaces = 1) {
  if (
    typeof numerator !== 'number' ||
    typeof denominator !== 'number' ||
    isNaN(numerator) ||
    isNaN(denominator) ||
    denominator === 0
  ) {
    return '—';
  }

  const percentage = (numerator / denominator) * 100;
  return `${percentage.toFixed(decimalPlaces)}%`;
}

/**
 * Formats a decimal value as a percentage string.
 * @param {number | string | null | undefined} value - The value (0-1 or 0-100)
 * @param {object} [options] - Options
 * @param {boolean} [options.isDecimal=true] - Whether the value is a decimal (0-1) or already a percentage (0-100)
 * @param {number} [options.decimalPlaces=1] - Number of decimal places
 * @returns {string} Formatted percentage string or '—' if invalid
 */
export function formatPercentageValue(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    return '—';
  }

  const { isDecimal = true, decimalPlaces = 1 } = options;
  const percentage = isDecimal ? num * 100 : num;

  return `${percentage.toFixed(decimalPlaces)}%`;
}

/**
 * Calculates SLA time remaining and returns a structured result.
 * @param {string | Date | number} deadline - The SLA deadline
 * @param {string | Date | number} [now] - Current time (defaults to Date.now())
 * @returns {{ remaining: string, isOverdue: boolean, totalMs: number, urgency: 'critical' | 'warning' | 'normal' | 'overdue' }}
 */
export function calculateSlaTimeRemaining(deadline, now) {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const currentDate = now ? (now instanceof Date ? now : new Date(now)) : new Date();

  if (isNaN(deadlineDate.getTime()) || isNaN(currentDate.getTime())) {
    return {
      remaining: '—',
      isOverdue: false,
      totalMs: 0,
      urgency: 'normal',
    };
  }

  const diffMs = deadlineDate.getTime() - currentDate.getTime();
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  const timeStr = parts.join(' ');
  const remaining = isOverdue ? `${timeStr} overdue` : `${timeStr} remaining`;

  let urgency;
  if (isOverdue) {
    urgency = 'overdue';
  } else if (diffMs < 1000 * 60 * 60 * 4) {
    urgency = 'critical';
  } else if (diffMs < 1000 * 60 * 60 * 24) {
    urgency = 'warning';
  } else {
    urgency = 'normal';
  }

  return {
    remaining,
    isOverdue,
    totalMs: diffMs,
    urgency,
  };
}

/**
 * Formats a file size in bytes to a human-readable string.
 * @param {number | string | null | undefined} bytes - The file size in bytes
 * @param {number} [decimalPlaces=1] - Number of decimal places
 * @returns {string} Formatted file size string (e.g., "1.5 MB") or '—' if invalid
 */
export function formatFileSize(bytes, decimalPlaces = 1) {
  if (bytes === null || bytes === undefined || bytes === '') {
    return '—';
  }

  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;

  if (typeof num !== 'number' || isNaN(num) || num < 0) {
    return '—';
  }

  if (num === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(num) / Math.log(k));
  const unitIndex = Math.min(i, units.length - 1);

  const size = num / Math.pow(k, unitIndex);

  return `${size.toFixed(unitIndex === 0 ? 0 : decimalPlaces)} ${units[unitIndex]}`;
}

/**
 * Truncates a string to a maximum length and appends an ellipsis.
 * @param {string | null | undefined} text - The text to truncate
 * @param {number} [maxLength=100] - Maximum length before truncation
 * @returns {string} Truncated string or empty string if invalid
 */
export function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Converts an array of objects to a CSV string.
 * @param {Array<Record<string, unknown>>} data - Array of objects to convert
 * @param {object} [options] - Options
 * @param {string[]} [options.columns] - Specific columns to include (defaults to all keys from first row)
 * @param {Record<string, string>} [options.headers] - Custom header labels keyed by column name
 * @param {string} [options.delimiter=','] - Column delimiter
 * @returns {string} CSV formatted string
 */
export function convertToCSV(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const { delimiter = ',' } = options;
  const columns = options.columns || Object.keys(data[0]);
  const headers = options.headers || {};

  const escapeCSVValue = (val) => {
    if (val === null || val === undefined) {
      return '';
    }
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = columns.map((col) => escapeCSVValue(headers[col] || col)).join(delimiter);

  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSVValue(row[col])).join(delimiter)
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Parses a CSV string into an array of objects.
 * @param {string} csv - The CSV string to parse
 * @param {object} [options] - Options
 * @param {string} [options.delimiter=','] - Column delimiter
 * @param {boolean} [options.hasHeaders=true] - Whether the first row contains headers
 * @returns {Array<Record<string, string>>} Array of parsed objects
 */
export function parseCSV(csv, options = {}) {
  if (!csv || typeof csv !== 'string') {
    return [];
  }

  const { delimiter = ',', hasHeaders = true } = options;
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    values.push(current);
    return values;
  };

  if (!hasHeaders) {
    return lines.map((line) => {
      const values = parseLine(line);
      const obj = {};
      values.forEach((val, idx) => {
        obj[`col${idx}`] = val;
      });
      return obj;
    });
  }

  const headerValues = parseLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headerValues.forEach((header, idx) => {
      obj[header.trim()] = idx < values.length ? values[idx] : '';
    });
    return obj;
  });
}

/**
 * Transforms data for JSON export, applying optional field mappings and filters.
 * @param {Array<Record<string, unknown>>} data - The data to transform
 * @param {object} [options] - Options
 * @param {Record<string, string>} [options.fieldMap] - Map of original field names to new names
 * @param {string[]} [options.includeFields] - Fields to include (defaults to all)
 * @param {string[]} [options.excludeFields] - Fields to exclude
 * @returns {Array<Record<string, unknown>>} Transformed data
 */
export function transformForExport(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const { fieldMap = {}, includeFields, excludeFields = [] } = options;

  return data.map((row) => {
    const result = {};
    const keys = includeFields || Object.keys(row);

    keys.forEach((key) => {
      if (excludeFields.includes(key)) {
        return;
      }
      if (!(key in row)) {
        return;
      }
      const newKey = fieldMap[key] || key;
      result[newKey] = row[key];
    });

    return result;
  });
}

/**
 * Formats a compliance status string into a display-friendly format.
 * @param {string | null | undefined} status - The status string (e.g., "IN_PROGRESS", "pending_review")
 * @returns {string} Formatted status string (e.g., "In Progress", "Pending Review")
 */
export function formatStatus(status) {
  if (!status || typeof status !== 'string') {
    return '—';
  }

  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Formats a risk score with a label.
 * @param {number | null | undefined} score - The risk score (0-100)
 * @returns {{ label: string, formatted: string, level: 'low' | 'medium' | 'high' | 'critical' | 'unknown' }}
 */
export function formatRiskScore(score) {
  if (score === null || score === undefined || typeof score !== 'number' || isNaN(score)) {
    return { label: 'Unknown', formatted: '—', level: 'unknown' };
  }

  const clamped = Math.max(0, Math.min(100, score));
  const formatted = `${clamped.toFixed(0)}/100`;

  let label;
  let level;

  if (clamped < 25) {
    label = 'Low';
    level = 'low';
  } else if (clamped < 50) {
    label = 'Medium';
    level = 'medium';
  } else if (clamped < 75) {
    label = 'High';
    level = 'high';
  } else {
    label = 'Critical';
    level = 'critical';
  }

  return { label, formatted, level };
}