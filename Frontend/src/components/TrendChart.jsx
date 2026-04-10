import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const DEFAULT_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

const DEFAULT_SERIES = [
  { dataKey: 'count', name: 'Exceptions', color: DEFAULT_COLORS[0] },
];

function formatDateTick(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltipContent({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formattedLabel = formatDateTick(label);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        {formattedLabel}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

CustomTooltipContent.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      dataKey: PropTypes.string,
      name: PropTypes.string,
      value: PropTypes.number,
      color: PropTypes.string,
    })
  ),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

CustomTooltipContent.defaultProps = {
  active: false,
  payload: [],
  label: '',
};

function TrendChart({
  data,
  series,
  title,
  height,
  dateKey,
  showLegend,
  showGrid,
  fillOpacity,
}) {
  const resolvedSeries = useMemo(() => {
    if (series && series.length > 0) {
      return series.map((s, index) => ({
        dataKey: s.dataKey,
        name: s.name || s.dataKey,
        color: s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
    }
    return DEFAULT_SERIES;
  }, [series]);

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        {title && (
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        )}
        <div
          className="flex items-center justify-center text-gray-400 dark:text-gray-500"
          style={{ height }}
        >
          <p className="text-sm">No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={dateKey}
            tickFormatter={formatDateTick}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            dx={-4}
          />
          <Tooltip content={<CustomTooltipContent />} />
          {showLegend && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
          )}
          {resolvedSeries.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={fillOpacity}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

TrendChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      count: PropTypes.number,
    })
  ),
  series: PropTypes.arrayOf(
    PropTypes.shape({
      dataKey: PropTypes.string.isRequired,
      name: PropTypes.string,
      color: PropTypes.string,
    })
  ),
  title: PropTypes.string,
  height: PropTypes.number,
  dateKey: PropTypes.string,
  showLegend: PropTypes.bool,
  showGrid: PropTypes.bool,
  fillOpacity: PropTypes.number,
};

TrendChart.defaultProps = {
  data: [],
  series: null,
  title: '',
  height: 300,
  dateKey: 'date',
  showLegend: true,
  showGrid: true,
  fillOpacity: 0.15,
};

export default TrendChart;