import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/formatters';

const ALERT_TYPE_ICONS = {
  ExceptionFlagged: (
    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  SlaBreach: (
    <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ExceptionReviewed: (
    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Approval: (
    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
};

function getAlertIcon(type) {
  return ALERT_TYPE_ICONS[type] || (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function AlertItem({ alert, onMarkRead }) {
  const handleMarkRead = useCallback(
    (e) => {
      e.stopPropagation();
      if (!alert.isRead && onMarkRead) {
        onMarkRead(alert.id);
      }
    },
    [alert.id, alert.isRead, onMarkRead]
  );

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
        alert.isRead
          ? 'bg-white'
          : 'bg-avante-50 hover:bg-avante-100'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {getAlertIcon(alert.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            alert.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'
          }`}
        >
          {alert.message}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {formatRelativeTime(alert.createdAt)}
          </span>
          {alert.type && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {alert.type}
            </span>
          )}
        </div>
      </div>
      {!alert.isRead && (
        <button
          type="button"
          onClick={handleMarkRead}
          className="mt-0.5 flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-avante-500"
          aria-label="Mark as read"
          title="Mark as read"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const {
    unreadCount,
    alerts,
    isLoading,
    error,
    fetchUnreadAlerts,
    markAsRead,
    markAllAsRead,
    clearError,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        fetchUnreadAlerts();
      }
      return next;
    });
  }, [fetchUnreadAlerts]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    clearError();
  }, [clearError]);

  const handleMarkSingleRead = useCallback(
    (alertId) => {
      markAsRead([alertId]);
    },
    [markAsRead]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        handleClose();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;
  const hasUnread = unreadCount > 0;
  const visibleAlerts = alerts.slice(0, 10);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg sm:w-96"
          role="menu"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
              {hasUnread && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-avante-600 transition-colors hover:text-avante-700 focus:outline-none"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && visibleAlerts.length === 0 && (
              <div className="flex items-center justify-center px-4 py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-avante-600 border-t-transparent" />
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            )}

            {error && (
              <div className="px-4 py-3">
                <div className="rounded-md bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={fetchUnreadAlerts}
                    className="mt-1 text-xs font-medium text-red-600 hover:text-red-700 focus:outline-none"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && visibleAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-8">
                <svg
                  className="mb-2 h-8 w-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400">You&apos;re all caught up!</p>
              </div>
            )}

            {visibleAlerts.length > 0 && (
              <div className="divide-y divide-gray-100">
                {visibleAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onMarkRead={handleMarkSingleRead}
                  />
                ))}
              </div>
            )}
          </div>

          {visibleAlerts.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-md py-1.5 text-center text-xs font-medium text-avante-600 transition-colors hover:bg-avante-50 focus:outline-none"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;