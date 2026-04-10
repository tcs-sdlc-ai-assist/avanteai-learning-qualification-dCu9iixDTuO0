import PropTypes from 'prop-types';

const STATUS_STYLES = {
  // Program statuses
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-800',
  Archived: 'bg-gray-200 text-gray-600',

  // Evidence statuses
  Pending: 'bg-yellow-100 text-yellow-800',
  Validated: 'bg-green-100 text-green-800',
  Flagged: 'bg-red-100 text-red-800',
  Rejected: 'bg-red-200 text-red-900',

  // Policy statuses
  Draft: 'bg-blue-100 text-blue-800',
  Deprecated: 'bg-gray-200 text-gray-600',

  // Exception statuses
  Open: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Overridden: 'bg-orange-100 text-orange-800',

  // Confidence levels
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',

  // SLA statuses
  OnTrack: 'bg-green-100 text-green-800',
  AtRisk: 'bg-yellow-100 text-yellow-800',
  Breached: 'bg-red-200 text-red-900',

  // Compliance statuses
  Compliant: 'bg-green-100 text-green-800',
  NonCompliant: 'bg-red-100 text-red-800',
  PartiallyCompliant: 'bg-yellow-100 text-yellow-800',
  PendingReview: 'bg-blue-100 text-blue-800',
  NotApplicable: 'bg-gray-100 text-gray-600',
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const DEFAULT_STYLE = 'bg-gray-100 text-gray-800';

function formatLabel(status) {
  if (!status || typeof status !== 'string') {
    return '';
  }

  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function StatusBadge({ status, size = 'md', className = '' }) {
  if (!status) {
    return null;
  }

  const colorClasses = STATUS_STYLES[status] || DEFAULT_STYLE;
  const sizeClasses = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const label = formatLabel(status);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-tight ${colorClasses} ${sizeClasses} ${className}`.trim()}
    >
      {label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default StatusBadge;