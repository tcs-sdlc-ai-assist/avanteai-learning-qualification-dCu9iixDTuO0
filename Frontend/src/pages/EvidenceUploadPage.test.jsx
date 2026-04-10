import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvidenceUploadPage from './EvidenceUploadPage';

vi.mock('../services/api', () => ({
  uploadEvidence: vi.fn(),
  validateEvidence: vi.fn(),
}));

import { uploadEvidence, validateEvidence } from '../services/api';

function createFile(name = 'evidence.csv', size = 1024, type = 'text/csv') {
  const content = new Uint8Array(size);
  const file = new File([content], name, { type });
  return file;
}

const mockUploadResponse = {
  parsedRecords: [
    { employeeId: 'E001', programId: 1, completionDate: '2024-05-01', score: 92, isDuplicate: false },
    { employeeId: 'E002', programId: 1, completionDate: '2024-05-02', score: 45, isDuplicate: false },
    { employeeId: 'E003', programId: 2, completionDate: '2024-05-03', score: 88, isDuplicate: true },
  ],
  totalRecords: 3,
  deduplicatedCount: 1,
  newRecordsCount: 2,
};

const mockValidationResponse = {
  results: [
    { evidenceId: 101, confidence: 'High', exceptionFlagged: false, reason: null },
    { evidenceId: 102, confidence: 'Low', exceptionFlagged: true, reason: 'Score 45 is below minimum 80 by 35 points.' },
  ],
  totalValidated: 2,
  exceptionsFlagged: 1,
};

