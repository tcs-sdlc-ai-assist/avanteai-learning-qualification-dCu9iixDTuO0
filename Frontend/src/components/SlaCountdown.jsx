import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { calculateSlaTimeRemaining } from '../utils/formatters';

function getUrgencyClasses(urgency) {
  switch (urgency) {
    case 'normal':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200 animate-pulse-slow';
    case 'overdue':
      return 'bg-red-200 text-red-900 border-red-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getUrgencyIcon(urgency) {
  switch (urgency) {
    case 'normal':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    case 'critical':
    case 'overdue':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
      );
    default:
      return null;
  }
}

function SlaCountdown({ deadline, showIcon, compact }) {
  const computeState = useCallback(() => {
    if (!deadline) {
      return { remaining: '—', isOverdue: false, totalMs: 0, urgency: 'normal' };
    }
    return calculateSlaTimeRemaining(deadline);
  }, [deadline]);

  const [slaState, setSlaState] = useState(computeState);

  useEffect(() => {
    setSlaState(computeState());

    const intervalId = setInterval(() => {
      setSlaState(computeState());
    }, 60000);

    return () => clearInterval(intervalId);
  }, [computeState]);

  if (!deadline) {
    return (
      <span className="inline-flex items-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        No deadline
      </span>
    );
  }

  const urgencyClasses = getUrgencyClasses(slaState.urgency);
  const icon = showIcon ? getUrgencyIcon(slaState.urgency) : null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${urgencyClasses}`}
        title={`SLA Deadline: ${new Date(deadline).toLocaleString()}`}
      >
        {icon}
        <span>{slaState.remaining}</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium ${urgencyClasses}`}
      title={`SLA Deadline: ${new Date(deadline).toLocaleString()}`}
    >
      {icon}
      <div className="flex flex-col">
        <span className="font-semibold">{slaState.remaining}</span>
        {slaState.isOverdue && (
          <span className="text-xs font-normal opacity-80">SLA Breached</span>
        )}
      </div>
    </div>
  );
}

SlaCountdown.propTypes = {
  deadline: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
  showIcon: PropTypes.bool,
  compact: PropTypes.bool,
};

SlaCountdown.defaultProps = {
  deadline: null,
  showIcon: true,
  compact: false,
};

export default SlaCountdown;