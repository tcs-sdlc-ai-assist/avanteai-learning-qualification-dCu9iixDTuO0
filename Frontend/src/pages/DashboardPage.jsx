import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardSummary,
  getExceptionTrends,
  getSlaMetrics,
  getOverdueTraining,
} from '../services/api';
import DonutChart from '../components/DonutChart';
import TrendChart from '../components/TrendChart';
import DataTable from '../components/DataTable';
import { Spinner } from '../components/Spinner';
import { formatDateTime, formatPercentageValue } from '../utils/formatters';

function StatCard({ title, value, subtitle, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const colorClasses = colorMap[color] || colorMap.blue;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${colorClasses.split(' ')[1]}`}>{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}

const OVERDUE_COLUMNS = [
  {
    key: 'employeeName',
    header: 'Employee',
    sortable: true,
    render: (value) => (
      <span className="font-medium text-gray-900">{value || '—'}</span>
    ),
  },
  {
    key: 'courseName',
    header: 'Course',
    sortable: true,
    render: (value) => (
      <span className="text-gray-700">{value || '—'}</span>
    ),
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    sortable: true,
    render: (value) => (
      <span className="text-gray-500 text-sm">{formatDateTime(value)}</span>
    ),
  },
  {
    key: 'daysOverdue',
    header: 'Days Overdue',
    sortable: true,
    render: (value) => {
      const days = value ?? 0;
      let colorClass = 'text-yellow-600';
      if (days > 30) {
        colorClass = 'text-red-600';
      } else if (days > 14) {
        colorClass = 'text-orange-600';
      }
      return (
        <span className={`font-semibold ${colorClass}`}>
          {days} day{days !== 1 ? 's' : ''}
        </span>
      );
    },
  },
];

function getRoleSections(role) {
  const normalizedRole = (role || '').toLowerCase();

  if (normalizedRole === 'admin') {
    return {
      showSummary: true,
      showComplianceDonut: true,
      showSlaDonut: true,
      showExceptionTrends: true,
      showOverdueTraining: true,
      greeting: 'Administrator Dashboard',
      description: 'Full system overview with compliance metrics, SLA tracking, and exception trends.',
    };
  }

  if (normalizedRole === 'learningmanager') {
    return {
      showSummary: true,
      showComplianceDonut: true,
      showSlaDonut: false,
      showExceptionTrends: true,
      showOverdueTraining: true,
      greeting: 'Learning Manager Dashboard',
      description: 'Compliance overview with training progress and exception monitoring.',
    };
  }

  if (normalizedRole === 'qualificationsteam') {
    return {
      showSummary: true,
      showComplianceDonut: false,
      showSlaDonut: true,
      showExceptionTrends: true,
      showOverdueTraining: false,
      greeting: 'Qualifications Team Dashboard',
      description: 'Exception review focus with SLA metrics and trend analysis.',
    };
  }

  if (normalizedRole === 'sharedservices') {
    return {
      showSummary: true,
      showComplianceDonut: false,
      showSlaDonut: true,
      showExceptionTrends: false,
      showOverdueTraining: true,
      greeting: 'Shared Services Dashboard',
      description: 'SLA compliance metrics and overdue training tracking.',
    };
  }

  if (normalizedRole === 'auditor') {
    return {
      showSummary: true,
      showComplianceDonut: true,
      showSlaDonut: true,
      showExceptionTrends: true,
      showOverdueTraining: false,
      greeting: 'Auditor Dashboard',
      description: 'Compliance audit overview with exception trends and SLA metrics.',
    };
  }

  return {
    showSummary: true,
    showComplianceDonut: true,
    showSlaDonut: false,
    showExceptionTrends: true,
    showOverdueTraining: true,
    greeting: 'Dashboard',
    description: 'Compliance overview and key metrics.',
  };
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [exceptionTrends, setExceptionTrends] = useState([]);
  const [slaMetrics, setSlaMetrics] = useState(null);
  const [overdueTraining, setOverdueTraining] = useState([]);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [slaLoading, setSlaLoading] = useState(true);
  const [overdueLoading, setOverdueLoading] = useState(true);

  const [summaryError, setSummaryError] = useState('');
  const [trendsError, setTrendsError] = useState('');
  const [slaError, setSlaError] = useState('');
  const [overdueError, setOverdueError] = useState('');

  const [overduePage, setOverduePage] = useState(1);
  const [overduePageSize, setOverduePageSize] = useState(10);
  const [overdueSortConfig, setOverdueSortConfig] = useState(null);

  const roleSections = useMemo(() => getRoleSections(user?.role), [user?.role]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load dashboard summary.';
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchExceptionTrends = useCallback(async () => {
    setTrendsLoading(true);
    setTrendsError('');
    try {
      const data = await getExceptionTrends();
      const trends = Array.isArray(data) ? data : [];
      setExceptionTrends(trends);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load exception trends.';
      setTrendsError(message);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  const fetchSlaMetrics = useCallback(async () => {
    setSlaLoading(true);
    setSlaError('');
    try {
      const data = await getSlaMetrics();
      setSlaMetrics(data);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load SLA metrics.';
      setSlaError(message);
    } finally {
      setSlaLoading(false);
    }
  }, []);

  const fetchOverdueTraining = useCallback(async () => {
    setOverdueLoading(true);
    setOverdueError('');
    try {
      const data = await getOverdueTraining();
      const items = Array.isArray(data) ? data : [];
      setOverdueTraining(items);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load overdue training data.';
      setOverdueError(message);
    } finally {
      setOverdueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleSections.showSummary) {
      fetchSummary();
    }
    if (roleSections.showExceptionTrends) {
      fetchExceptionTrends();
    }
    if (roleSections.showSlaDonut) {
      fetchSlaMetrics();
    }
    if (roleSections.showOverdueTraining) {
      fetchOverdueTraining();
    }
  }, [
    roleSections,
    fetchSummary,
    fetchExceptionTrends,
    fetchSlaMetrics,
    fetchOverdueTraining,
  ]);

  const complianceDonutData = useMemo(() => {
    if (!summary) return [];
    const validated = summary.totalEvidence > 0
      ? Math.round((summary.complianceRate / 100) * summary.totalEvidence)
      : 0;
    const nonCompliant = summary.totalEvidence - validated;
    return [
      { name: 'Compliant', value: Math.max(0, validated) },
      { name: 'Non-Compliant', value: Math.max(0, nonCompliant) },
    ];
  }, [summary]);

  const slaDonutData = useMemo(() => {
    if (!slaMetrics) return [];
    return [
      { name: 'On Time', value: slaMetrics.onTimeCount || 0 },
      { name: 'Breached', value: slaMetrics.breachedCount || 0 },
      { name: 'Pending', value: slaMetrics.pendingCount || 0 },
    ];
  }, [slaMetrics]);

  const trendChartData = useMemo(() => {
    return exceptionTrends.map((item) => ({
      date: item.date,
      open: item.openCount ?? 0,
      resolved: item.resolvedCount ?? 0,
      escalated: item.escalatedCount ?? 0,
    }));
  }, [exceptionTrends]);

  const trendSeries = useMemo(() => [
    { dataKey: 'open', name: 'Open', color: '#f59e0b' },
    { dataKey: 'resolved', name: 'Resolved', color: '#10b981' },
    { dataKey: 'escalated', name: 'Escalated', color: '#ef4444' },
  ], []);

  const sortedOverdueTraining = useMemo(() => {
    if (!overdueSortConfig || !overdueTraining.length) return overdueTraining;
    const sorted = [...overdueTraining].sort((a, b) => {
      let aVal = a[overdueSortConfig.key];
      let bVal = b[overdueSortConfig.key];

      if (overdueSortConfig.key === 'dueDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return overdueSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return overdueSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [overdueTraining, overdueSortConfig]);

  const pagedOverdueTraining = useMemo(() => {
    const start = (overduePage - 1) * overduePageSize;
    return sortedOverdueTraining.slice(start, start + overduePageSize);
  }, [sortedOverdueTraining, overduePage, overduePageSize]);

  const handleOverduePageChange = useCallback((newPage) => {
    setOverduePage(newPage);
  }, []);

  const handleOverduePageSizeChange = useCallback((newSize) => {
    setOverduePageSize(newSize);
    setOverduePage(1);
  }, []);

  const handleOverdueSort = useCallback((key, direction) => {
    setOverdueSortConfig({ key, direction });
  }, []);

  const isFullyLoading = summaryLoading && trendsLoading && slaLoading && overdueLoading;

  if (isFullyLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" color="blue" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{roleSections.greeting}</h1>
        <p className="mt-1 text-sm text-gray-500">{roleSections.description}</p>
        {user && (
          <p className="mt-1 text-xs text-gray-400">
            Welcome back, {user.fullName || user.email}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      {roleSections.showSummary && (
        <>
          {summaryError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-red-400"
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
                <p className="text-sm text-red-700">{summaryError}</p>
              </div>
              <button
                type="button"
                onClick={fetchSummary}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none"
              >
                Try again
              </button>
            </div>
          )}

          {summaryLoading && !summary && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          )}

          {summary && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard
                title="Total Programs"
                value={summary.totalPrograms ?? 0}
                subtitle="Active compliance programs"
                color="indigo"
              />
              <StatCard
                title="Total Evidence"
                value={summary.totalEvidence ?? 0}
                subtitle="Uploaded records"
                color="blue"
              />
              <StatCard
                title="Compliance Rate"
                value={formatPercentageValue(summary.complianceRate, { isDecimal: false, decimalPlaces: 1 })}
                subtitle="Evidence validated"
                color="green"
              />
              <StatCard
                title="Pending Exceptions"
                value={summary.pendingExceptions ?? 0}
                subtitle="Awaiting review"
                color="yellow"
              />
              <StatCard
                title="Resolved Exceptions"
                value={summary.resolvedExceptions ?? 0}
                subtitle="Reviewed & closed"
                color="green"
              />
              <StatCard
                title="Total Alerts"
                value={summary.totalAlerts ?? 0}
                subtitle="Your notifications"
                color="orange"
              />
            </div>
          )}
        </>
      )}

      {/* Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compliance Donut */}
        {roleSections.showComplianceDonut && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" color="blue" />
              </div>
            ) : summaryError ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                Unable to load compliance data
              </div>
            ) : (
              <DonutChart
                data={complianceDonutData}
                title="Compliance Overview"
                colors={['#4ade80', '#f87171']}
                height={280}
                innerRadius={55}
                outerRadius={95}
                showLegend
                showTooltip
                showLabels
              />
            )}
          </div>
        )}

        {/* SLA Donut */}
        {roleSections.showSlaDonut && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {slaLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" color="blue" />
              </div>
            ) : slaError ? (
              <div className="py-4">
                <div className="flex items-center justify-center text-sm text-gray-400">
                  Unable to load SLA metrics
                </div>
                <button
                  type="button"
                  onClick={fetchSlaMetrics}
                  className="mt-2 block mx-auto text-sm font-medium text-avante-600 hover:text-avante-700 focus:outline-none"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <DonutChart
                  data={slaDonutData}
                  title="SLA Compliance"
                  colors={['#4ade80', '#f87171', '#facc15']}
                  height={280}
                  innerRadius={55}
                  outerRadius={95}
                  showLegend
                  showTooltip
                  showLabels
                />
                {slaMetrics && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-semibold text-green-600">
                        {formatPercentageValue(slaMetrics.onTimePercentage, { isDecimal: false, decimalPlaces: 1 })}
                      </p>
                      <p className="text-gray-500">On Time</p>
                    </div>
                    <div>
                      <p className="font-semibold text-red-600">
                        {formatPercentageValue(slaMetrics.breachedPercentage, { isDecimal: false, decimalPlaces: 1 })}
                      </p>
                      <p className="text-gray-500">Breached</p>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-600">
                        {formatPercentageValue(slaMetrics.pendingPercentage, { isDecimal: false, decimalPlaces: 1 })}
                      </p>
                      <p className="text-gray-500">Pending</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Exception Trends */}
      {roleSections.showExceptionTrends && (
        <div className="mb-6">
          {trendsError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-red-400"
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
                <p className="text-sm text-red-700">{trendsError}</p>
              </div>
              <button
                type="button"
                onClick={fetchExceptionTrends}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none"
              >
                Try again
              </button>
            </div>
          )}

          {trendsLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" color="blue" />
                <span className="ml-2 text-sm text-gray-500">Loading exception trends...</span>
              </div>
            </div>
          ) : (
            <TrendChart
              data={trendChartData}
              series={trendSeries}
              title="Exception Trends (Last 30 Days)"
              height={320}
              dateKey="date"
              showLegend
              showGrid
              fillOpacity={0.15}
            />
          )}
        </div>
      )}

      {/* Overdue Training */}
      {roleSections.showOverdueTraining && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Overdue Training</h2>
              <p className="text-sm text-gray-500">
                Employees with pending or overdue compliance training.
              </p>
            </div>
            {!overdueLoading && overdueTraining.length > 0 && (
              <span className="text-sm text-gray-400">
                {overdueTraining.length} record{overdueTraining.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {overdueError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-red-400"
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
                <p className="text-sm text-red-700">{overdueError}</p>
              </div>
              <button
                type="button"
                onClick={fetchOverdueTraining}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none"
              >
                Try again
              </button>
            </div>
          )}

          <DataTable
            columns={OVERDUE_COLUMNS}
            data={pagedOverdueTraining}
            total={sortedOverdueTraining.length}
            page={overduePage}
            pageSize={overduePageSize}
            onPageChange={handleOverduePageChange}
            onPageSizeChange={handleOverduePageSizeChange}
            sortConfig={overdueSortConfig}
            onSort={handleOverdueSort}
            isLoading={overdueLoading}
            emptyMessage="No overdue training records found."
            rowKey={(row, index) => `${row.employeeName}-${row.courseName}-${index}`}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      )}
    </div>
  );
}