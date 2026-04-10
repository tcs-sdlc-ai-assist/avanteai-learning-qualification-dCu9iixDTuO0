import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgramsPage from './ProgramsPage';

vi.mock('../services/api', () => ({
  getPrograms: vi.fn(),
  createProgram: vi.fn(),
  updateProgram: vi.fn(),
  deleteProgram: vi.fn(),
}));

vi.mock('../components/DataTable', () => ({
  __esModule: true,
  default: function MockDataTable({ columns, data, isLoading, emptyMessage, onSort, onPageChange, searchValue, onSearchChange }) {
    if (isLoading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }
    if (!data || data.length === 0) {
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    }
    return (
      <div data-testid="data-table">
        {onSearchChange && (
          <input
            data-testid="search-input"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
          />
        )}
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => onSort && col.sortable && onSort(col.key, 'asc')}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id || idx} data-testid={`row-${row.id || idx}`}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
  DataTable: function MockDataTableNamed({ columns, data, isLoading, emptyMessage, onSort, onPageChange, searchValue, onSearchChange }) {
    if (isLoading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }
    if (!data || data.length === 0) {
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    }
    return (
      <div data-testid="data-table">
        {onSearchChange && (
          <input
            data-testid="search-input"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
          />
        )}
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id || idx} data-testid={`row-${row.id || idx}`}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
}));

vi.mock('../components/StatusBadge', () => ({
  __esModule: true,
  StatusBadge: function MockStatusBadge({ status }) {
    return <span data-testid="status-badge">{status}</span>;
  },
  default: function MockStatusBadgeDefault({ status }) {
    return <span data-testid="status-badge">{status}</span>;
  },
}));

vi.mock('../components/Modal', () => ({
  __esModule: true,
  default: function MockModal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal" role="dialog" aria-label={title}>
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        <div data-testid="modal-content">{children}</div>
      </div>
    );
  },
}));

vi.mock('../utils/formatters', () => ({
  formatDateTime: vi.fn((val) => val ? new Date(val).toLocaleDateString() : '—'),
}));

import { getPrograms, createProgram, updateProgram, deleteProgram } from '../services/api';

const mockPrograms = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Annual Compliance Training',
    description: 'Mandatory annual compliance training program.',
    status: 'Active',
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    policyCount: 1,
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Anti-Money Laundering (AML)',
    description: 'AML training program.',
    status: 'Active',
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    policyCount: 1,
  },
];

