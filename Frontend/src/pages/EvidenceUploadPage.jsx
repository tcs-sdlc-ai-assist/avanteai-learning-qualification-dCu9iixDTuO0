import React, { useState, useCallback } from 'react';
import FileDropzone from '../components/FileDropzone';
import { DataTable } from '../components/DataTable';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Spinner } from '../components/Spinner';
import { uploadEvidence, validateEvidence } from '../services/api';
import { formatDate } from '../utils/formatters';

const UPLOAD_STEPS = {
  SELECT_FILE: 'SELECT_FILE',
  UPLOADING: 'UPLOADING',
  PREVIEW: 'PREVIEW',
  CONFIRMING: 'CONFIRMING',
  VALIDATING: 'VALIDATING',
  RESULTS: 'RESULTS',
};

const parsedColumns = [
  {
    key: 'employeeId',
    header: 'Employee ID',
    sortable: true,
  },
  {
    key: 'programId',
    header: 'Program ID',
    sortable: true,
  },
  {
    key: 'completionDate',
    header: 'Completion Date',
    sortable: true,
    render: (value) => formatDate(value, { dateStyle: 'medium' }) || '—',
  },
  {
    key: 'score',
    header: 'Score',
    sortable: true,
    render: (value) => (
      <span className={`font-medium ${value < 70 ? 'text-red-600' : value < 85 ? 'text-yellow-600' : 'text-green-600'}`}>
        {value}
      </span>
    ),
  },
  {
    key: 'isDuplicate',
    header: 'Status',
    sortable: false,
    render: (value) =>
      value ? (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
          Duplicate
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          New
        </span>
      ),
  },
];

const resultsColumns = [
  {
    key: 'evidenceId',
    header: 'Evidence ID',
    sortable: true,
  },
  {
    key: 'confidence',
    header: 'Confidence',
    sortable: true,
    render: (value) => <ConfidenceBadge level={value} size="sm" />,
  },
  {
    key: 'exceptionFlagged',
    header: 'Exception',
    sortable: true,
    render: (value) =>
      value ? (
        <StatusBadge status="Flagged" size="sm" />
      ) : (
        <StatusBadge status="Validated" size="sm" />
      ),
  },
  {
    key: 'reason',
    header: 'Reason',
    sortable: false,
    render: (value) => value || '—',
  },
];

