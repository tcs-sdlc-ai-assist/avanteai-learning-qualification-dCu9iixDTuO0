import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/api', () => ({
  getDashboardSummary: vi.fn(),
  getExceptionTrends: vi.fn(),
  getSlaMetrics: vi.fn(),
  getOverdueTraining: vi.fn(),
}));

vi.mock('../components/DonutChart', () => ({
  __esModule: true,
  default: function MockDonutChart({ title, data }) {
    return (
      <div data-testid="donut-chart" data-title={title}>
        {title && <span>{title}</span>}
        {data && data.map((d, i) => (
          <span key={i} data-testid={`donut-item-${i}`}>{d.name}: {d.value}</span>
        ))}
      </div>
    );
  },
  DonutChart: function MockDonutChartNamed({ title, data }) {
    return (
      <div data-testid="donut-chart" data-title={title}>
        {title && <span>{title}</span>}
        {data && data.map((d, i) => (
          <span key={i} data-testid={`donut-item-${i}`}>{d.name}: {d.value}</span>
        ))}
      </div>
    );
  },
}));

vi.mock('../components/TrendChart', () => ({
  __esModule: true,
  default: function MockTrendChart({ title, data }) {
    return (
      <div data-testid="trend-chart" data-title={title}>
        {title && <span>{title}</span>}
        <span data-testid="trend-data-count">{data ? data.length : 0} points</span>
      </div>
    );
  },
}));