describe('EvidenceUploadPage', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    uploadEvidence.mockReset();
    validateEvidence.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page title and description', () => {
    render(<EvidenceUploadPage />);
    expect(screen.getByText('Evidence Upload')).toBeInTheDocument();
    expect(
      screen.getByText(/Upload CSV or Excel files containing training evidence records/)
    ).toBeInTheDocument();
  });

  it('renders the file dropzone on initial load', () => {
    render(<EvidenceUploadPage />);
    expect(screen.getByText('Upload Evidence File')).toBeInTheDocument();
    expect(
      screen.getByText(/Drag and drop a CSV or Excel file here/)
    ).toBeInTheDocument();
  });

  it('shows the Upload & Parse button after selecting a file', async () => {
    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = createFile('test.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    expect(screen.getByText('Upload & Parse')).toBeInTheDocument();
  });

  it('calls uploadEvidence and shows preview after successful upload', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload & Parse');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(uploadEvidence).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(screen.getByText('Upload Summary')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.getByText('Parsed Records Preview')).toBeInTheDocument();
  });

  it('displays parsed records in the preview table', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Parsed Records Preview')).toBeInTheDocument();
    });

    expect(screen.getByText('E001')).toBeInTheDocument();
    expect(screen.getByText('E002')).toBeInTheDocument();
    expect(screen.getByText('E003')).toBeInTheDocument();
  });

  it('shows duplicate and new badges in preview', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Parsed Records Preview')).toBeInTheDocument();
    });

    const newBadges = screen.getAllByText('New');
    expect(newBadges.length).toBe(2);

    const duplicateBadges = screen.getAllByText('Duplicate');
    expect(duplicateBadges.length).toBe(1);
  });

  it('shows error message when upload fails', async () => {
    uploadEvidence.mockRejectedValueOnce({
      response: {
        data: { error: 'Invalid file format. Only CSV and Excel (.csv, .xls, .xlsx) files are supported.' },
      },
    });

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(
        screen.getByText('Invalid file format. Only CSV and Excel (.csv, .xls, .xlsx) files are supported.')
      ).toBeInTheDocument();
    });
  });

  it('shows generic error message when upload fails without response data', async () => {
    uploadEvidence.mockRejectedValueOnce(new Error('Network error'));

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Failed to upload file. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows Confirm & Validate button in preview and triggers validation', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);
    validateEvidence.mockResolvedValueOnce(mockValidationResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Confirm & Validate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirm & Validate'));

    await waitFor(() => {
      expect(validateEvidence).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  it('displays validation results with correct counts', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);
    validateEvidence.mockResolvedValueOnce(mockValidationResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Confirm & Validate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirm & Validate'));

    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Validated')).toBeInTheDocument();
    expect(screen.getByText('Exceptions Flagged')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('displays validation details with confidence and exception info', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);
    validateEvidence.mockResolvedValueOnce(mockValidationResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Confirm & Validate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirm & Validate'));

    await waitFor(() => {
      expect(screen.getByText('Validation Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Score 45 is below minimum 80 by 35 points.')).toBeInTheDocument();
  });

  it('shows error when validation fails', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);
    validateEvidence.mockRejectedValueOnce({
      response: {
        data: { error: 'Failed to validate evidence. Please try again.' },
      },
    });

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Confirm & Validate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirm & Validate'));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to validate evidence. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('shows Upload New File button after upload and resets on click', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Upload Summary')).toBeInTheDocument();
    });

    const uploadNewButton = screen.getByText('Upload New File');
    expect(uploadNewButton).toBeInTheDocument();

    await user.click(uploadNewButton);

    await waitFor(() => {
      expect(screen.getByText('Upload Evidence File')).toBeInTheDocument();
    });

    expect(screen.queryByText('Upload Summary')).not.toBeInTheDocument();
  });

  it('shows Upload Another File button after validation results and resets on click', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);
    validateEvidence.mockResolvedValueOnce(mockValidationResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Confirm & Validate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirm & Validate'));

    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });

    const uploadAnotherButton = screen.getByText('Upload Another File');
    expect(uploadAnotherButton).toBeInTheDocument();

    await user.click(uploadAnotherButton);

    await waitFor(() => {
      expect(screen.getByText('Upload Evidence File')).toBeInTheDocument();
    });

    expect(screen.queryByText('Validation Results')).not.toBeInTheDocument();
  });

  it('shows Cancel button in preview that resets to initial state', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Upload Summary')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Upload Evidence File')).toBeInTheDocument();
    });

    expect(screen.queryByText('Upload Summary')).not.toBeInTheDocument();
  });

  it('disables Confirm & Validate when all records are duplicates', async () => {
    const allDuplicatesResponse = {
      parsedRecords: [
        { employeeId: 'E001', programId: 1, completionDate: '2024-05-01', score: 92, isDuplicate: true },
        { employeeId: 'E002', programId: 1, completionDate: '2024-05-02', score: 45, isDuplicate: true },
      ],
      totalRecords: 2,
      deduplicatedCount: 2,
      newRecordsCount: 0,
    };

    uploadEvidence.mockResolvedValueOnce(allDuplicatesResponse);

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Upload Summary')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm & Validate');
    expect(confirmButton).toBeDisabled();
  });

  it('shows validating spinner during validation', async () => {
    uploadEvidence.mockResolvedValueOnce(mockUploadResponse);

    let resolveValidation;
    validateEvidence.mockImplementationOnce(
      () => new Promise((resolve) => { resolveValidation = resolve; })
    );

    render(<EvidenceUploadPage />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = createFile('evidence.csv', 512, 'text/csv');
    await user.upload(fileInput, file);

    await user.click(screen.getByText('Upload & Parse'));

    await waitFor(() => {
      expect(screen.getByText('Confirm & Validate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirm & Validate'));

    await waitFor(() => {
      expect(screen.getByText('Validating Evidence')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Running AI validation on uploaded records/)
    ).toBeInTheDocument();

    resolveValidation(mockValidationResponse);

    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  it('does not show Upload & Parse button without a selected file', () => {
    render(<EvidenceUploadPage />);
    expect(screen.queryByText('Upload & Parse')).not.toBeInTheDocument();
  });

  it('shows error when no file is provided on upload attempt', async () => {
    render(<EvidenceUploadPage />);
    expect(screen.queryByText('Upload & Parse')).not.toBeInTheDocument();
  });
});