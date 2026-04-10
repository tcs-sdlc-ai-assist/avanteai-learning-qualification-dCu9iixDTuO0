import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExceptionQueuePage from './ExceptionQueuePage';

vi.mock('../services/api', () => ({
  getExceptions: vi.fn(),
  reviewException: vi.fn(),
}));

vi.mock('../components/SlaCountdown', () => ({
  __esModule: true,
  default: function MockSlaCountdown({ deadline, compact }) {
    return (
      <span data-testid="sla-countdown" data-deadline={deadline} data-compact={String(compact)}>
        SLA: {deadline ? new Date(deadline).toISOString() : 'No deadline'}
      </span>
    );
  },
}));

import { getExceptions, reviewException } from '../services/api';

const mockExceptions = {
  exceptions: [
    {
      exceptionId: 101,
      evidenceId: 201,
      employeeId: 'EMP001',
      programId: 1,
      completionDate: '2024-05-01T00:00:00Z',
      score: 55,
      reason: 'Score 55 is significantly below minimum 80 by 25 points.',
      status: 'Open',
      slaDeadline: '2025-06-15T12:00:00Z',
      sLADeadline: '2025-06-15T12:00:00Z',
      sLARemainingHours: 120.5,
      isSLABreached: false,
      reviewerId: null,
      reviewAction: null,
      justification: null,
      reviewedAt: null,
      createdAt: '2024-06-01T10:00:00Z',
    },
    {
      exceptionId: 102,
      evidenceId: 202,
      employeeId: 'EMP002',
      programId: 2,
      completionDate: '2024-04-15T00:00:00Z',
      score: 70,
      reason: 'Score 70 is below minimum 85 by 15 points.',
      status: 'Open',
      slaDeadline: '2025-06-10T08:00:00Z',
      sLADeadline: '2025-06-10T08:00:00Z',
      sLARemainingHours: 48.0,
      isSLABreached: false,
      reviewerId: null,
      reviewAction: null,
      justification: null,
      reviewedAt: null,
      createdAt: '2024-06-02T14:00:00Z',
    },
    {
      exceptionId: 103,
      evidenceId: 203,
      employeeId: 'EMP003',
      programId: 1,
      completionDate: '2024-03-20T00:00:00Z',
      score: 90,
      reason: 'Manual review required.',
      status: 'Approved',
      slaDeadline: '2024-05-01T12:00:00Z',
      sLADeadline: '2024-05-01T12:00:00Z',
      sLARemainingHours: -500,
      isSLABreached: false,
      reviewerId: 'reviewer-1',
      reviewAction: 'Approved',
      justification: 'Verified manually.',
      reviewedAt: '2024-04-28T10:00:00Z',
      createdAt: '2024-04-25T09:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

describe('ExceptionQueuePage', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    getExceptions.mockResolvedValue(mockExceptions);
    reviewException.mockResolvedValue({ exceptionId: 101, status: 'Approved' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page title and description', async () => {
    render(<ExceptionQueuePage />);

    expect(screen.getByText('Exception Queue')).toBeInTheDocument();
    expect(
      screen.getByText('Review and manage flagged compliance exceptions with SLA tracking.')
    ).toBeInTheDocument();
  });

  it('fetches and displays exception list on mount', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(getExceptions).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    expect(screen.getByText('EMP002')).toBeInTheDocument();
    expect(screen.getByText('EMP003')).toBeInTheDocument();
  });

  it('displays total exception count', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('3 exceptions found')).toBeInTheDocument();
    });
  });

  it('renders SLA countdown for each exception', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    const slaCountdowns = screen.getAllByTestId('sla-countdown');
    expect(slaCountdowns.length).toBeGreaterThanOrEqual(2);
  });

  it('renders status badges for exceptions', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    const openBadges = screen.getAllByText('Open');
    expect(openBadges.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('displays error message when fetch fails', async () => {
    getExceptions.mockRejectedValueOnce(new Error('Network error'));

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays API error message when fetch returns error response', async () => {
    getExceptions.mockRejectedValueOnce({
      response: { data: { error: 'Unauthorized access' } },
    });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Unauthorized access')).toBeInTheDocument();
    });
  });

  it('filters exceptions by status', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Status:');
    expect(statusSelect).toBeInTheDocument();

    getExceptions.mockResolvedValueOnce({
      exceptions: [mockExceptions.exceptions[0], mockExceptions.exceptions[1]],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    await user.selectOptions(statusSelect, 'Open');

    await waitFor(() => {
      expect(getExceptions).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        status: 'Open',
      });
    });
  });

  it('opens review drawer when clicking on an exception row', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Review Exception')).toBeInTheDocument();
    expect(screen.getByText('Exception ID')).toBeInTheDocument();
  });

  it('displays exception details in the review drawer', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('101')).toBeInTheDocument();
    expect(within(drawer).getByText('EMP001')).toBeInTheDocument();
    expect(
      within(drawer).getByText('Score 55 is significantly below minimum 80 by 25 points.')
    ).toBeInTheDocument();
  });

  it('shows approve, override, and reject buttons for open exceptions', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /override/i })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('submits approve action successfully', async () => {
    reviewException.mockResolvedValueOnce({ exceptionId: 101, status: 'Approved' });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const approveButton = within(drawer).getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(reviewException).toHaveBeenCalledWith({
        exceptionId: 101,
        action: 'Approved',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/has been approved/i)).toBeInTheDocument();
    });
  });

  it('submits reject action successfully', async () => {
    reviewException.mockResolvedValueOnce({ exceptionId: 101, status: 'Rejected' });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const rejectButton = within(drawer).getByRole('button', { name: /reject/i });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(reviewException).toHaveBeenCalledWith({
        exceptionId: 101,
        action: 'Rejected',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/has been rejected/i)).toBeInTheDocument();
    });
  });

  it('submits override action with justification successfully', async () => {
    reviewException.mockResolvedValueOnce({ exceptionId: 101, status: 'Overridden' });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const justificationInput = within(drawer).getByPlaceholderText(
      /enter justification/i
    );
    await user.type(justificationInput, 'Manual review confirms compliance.');

    const overrideButton = within(drawer).getByRole('button', { name: /override/i });
    await user.click(overrideButton);

    await waitFor(() => {
      expect(reviewException).toHaveBeenCalledWith({
        exceptionId: 101,
        action: 'Overridden',
        justification: 'Manual review confirms compliance.',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/has been overridden/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when override is submitted without justification', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const overrideButton = within(drawer).getByRole('button', { name: /override/i });
    await user.click(overrideButton);

    await waitFor(() => {
      expect(
        screen.getByText('Justification is required for override actions.')
      ).toBeInTheDocument();
    });

    expect(reviewException).not.toHaveBeenCalled();
  });

  it('displays review error when API call fails', async () => {
    reviewException.mockRejectedValueOnce({
      response: { data: { error: 'Exception is no longer open.' } },
    });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const approveButton = within(drawer).getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText('Exception is no longer open.')).toBeInTheDocument();
    });
  });

  it('does not show review buttons for non-open exceptions', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP003')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP003'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).queryByText('Review Exception')).not.toBeInTheDocument();
    expect(
      within(drawer).getByText(/this exception has already been reviewed/i)
    ).toBeInTheDocument();
  });

  it('shows review details for already reviewed exceptions', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP003')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP003'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('Review Details')).toBeInTheDocument();
    expect(within(drawer).getByText('Verified manually.')).toBeInTheDocument();
  });

  it('closes the drawer when close button is clicked', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Exception Details')).not.toBeInTheDocument();
    });
  });

  it('refreshes exception list after successful review', async () => {
    const updatedExceptions = {
      ...mockExceptions,
      exceptions: mockExceptions.exceptions.map((e) =>
        e.exceptionId === 101 ? { ...e, status: 'Approved', reviewAction: 'Approved' } : e
      ),
    };

    getExceptions
      .mockResolvedValueOnce(mockExceptions)
      .mockResolvedValueOnce(updatedExceptions);

    reviewException.mockResolvedValueOnce({ exceptionId: 101, status: 'Approved' });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const approveButton = within(drawer).getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(getExceptions).toHaveBeenCalledTimes(2);
    });
  });

  it('displays score in the exception table', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('displays reason in the exception table', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Score 55 is significantly below minimum 80 by 25 points.')
    ).toBeInTheDocument();
  });

  it('shows SLA breached warning in drawer for breached exceptions', async () => {
    const breachedExceptions = {
      exceptions: [
        {
          ...mockExceptions.exceptions[0],
          isSLABreached: true,
          slaDeadline: '2024-01-01T00:00:00Z',
          sLADeadline: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    getExceptions.mockResolvedValueOnce(breachedExceptions);

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    expect(screen.getByText('SLA has been breached')).toBeInTheDocument();
  });

  it('sends justification with approve action when provided', async () => {
    reviewException.mockResolvedValueOnce({ exceptionId: 101, status: 'Approved' });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const justificationInput = within(drawer).getByPlaceholderText(
      /enter justification/i
    );
    await user.type(justificationInput, 'Looks good after manual check.');

    const approveButton = within(drawer).getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(reviewException).toHaveBeenCalledWith({
        exceptionId: 101,
        action: 'Approved',
        justification: 'Looks good after manual check.',
      });
    });
  });

  it('disables review buttons after successful review', async () => {
    reviewException.mockResolvedValueOnce({ exceptionId: 101, status: 'Approved' });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const approveButton = within(drawer).getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/has been approved/i)).toBeInTheDocument();
    });

    expect(within(drawer).getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(within(drawer).getByRole('button', { name: /override/i })).toBeDisabled();
    expect(within(drawer).getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('renders empty state when no exceptions found', async () => {
    getExceptions.mockResolvedValueOnce({
      exceptions: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('No exceptions found.')).toBeInTheDocument();
    });

    expect(screen.getByText('0 exceptions found')).toBeInTheDocument();
  });

  it('handles page size change', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    expect(getExceptions).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it('clears justification error when user types in the field', async () => {
    render(<ExceptionQueuePage />);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EMP001'));

    await waitFor(() => {
      expect(screen.getByText('Exception Details')).toBeInTheDocument();
    });

    const drawer = screen.getByRole('dialog');
    const overrideButton = within(drawer).getByRole('button', { name: /override/i });
    await user.click(overrideButton);

    await waitFor(() => {
      expect(
        screen.getByText('Justification is required for override actions.')
      ).toBeInTheDocument();
    });

    const justificationInput = within(drawer).getByPlaceholderText(
      /enter justification/i
    );
    await user.type(justificationInput, 'A');

    await waitFor(() => {
      expect(
        screen.queryByText('Justification is required for override actions.')
      ).not.toBeInTheDocument();
    });
  });
});