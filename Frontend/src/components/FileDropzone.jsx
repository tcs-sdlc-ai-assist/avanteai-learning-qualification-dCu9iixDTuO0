import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { fileType } from '../utils/validators';
import { formatFileSize } from '../utils/formatters';

const ACCEPTED_EXTENSIONS = '.csv,.xls,.xlsx';
const ACCEPTED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function FileDropzone({
  onFileSelect,
  accept = ACCEPTED_EXTENSIONS,
  maxSize = 50 * 1024 * 1024,
  disabled = false,
  uploadProgress = null,
  label = 'Upload Evidence File',
  hint = 'Drag and drop a CSV or Excel file here, or click to browse',
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateFile = useCallback(
    (file) => {
      if (!file) {
        return 'No file selected';
      }

      const typeError = fileType(file);
      if (typeError) {
        return typeError;
      }

      if (file.size > maxSize) {
        return `File size must be less than ${formatFileSize(maxSize)}`;
      }

      if (file.size === 0) {
        return 'File is empty';
      }

      return '';
    },
    [maxSize]
  );

  const handleFile = useCallback(
    (file) => {
      setError('');

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      if (onFileSelect) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragEnter = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) {
        return;
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        handleClick();
      }
    },
    [disabled, handleClick]
  );

  const handleRemoveFile = useCallback(
    (e) => {
      e.stopPropagation();
      setSelectedFile(null);
      setError('');
      if (onFileSelect) {
        onFileSelect(null);
      }
    },
    [onFileSelect]
  );

  const isUploading = uploadProgress !== null && uploadProgress >= 0 && uploadProgress < 100;

  const getFileExtension = (fileName) => {
    if (!fileName) return '';
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-label="File upload dropzone"
        className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
            : isDragOver
              ? 'border-avante-500 bg-avante-50'
              : error
                ? 'border-red-300 bg-red-50 hover:border-red-400'
                : selectedFile
                  ? 'border-green-300 bg-green-50 hover:border-green-400'
                  : 'border-gray-300 bg-white hover:border-avante-400 hover:bg-gray-50'
        } focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {!selectedFile && !isUploading && (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`mb-3 h-10 w-10 ${
                isDragOver ? 'text-avante-500' : 'text-gray-400'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="mb-1 text-sm font-medium text-gray-700">
              {isDragOver ? 'Drop your file here' : hint}
            </p>
            <p className="text-xs text-gray-500">
              CSV, XLS, or XLSX • Max {formatFileSize(maxSize)}
            </p>
          </>
        )}

        {selectedFile && !isUploading && (
          <div className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
              <span className="text-xs font-bold text-green-700">
                {getFileExtension(selectedFile.name)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-avante-500"
              aria-label="Remove file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
            </button>
          </div>
        )}

        {isUploading && (
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Uploading...</p>
              <p className="text-sm font-medium text-avante-600">
                {Math.round(uploadProgress)}%
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-avante-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
              />
            </div>
            {selectedFile && (
              <p className="mt-2 truncate text-xs text-gray-500">
                {selectedFile.name} • {formatFileSize(selectedFile.size)}
              </p>
            )}
          </div>
        )}

        {uploadProgress === 100 && (
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-500"
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
            <p className="text-sm font-medium text-green-700">Upload complete</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

FileDropzone.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  accept: PropTypes.string,
  maxSize: PropTypes.number,
  disabled: PropTypes.bool,
  uploadProgress: PropTypes.number,
  label: PropTypes.string,
  hint: PropTypes.string,
};

export default FileDropzone;