describe('ProgramsPage', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    getPrograms.mockResolvedValue(mockPrograms);
    createProgram.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000099',
      name: 'New Program',
      description: 'A new program',
      status: 'Active',
      createdAt: '2025-06-01T00:00:00Z',
      updatedAt: '2025-06-01T00:00:00Z',
      policyCount: 0,
    });
    updateProgram.mockResolvedValue({
      ...mockPrograms[0],
      name: 'Updated Program',
    });
    deleteProgram.mockResolvedValue({});
  });

  describe('Program List Rendering', () => {
    it('renders the page title and description', async () => {
      render(<ProgramsPage />);

      expect(screen.getByText('Compliance Programs')).toBeInTheDocument();
      expect(screen.getByText(/Manage your organization/)).toBeInTheDocument();
    });

    it('renders the Add Program button', async () => {
      render(<ProgramsPage />);

      expect(screen.getByRole('button', { name: /Add Program/i })).toBeInTheDocument();
    });

    it('fetches and displays programs on mount', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching programs', async () => {
      let resolvePromise;
      getPrograms.mockReturnValue(new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      render(<ProgramsPage />);

      expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();

      resolvePromise(mockPrograms);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });
    });

    it('shows empty message when no programs exist', async () => {
      getPrograms.mockResolvedValue([]);

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
      });

      expect(screen.getByText(/No compliance programs found/)).toBeInTheDocument();
    });

    it('shows error message when fetch fails', async () => {
      getPrograms.mockRejectedValue({
        response: { data: { error: 'Server error occurred' } },
      });

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
      });
    });

    it('shows generic error message when fetch fails without response data', async () => {
      getPrograms.mockRejectedValue(new Error('Network error'));

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('renders program names in the table', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      expect(screen.getByText('Annual Compliance Training')).toBeInTheDocument();
      expect(screen.getByText('Anti-Money Laundering (AML)')).toBeInTheDocument();
    });

    it('renders Edit and Delete buttons for each program', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });

      expect(editButtons.length).toBe(2);
      expect(deleteButtons.length).toBe(2);
    });

    it('handles programs response as object with programs array', async () => {
      getPrograms.mockResolvedValue({ programs: mockPrograms, total: 2 });

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      expect(screen.getByText('Annual Compliance Training')).toBeInTheDocument();
    });

    it('handles programs response as object with items array', async () => {
      getPrograms.mockResolvedValue({ items: mockPrograms, total: 2 });

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      expect(screen.getByText('Annual Compliance Training')).toBeInTheDocument();
    });
  });

  describe('Add Program Modal', () => {
    it('opens the create modal when Add Program is clicked', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Add Program');
    });

    it('renders name and description fields in create modal', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      expect(within(modalContent).getByLabelText(/Name/i)).toBeInTheDocument();
      expect(within(modalContent).getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('does not render status field in create modal', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      expect(within(modalContent).queryByLabelText(/Status/i)).not.toBeInTheDocument();
    });

    it('creates a program successfully', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);
      const descInput = within(modalContent).getByLabelText(/Description/i);

      await user.type(nameInput, 'New Program');
      await user.type(descInput, 'A new program description');

      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(createProgram).toHaveBeenCalledWith({
          name: 'New Program',
          description: 'A new program description',
        });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      expect(getPrograms).toHaveBeenCalledTimes(2);
    });

    it('closes the create modal when Cancel is clicked', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));
      expect(screen.getByTestId('modal')).toBeInTheDocument();

      const modalContent = screen.getByTestId('modal-content');
      const cancelButton = within(modalContent).getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });
    });

    it('shows error when create fails', async () => {
      createProgram.mockRejectedValue({
        response: { data: { error: 'A program with this name already exists.' } },
      });

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);
      await user.type(nameInput, 'Duplicate Program');

      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('A program with this name already exists.')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation error when name is empty on create', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Program name is required/i)).toBeInTheDocument();
      });

      expect(createProgram).not.toHaveBeenCalled();
    });

    it('shows validation error when name exceeds max length', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);

      const longName = 'A'.repeat(101);
      await user.type(nameInput, longName);

      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/must be no more than 100 characters/i)).toBeInTheDocument();
      });

      expect(createProgram).not.toHaveBeenCalled();
    });

    it('clears validation errors when user types in the field', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Program name is required/i)).toBeInTheDocument();
      });

      const nameInput = within(modalContent).getByLabelText(/Name/i);
      await user.type(nameInput, 'Valid Name');

      await waitFor(() => {
        expect(screen.queryByText(/Program name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Program Modal', () => {
    it('opens the edit modal when Edit button is clicked', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('modal-title')).toHaveTextContent('Edit Program');
    });

    it('populates form fields with existing program data', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);
      expect(nameInput.value).toBe('Annual Compliance Training');
    });

    it('renders status field in edit modal', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      expect(within(modalContent).getByLabelText(/Status/i)).toBeInTheDocument();
    });

    it('updates a program successfully', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Program Name');

      const saveButton = within(modalContent).getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateProgram).toHaveBeenCalledWith(
          '00000000-0000-0000-0000-000000000010',
          expect.objectContaining({
            name: 'Updated Program Name',
            status: 'Active',
          })
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });
    });

    it('shows error when update fails', async () => {
      updateProgram.mockRejectedValue({
        response: { data: { error: 'Update failed due to conflict.' } },
      });

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const saveButton = within(modalContent).getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Update failed due to conflict.')).toBeInTheDocument();
      });
    });

    it('shows validation error when name is cleared in edit modal', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);

      await user.clear(nameInput);

      const saveButton = within(modalContent).getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Program name is required/i)).toBeInTheDocument();
      });

      expect(updateProgram).not.toHaveBeenCalled();
    });
  });

  describe('Delete Confirmation', () => {
    it('opens the delete confirmation modal when Delete button is clicked', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Program');
    });

    it('shows the program name in the delete confirmation', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      expect(within(modalContent).getByText(/Annual Compliance Training/)).toBeInTheDocument();
    });

    it('deletes a program when confirmed', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const confirmDeleteButton = within(modalContent).getByRole('button', { name: /Delete Program/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(deleteProgram).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000010');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      expect(getPrograms).toHaveBeenCalledTimes(2);
    });

    it('closes the delete modal when Cancel is clicked', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const cancelButton = within(modalContent).getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      expect(deleteProgram).not.toHaveBeenCalled();
    });

    it('shows error when delete fails', async () => {
      deleteProgram.mockRejectedValue({
        response: { data: { error: 'Cannot delete program with active policies.' } },
      });

      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const confirmDeleteButton = within(modalContent).getByRole('button', { name: /Delete Program/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(screen.getByText('Cannot delete program with active policies.')).toBeInTheDocument();
      });
    });
  });

  describe('API Interaction', () => {
    it('calls getPrograms with page and pageSize params', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1, pageSize: 20 })
        );
      });
    });

    it('refetches programs after successful create', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(1);
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);
      await user.type(nameInput, 'New Program');

      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(2);
      });
    });

    it('refetches programs after successful delete', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(1);
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const confirmDeleteButton = within(modalContent).getByRole('button', { name: /Delete Program/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(2);
      });
    });

    it('refetches programs after successful update', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(1);
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('modal-content');
      const saveButton = within(modalContent).getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(getPrograms).toHaveBeenCalledTimes(2);
      });
    });

    it('does not call createProgram when validation fails', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Program name is required/i)).toBeInTheDocument();
      });

      expect(createProgram).not.toHaveBeenCalled();
    });

    it('trims whitespace from name and description before sending', async () => {
      render(<ProgramsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Program/i }));

      const modalContent = screen.getByTestId('modal-content');
      const nameInput = within(modalContent).getByLabelText(/Name/i);
      const descInput = within(modalContent).getByLabelText(/Description/i);

      await user.type(nameInput, '  Trimmed Program  ');
      await user.type(descInput, '  Some description  ');

      const createButton = within(modalContent).getByRole('button', { name: /Create Program/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(createProgram).toHaveBeenCalledWith({
          name: 'Trimmed Program',
          description: 'Some description',
        });
      });
    });
  });
});