function EvidenceUploadPage() {
  const [step, setStep] = useState(UPLOAD_STEPS.SELECT_FILE);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [validationResponse, setValidationResponse] = useState(null);
  const [error, setError] = useState('');

  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(20);
  const [previewSort, setPreviewSort] = useState(null);

  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPageSize, setResultsPageSize] = useState(20);
  const [resultsSort, setResultsSort] = useState(null);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setError('');
    setUploadResponse(null);
    setValidationResponse(null);
    if (!file) {
      setStep(UPLOAD_STEPS.SELECT_FILE);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setStep(UPLOAD_STEPS.UPLOADING);
    setError('');
    setUploadProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadEvidence(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploadResponse(response);
        setUploadProgress(null);
        setStep(UPLOAD_STEPS.PREVIEW);
        setPreviewPage(1);
      }, 500);
    } catch (err) {
      setUploadProgress(null);
      setStep(UPLOAD_STEPS.SELECT_FILE);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to upload file. Please try again.');
      }
    }
  }, [selectedFile]);

  const handleConfirmAndValidate = useCallback(async () => {
    if (!uploadResponse || !uploadResponse.parsedRecords) {
      setError('No records to confirm.');
      return;
    }

    setStep(UPLOAD_STEPS.VALIDATING);
    setError('');

    try {
      const newRecords = uploadResponse.parsedRecords.filter((r) => !r.isDuplicate);
      if (newRecords.length === 0) {
        setError('No new records to validate. All records are duplicates.');
        setStep(UPLOAD_STEPS.PREVIEW);
        return;
      }

      const evidenceIds = newRecords.map((r) => r.programId);
      const response = await validateEvidence(evidenceIds);

      setValidationResponse(response);
      setStep(UPLOAD_STEPS.RESULTS);
      setResultsPage(1);
    } catch (err) {
      setStep(UPLOAD_STEPS.PREVIEW);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to validate evidence. Please try again.');
      }
    }
  }, [uploadResponse]);

  const handleReset = useCallback(() => {
    setStep(UPLOAD_STEPS.SELECT_FILE);
    setSelectedFile(null);
    setUploadProgress(null);
    setUploadResponse(null);
    setValidationResponse(null);
    setError('');
    setPreviewPage(1);
    setPreviewPageSize(20);
    setPreviewSort(null);
    setResultsPage(1);
    setResultsPageSize(20);
    setResultsSort(null);
  }, []);

  const getSortedData = useCallback((data, sortConfig) => {
    if (!sortConfig || !data) return data;
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }
      if (typeof aVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'boolean') {
        return sortConfig.direction === 'asc' ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }
      return 0;
    });
    return sorted;
  }, []);

  const getPagedData = useCallback((data, page, pageSize) => {
    if (!data) return [];
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, []);

  const sortedParsedRecords = getSortedData(uploadResponse?.parsedRecords || [], previewSort);
  const pagedParsedRecords = getPagedData(sortedParsedRecords, previewPage, previewPageSize);

  const sortedResults = getSortedData(validationResponse?.results || [], resultsSort);
  const pagedResults = getPagedData(sortedResults, resultsPage, resultsPageSize);

  const isUploading = step === UPLOAD_STEPS.UPLOADING;
  const isValidating = step === UPLOAD_STEPS.VALIDATING;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evidence Upload</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload CSV or Excel files containing training evidence records for compliance validation.
          </p>
        </div>
        {step !== UPLOAD_STEPS.SELECT_FILE && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
          >
            Upload New File
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-500"
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

      {(step === UPLOAD_STEPS.SELECT_FILE || step === UPLOAD_STEPS.UPLOADING) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <FileDropzone
            onFileSelect={handleFileSelect}
            disabled={isUploading}
            uploadProgress={uploadProgress}
            label="Upload Evidence File"
            hint="Drag and drop a CSV or Excel file here, or click to browse"
          />

          {selectedFile && !isUploading && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                className="rounded-lg bg-avante-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
              >
                Upload & Parse
              </button>
            </div>
          )}

          {isUploading && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Spinner size="sm" color="blue" />
              <span className="text-sm text-gray-600">Parsing evidence records...</span>
            </div>
          )}
        </div>
      )}

      {step === UPLOAD_STEPS.PREVIEW && uploadResponse && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Upload Summary</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-600">Total Records</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {uploadResponse.totalRecords ?? uploadResponse.parsedRecords?.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-600">New Records</p>
                <p className="mt-1 text-2xl font-bold text-green-900">
                  {uploadResponse.newRecordsCount ?? (uploadResponse.parsedRecords?.filter((r) => !r.isDuplicate).length ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-600">Duplicates</p>
                <p className="mt-1 text-2xl font-bold text-orange-900">
                  {uploadResponse.deduplicatedCount ?? (uploadResponse.parsedRecords?.filter((r) => r.isDuplicate).length ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Parsed Records Preview</h2>
            <DataTable
              columns={parsedColumns}
              data={pagedParsedRecords}
              total={sortedParsedRecords.length}
              page={previewPage}
              pageSize={previewPageSize}
              onPageChange={setPreviewPage}
              onPageSizeChange={(size) => {
                setPreviewPageSize(size);
                setPreviewPage(1);
              }}
              sortConfig={previewSort}
              onSort={(key, direction) => setPreviewSort({ key, direction })}
              isLoading={false}
              emptyMessage="No records found in the uploaded file."
              rowKey={(row, index) => `${row.employeeId}-${row.programId}-${index}`}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAndValidate}
              disabled={!uploadResponse.parsedRecords?.some((r) => !r.isDuplicate)}
              className="rounded-lg bg-avante-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm & Validate
            </button>
          </div>
        </div>
      )}

      {step === UPLOAD_STEPS.VALIDATING && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" color="blue" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">Validating Evidence</h2>
              <p className="mt-1 text-sm text-gray-500">
                Running AI validation on uploaded records. This may take a moment...
              </p>
            </div>
          </div>
        </div>
      )}

      {step === UPLOAD_STEPS.RESULTS && validationResponse && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Validation Results</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-600">Total Validated</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {validationResponse.totalValidated ?? validationResponse.results?.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-600">Passed</p>
                <p className="mt-1 text-2xl font-bold text-green-900">
                  {(validationResponse.totalValidated ?? validationResponse.results?.length ?? 0) -
                    (validationResponse.exceptionsFlagged ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm font-medium text-red-600">Exceptions Flagged</p>
                <p className="mt-1 text-2xl font-bold text-red-900">
                  {validationResponse.exceptionsFlagged ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Validation Details</h2>
            <DataTable
              columns={resultsColumns}
              data={pagedResults}
              total={sortedResults.length}
              page={resultsPage}
              pageSize={resultsPageSize}
              onPageChange={setResultsPage}
              onPageSizeChange={(size) => {
                setResultsPageSize(size);
                setResultsPage(1);
              }}
              sortConfig={resultsSort}
              onSort={(key, direction) => setResultsSort({ key, direction })}
              isLoading={false}
              emptyMessage="No validation results available."
              rowKey={(row, index) => `result-${row.evidenceId}-${index}`}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-avante-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EvidenceUploadPage;