vi.mock('../components/DataTable', () => ({
  __esModule: true,
  default: function MockDataTable({ data, isLoading, emptyMessage, columns }) {
    if (isLoading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }
    if (!data || data.length === 0) {
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    }
    return (
      <div data-testid="data-table">
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
              <tr key={idx} data-testid={`overdue-row-${idx}`}>
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
  DataTable: function MockDataTableNamed({ data, isLoading, emptyMessage, columns }) {
    if (isLoading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }
    if (!data || data.length === 0) {
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    }
    return (
      <div data-testid="data-table">
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
              <tr key={idx} data-testid={`overdue-row-${idx}`}>
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

vi.mock('../components/Spinner', () => ({
  Spinner: function MockSpinner({ size }) {
    return <div data-testid="spinner" data-size={size}>Loading...</div>;
  },
  default: function MockSpinnerDefault({ size }) {
    return <div data-testid="spinner" data-size={size}>Loading...</div>;
  },
}));

import { useAuth } from '../context/AuthContext';
import {
  getDashboardSummary,
  getExceptionTrends,
  getSlaMetrics,
  getOverdueTraining,
} from '../services/api';

const mockSummary = {
  totalPrograms: 5,
  totalEvidence: 120,
  complianceRate: 85.5,
  pendingExceptions: 8,
  resolvedExceptions: 42,
  totalAlerts: 3,
};

const mockExceptionTrends = [
  { date: '2024-05-01T00:00:00Z', count: 5, openCount: 3, resolvedCount: 2, escalatedCount: 0 },
  { date: '2024-05-02T00:00:00Z', count: 3, openCount: 1, resolvedCount: 2, escalatedCount: 0 },
  { date: '2024-05-03T00:00:00Z', count: 7, openCount: 4, resolvedCount: 2, escalatedCount: 1 },
];

const mockSlaMetrics = {
  onTimePercentage: 75.0,
  breachedPercentage: 15.0,
  pendingPercentage: 10.0,
  totalItems: 20,
  onTimeCount: 15,
  breachedCount: 3,
  pendingCount: 2,
};

const mockOverdueTraining = [
  {
    employeeName: 'John Doe',
    courseName: 'Annual Compliance Training',
    dueDate: '2024-04-01T00:00:00Z',
    daysOverdue: 45,
  },
  {
    employeeName: 'Jane Smith',
    courseName: 'AML Certification',
    dueDate: '2024-03-15T00:00:00Z',
    daysOverdue: 62,
  },
];

function setupMocks(overrides = {}) {
  getDashboardSummary.mockResolvedValue(overrides.summary ?? mockSummary);
  getExceptionTrends.mockResolvedValue(overrides.trends ?? mockExceptionTrends);
  getSlaMetrics.mockResolvedValue(overrides.slaMetrics ?? mockSlaMetrics);
  getOverdueTraining.mockResolvedValue(overrides.overdueTraining ?? mockOverdueTraining);
}

function setUser(role = 'Admin', fullName = 'Test User', email = 'test@avante.com') {
  useAuth.mockReturnValue({
    user: { id: 'user-1', email, fullName, role },
    isAuthenticated: true,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUser('Admin');
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering and Layout', () => {
    it('renders the dashboard title for Admin role', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Administrator Dashboard')).toBeInTheDocument();
      });
    });

    it('renders the dashboard description for Admin role', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Full system overview with compliance metrics, SLA tracking, and exception trends.')
        ).toBeInTheDocument();
      });
    });

    it('renders welcome message with user name', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Test User/)).toBeInTheDocument();
      });
    });
  });

  describe('Summary Cards', () => {
    it('displays summary cards with correct values', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Programs')).toBeInTheDocument();
      });

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays compliance rate as percentage', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
      });

      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });

    it('displays all summary card labels', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Programs')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Evidence')).toBeInTheDocument();
      expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
      expect(screen.getByText('Pending Exceptions')).toBeInTheDocument();
      expect(screen.getByText('Resolved Exceptions')).toBeInTheDocument();
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when all data is loading', async () => {
      let resolveSummary;
      let resolveTrends;
      let resolveSla;
      let resolveOverdue;

      getDashboardSummary.mockReturnValue(new Promise((resolve) => { resolveSummary = resolve; }));
      getExceptionTrends.mockReturnValue(new Promise((resolve) => { resolveTrends = resolve; }));
      getSlaMetrics.mockReturnValue(new Promise((resolve) => { resolveSla = resolve; }));
      getOverdueTraining.mockReturnValue(new Promise((resolve) => { resolveOverdue = resolve; }));

      render(<DashboardPage />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();

      resolveSummary(mockSummary);
      resolveTrends(mockExceptionTrends);
      resolveSla(mockSlaMetrics);
      resolveOverdue(mockOverdueTraining);

      await waitFor(() => {
        expect(screen.getByText('Administrator Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('API Error Handling', () => {
    it('shows error message when summary fetch fails', async () => {
      getDashboardSummary.mockRejectedValue(new Error('Failed to load dashboard summary.'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard summary.')).toBeInTheDocument();
      });
    });

    it('shows try again button when summary fetch fails', async () => {
      getDashboardSummary.mockRejectedValue(new Error('Failed to load dashboard summary.'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard summary.')).toBeInTheDocument();
      });

      const tryAgainButtons = screen.getAllByText('Try again');
      expect(tryAgainButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows error message when exception trends fetch fails', async () => {
      getExceptionTrends.mockRejectedValue(new Error('Failed to load exception trends.'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load exception trends.')).toBeInTheDocument();
      });
    });

    it('shows error message when SLA metrics fetch fails', async () => {
      getSlaMetrics.mockRejectedValue(new Error('Failed to load SLA metrics.'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load SLA metrics/)).toBeInTheDocument();
      });
    });

    it('shows error message when overdue training fetch fails', async () => {
      getOverdueTraining.mockRejectedValue(new Error('Failed to load overdue training data.'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load overdue training data.')).toBeInTheDocument();
      });
    });

    it('shows API error message from response data', async () => {
      getDashboardSummary.mockRejectedValue({
        response: { data: { error: 'Unauthorized access to dashboard.' } },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Unauthorized access to dashboard.')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Components', () => {
    it('renders compliance donut chart for Admin role', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
      });
    });

    it('renders SLA donut chart for Admin role', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
      });
    });

    it('renders exception trends chart for Admin role', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
      });
    });

    it('renders SLA percentage metrics below SLA donut', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
      });

      expect(screen.getByText('75.0%')).toBeInTheDocument();
      expect(screen.getByText('15.0%')).toBeInTheDocument();
      expect(screen.getByText('10.0%')).toBeInTheDocument();
    });
  });

  describe('Overdue Training Table', () => {
    it('renders overdue training section for Admin role', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Overdue Training')).toBeInTheDocument();
      });
    });

    it('displays overdue training record count', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('2 records')).toBeInTheDocument();
      });
    });

    it('renders overdue training data in table', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Annual Compliance Training')).toBeInTheDocument();
      expect(screen.getByText('AML Certification')).toBeInTheDocument();
    });

    it('shows empty message when no overdue training exists', async () => {
      getOverdueTraining.mockResolvedValue([]);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No overdue training records found.')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Content Visibility', () => {
    describe('Admin Role', () => {
      beforeEach(() => {
        setUser('Admin');
        setupMocks();
      });

      it('shows all dashboard sections', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Administrator Dashboard')).toBeInTheDocument();
        });

        expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
        expect(screen.getByText('Overdue Training')).toBeInTheDocument();
      });

      it('calls all API endpoints', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(getDashboardSummary).toHaveBeenCalledTimes(1);
        });

        expect(getExceptionTrends).toHaveBeenCalledTimes(1);
        expect(getSlaMetrics).toHaveBeenCalledTimes(1);
        expect(getOverdueTraining).toHaveBeenCalledTimes(1);
      });
    });

    describe('LearningManager Role', () => {
      beforeEach(() => {
        setUser('LearningManager');
        setupMocks();
      });

      it('shows Learning Manager dashboard title', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Learning Manager Dashboard')).toBeInTheDocument();
        });
      });

      it('shows compliance donut but not SLA donut', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
        });

        expect(screen.queryByText('SLA Compliance')).not.toBeInTheDocument();
      });

      it('shows exception trends and overdue training', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
        });

        expect(screen.getByText('Overdue Training')).toBeInTheDocument();
      });

      it('does not call getSlaMetrics', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(getDashboardSummary).toHaveBeenCalledTimes(1);
        });

        expect(getSlaMetrics).not.toHaveBeenCalled();
        expect(getExceptionTrends).toHaveBeenCalledTimes(1);
        expect(getOverdueTraining).toHaveBeenCalledTimes(1);
      });
    });

    describe('QualificationsTeam Role', () => {
      beforeEach(() => {
        setUser('QualificationsTeam');
        setupMocks();
      });

      it('shows Qualifications Team dashboard title', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Qualifications Team Dashboard')).toBeInTheDocument();
        });
      });

      it('shows SLA donut but not compliance donut', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
        });

        expect(screen.queryByText('Compliance Overview')).not.toBeInTheDocument();
      });

      it('shows exception trends but not overdue training', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
        });

        expect(screen.queryByText('Overdue Training')).not.toBeInTheDocument();
      });

      it('does not call getOverdueTraining', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(getDashboardSummary).toHaveBeenCalledTimes(1);
        });

        expect(getOverdueTraining).not.toHaveBeenCalled();
        expect(getSlaMetrics).toHaveBeenCalledTimes(1);
        expect(getExceptionTrends).toHaveBeenCalledTimes(1);
      });
    });

    describe('SharedServices Role', () => {
      beforeEach(() => {
        setUser('SharedServices');
        setupMocks();
      });

      it('shows Shared Services dashboard title', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Shared Services Dashboard')).toBeInTheDocument();
        });
      });

      it('shows SLA donut and overdue training but not compliance donut or exception trends', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
        });

        expect(screen.getByText('Overdue Training')).toBeInTheDocument();
        expect(screen.queryByText('Compliance Overview')).not.toBeInTheDocument();
        expect(screen.queryByText('Exception Trends (Last 30 Days)')).not.toBeInTheDocument();
      });

      it('does not call getExceptionTrends', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(getDashboardSummary).toHaveBeenCalledTimes(1);
        });

        expect(getExceptionTrends).not.toHaveBeenCalled();
        expect(getSlaMetrics).toHaveBeenCalledTimes(1);
        expect(getOverdueTraining).toHaveBeenCalledTimes(1);
      });
    });

    describe('Auditor Role', () => {
      beforeEach(() => {
        setUser('Auditor');
        setupMocks();
      });

      it('shows Auditor dashboard title', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Auditor Dashboard')).toBeInTheDocument();
        });
      });

      it('shows compliance donut, SLA donut, and exception trends but not overdue training', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
        });

        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
        expect(screen.queryByText('Overdue Training')).not.toBeInTheDocument();
      });

      it('does not call getOverdueTraining', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(getDashboardSummary).toHaveBeenCalledTimes(1);
        });

        expect(getOverdueTraining).not.toHaveBeenCalled();
        expect(getSlaMetrics).toHaveBeenCalledTimes(1);
        expect(getExceptionTrends).toHaveBeenCalledTimes(1);
      });
    });

    describe('Unknown/Default Role', () => {
      beforeEach(() => {
        setUser('Viewer');
        setupMocks();
      });

      it('shows default dashboard title', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });
      });

      it('shows compliance donut and exception trends and overdue training but not SLA donut', async () => {
        render(<DashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
        });

        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
        expect(screen.getByText('Overdue Training')).toBeInTheDocument();
        expect(screen.queryByText('SLA Compliance')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Transformation', () => {
    it('computes compliance donut data from summary', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
      });

      const donutCharts = screen.getAllByTestId('donut-chart');
      const complianceChart = donutCharts.find(
        (el) => el.getAttribute('data-title') === 'Compliance Overview'
      );
      expect(complianceChart).toBeTruthy();
    });

    it('computes SLA donut data from SLA metrics', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
      });

      const donutCharts = screen.getAllByTestId('donut-chart');
      const slaChart = donutCharts.find(
        (el) => el.getAttribute('data-title') === 'SLA Compliance'
      );
      expect(slaChart).toBeTruthy();
    });

    it('transforms exception trends for trend chart', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
      });

      const trendChart = screen.getByTestId('trend-chart');
      expect(trendChart).toBeInTheDocument();
      expect(screen.getByTestId('trend-data-count')).toHaveTextContent('3 points');
    });
  });

  describe('Zero Data Scenarios', () => {
    it('handles zero compliance rate', async () => {
      setupMocks({
        summary: {
          ...mockSummary,
          totalEvidence: 0,
          complianceRate: 0,
        },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
      });

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('handles empty exception trends', async () => {
      setupMocks({ trends: [] });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
      });

      expect(screen.getByTestId('trend-data-count')).toHaveTextContent('0 points');
    });

    it('handles zero SLA metrics', async () => {
      setupMocks({
        slaMetrics: {
          onTimePercentage: 0,
          breachedPercentage: 0,
          pendingPercentage: 0,
          totalItems: 0,
          onTimeCount: 0,
          breachedCount: 0,
          pendingCount: 0,
        },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
      });
    });

    it('handles null user gracefully', async () => {
      useAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      setupMocks();

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('calls getDashboardSummary on mount', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(getDashboardSummary).toHaveBeenCalledTimes(1);
      });
    });

    it('calls getExceptionTrends on mount for Admin', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(getExceptionTrends).toHaveBeenCalledTimes(1);
      });
    });

    it('calls getSlaMetrics on mount for Admin', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(getSlaMetrics).toHaveBeenCalledTimes(1);
      });
    });

    it('calls getOverdueTraining on mount for Admin', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(getOverdueTraining).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Partial Loading States', () => {
    it('shows summary cards while trends are still loading', async () => {
      let resolveTrends;
      getExceptionTrends.mockReturnValue(new Promise((resolve) => { resolveTrends = resolve; }));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Programs')).toBeInTheDocument();
      });

      expect(screen.getByText('5')).toBeInTheDocument();

      resolveTrends(mockExceptionTrends);

      await waitFor(() => {
        expect(screen.getByText('Exception Trends (Last 30 Days)')).toBeInTheDocument();
      });
    });

    it('shows summary cards while SLA metrics are still loading', async () => {
      let resolveSla;
      getSlaMetrics.mockReturnValue(new Promise((resolve) => { resolveSla = resolve; }));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Programs')).toBeInTheDocument();
      });

      resolveSla(mockSlaMetrics);

      await waitFor(() => {
        expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
      });
    });
  });

  describe('Overdue Training Days Display', () => {
    it('renders days overdue with correct values', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText(/45 days/)).toBeInTheDocument();
      expect(screen.getByText(/62 days/)).toBeInTheDocument();
    });
  });
});