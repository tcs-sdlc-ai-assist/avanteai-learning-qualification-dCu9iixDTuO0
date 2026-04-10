import React from 'react';
import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DEFAULT_COLORS = [
  '#4ade80',
  '#f87171',
  '#facc15',
  '#60a5fa',
  '#c084fc',
  '#fb923c',
  '#2dd4bf',
  '#f472b6',
];

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) {
    return null;
  }
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomTooltipContent({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const entry = payload[0];
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-md border border-gray-200">
      <p className="text-sm font-medium text-gray-700">{entry.name}</p>
      <p className="text-sm text-gray-900 font-semibold">{entry.value}</p>
    </div>
  );
}

CustomTooltipContent.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
};

CustomTooltipContent.defaultProps = {
  active: false,
  payload: [],
};

export function DonutChart({
  data,
  colors,
  width,
  height,
  innerRadius,
  outerRadius,
  title,
  showLegend,
  showTooltip,
  showLabels,
}) {
  const chartColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS;

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ width: width || '100%', height: height || 300 }}
      >
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h3 className="text-base font-semibold text-gray-700 mb-2">{title}</h3>
      )}
      <ResponsiveContainer width={width || '100%'} height={height || 300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
            label={showLabels ? renderCustomLabel : false}
            labelLine={false}
            isAnimationActive={true}
            animationDuration={600}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}-${index}`}
                fill={chartColors[index % chartColors.length]}
                stroke="none"
              />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<CustomTooltipContent />} />}
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span className="text-sm text-gray-600">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

DonutChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.number,
  innerRadius: PropTypes.number,
  outerRadius: PropTypes.number,
  title: PropTypes.string,
  showLegend: PropTypes.bool,
  showTooltip: PropTypes.bool,
  showLabels: PropTypes.bool,
};

DonutChart.defaultProps = {
  colors: DEFAULT_COLORS,
  width: '100%',
  height: 300,
  innerRadius: 60,
  outerRadius: 100,
  title: '',
  showLegend: true,
  showTooltip: true,
  showLabels: true,
};

export default DonutChart;