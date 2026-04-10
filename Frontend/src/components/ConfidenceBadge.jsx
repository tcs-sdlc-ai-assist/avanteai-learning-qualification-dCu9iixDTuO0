import PropTypes from 'prop-types';

const CONFIDENCE_CONFIG = {
  High: {
    label: 'High',
    classes: 'bg-green-100 text-green-800',
  },
  Medium: {
    label: 'Medium',
    classes: 'bg-yellow-100 text-yellow-800',
  },
  Low: {
    label: 'Low',
    classes: 'bg-red-100 text-red-800',
  },
};

const DEFAULT_CONFIG = {
  label: 'Unknown',
  classes: 'bg-gray-100 text-gray-800',
};

export function ConfidenceBadge({ level, size = 'md' }) {
  const config = CONFIDENCE_CONFIG[level] || DEFAULT_CONFIG;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.classes} ${sizeClass}`}
      role="status"
      aria-label={`Confidence level: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

ConfidenceBadge.propTypes = {
  level: PropTypes.oneOf(['High', 'Medium', 'Low']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

ConfidenceBadge.defaultProps = {
  level: undefined,
  size: 'md',
};

export default ConfidenceBadge;