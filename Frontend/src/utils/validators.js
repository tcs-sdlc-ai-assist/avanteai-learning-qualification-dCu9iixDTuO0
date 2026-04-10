/**
 * Form validation utility functions for the avante-ai-compliance frontend.
 * Each validator returns an error message string if invalid, or empty string if valid.
 */

/**
 * Validates that a value is not empty, null, or undefined.
 * @param {string} fieldName - Display name of the field
 * @returns {(value: *) => string} Validator function
 */
export function required(fieldName) {
  return (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return `${fieldName} is required`;
    }
    return '';
  };
}

/**
 * Validates that a value is a properly formatted email address.
 * @param {*} value - The value to validate
 * @returns {string} Error message or empty string
 */
export function email(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(String(value).trim())) {
    return 'Please enter a valid email address';
  }
  return '';
}

/**
 * Validates that a string value meets a minimum length requirement.
 * @param {number} min - Minimum number of characters
 * @param {string} [fieldName='Value'] - Display name of the field
 * @returns {(value: *) => string} Validator function
 */
export function minLength(min, fieldName = 'Value') {
  return (value) => {
    if (value === null || value === undefined || String(value) === '') {
      return '';
    }
    if (String(value).length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return '';
  };
}

/**
 * Validates that a string value does not exceed a maximum length.
 * @param {number} max - Maximum number of characters
 * @param {string} [fieldName='Value'] - Display name of the field
 * @returns {(value: *) => string} Validator function
 */
export function maxLength(max, fieldName = 'Value') {
  return (value) => {
    if (value === null || value === undefined || String(value) === '') {
      return '';
    }
    if (String(value).length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return '';
  };
}

/**
 * Validates that a numeric value meets a minimum threshold.
 * @param {number} min - Minimum allowed value
 * @param {string} [fieldName='Value'] - Display name of the field
 * @returns {(value: *) => string} Validator function
 */
export function minValue(min, fieldName = 'Value') {
  return (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return '';
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      return `${fieldName} must be a valid number`;
    }
    if (num < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return '';
  };
}

/**
 * Validates that a numeric value does not exceed a maximum threshold.
 * @param {number} max - Maximum allowed value
 * @param {string} [fieldName='Value'] - Display name of the field
 * @returns {(value: *) => string} Validator function
 */
export function maxValue(max, fieldName = 'Value') {
  return (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return '';
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      return `${fieldName} must be a valid number`;
    }
    if (num > max) {
      return `${fieldName} must be no more than ${max}`;
    }
    return '';
  };
}

/**
 * Allowed MIME types and extensions for CSV and Excel files.
 * @type {ReadonlyArray<string>}
 */
const CSV_EXCEL_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Allowed file extensions for CSV and Excel files.
 * @type {ReadonlyArray<string>}
 */
const CSV_EXCEL_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

/**
 * Validates that a file is a CSV or Excel file based on MIME type and extension.
 * @param {File | null | undefined} file - The file to validate
 * @returns {string} Error message or empty string
 */
export function fileType(file) {
  if (file === null || file === undefined) {
    return '';
  }

  if (typeof file !== 'object' || typeof file.name !== 'string') {
    return 'Please select a valid file';
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = CSV_EXCEL_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  const mimeType = file.type || '';
  const hasValidMime = mimeType === '' || CSV_EXCEL_TYPES.includes(mimeType);

  if (!hasValidExtension) {
    return 'File must be a CSV or Excel file (.csv, .xls, .xlsx)';
  }

  if (!hasValidMime) {
    return 'File must be a CSV or Excel file (.csv, .xls, .xlsx)';
  }

  return '';
}

/**
 * Runs a set of validators against a set of field values and collects all errors.
 *
 * @param {Object<string, *>} values - An object mapping field names to their current values
 * @param {Object<string, Array<(value: *) => string>>} validationRules - An object mapping field names
 *   to arrays of validator functions. Each validator receives the field value and returns an error
 *   message string (empty string if valid).
 * @returns {Object<string, string>} An object mapping field names to their first error message.
 *   Only fields with errors are included. Returns an empty object if all fields are valid.
 *
 * @example
 * const errors = runValidation(
 *   { name: '', email: 'bad' },
 *   {
 *     name: [required('Name')],
 *     email: [required('Email'), email],
 *   }
 * );
 * // errors => { name: 'Name is required', email: 'Please enter a valid email address' }
 */
export function runValidation(values, validationRules) {
  const errors = {};

  const fieldNames = Object.keys(validationRules);
  for (let i = 0; i < fieldNames.length; i++) {
    const fieldName = fieldNames[i];
    const validators = validationRules[fieldName];
    const value = values[fieldName];

    if (!Array.isArray(validators)) {
      continue;
    }

    for (let j = 0; j < validators.length; j++) {
      const validator = validators[j];
      if (typeof validator !== 'function') {
        continue;
      }
      const errorMessage = validator(value);
      if (errorMessage) {
        errors[fieldName] = errorMessage;
        break;
      }
    }
  }

  return errors;
}