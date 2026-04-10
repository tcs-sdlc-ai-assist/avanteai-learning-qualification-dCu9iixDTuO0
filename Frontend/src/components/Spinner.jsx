import PropTypes from 'prop-types';

export function Spinner({ size = 'md', color = 'blue' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const colorClass = colorClasses[color] || colorClasses.blue;

  return (
    <div className="flex items-center justify-center" role="status" aria-label="Loading">
      <div
        className={`${sizeClass} ${colorClass} animate-spin rounded-full border-t-transparent`}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['blue', 'white', 'gray', 'green', 'red']),
};

export default Spinner;