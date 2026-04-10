import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { getUnreadAlerts, getAlerts, markAlertsRead } from '../services/api';
import { connect, disconnect, onNotification, getConnectionState } from '../services/signalr';
import { STORAGE_KEYS } from '../utils/constants';

const POLLING_INTERVAL_MS = 30000;
const POLLING_FALLBACK_INTERVAL_MS = 10000;

/**
 * @typedef {Object} Alert
 * @property {string} id
 * @property {string} type
 * @property {string} message
 * @property {string} createdAt
 * @property {boolean} isRead
 * @property {string|null} relatedEntityType
 * @property {string|null} relatedEntityId
 */

/**
 * @typedef {Object} NotificationContextValue
 * @property {number} unreadCount
 * @property {Alert[]} alerts
 * @property {Alert[]} allAlerts
 * @property {boolean} isLoading
 * @property {string|null} error
 * @property {number} totalAlerts
 * @property {number} page
 * @property {number} pageSize
 * @property {function(): Promise<void>} fetchUnreadAlerts
 * @property {function(number, number): Promise<void>} fetchAlerts
 * @property {function(string[]): Promise<void>} markAsRead
 * @property {function(): Promise<void>} markAllAsRead
 * @property {function(): void} clearError
 * @property {string} connectionState
 */

/** @type {React.Context<NotificationContextValue|null>} */
const NotificationContext = createContext(null);

/**
 * Hook to access the notification context.
 * @returns {NotificationContextValue}
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Notification context provider with SignalR integration and polling fallback.
 * Manages unread alert count, alert list, and provides functions to fetch alerts,
 * mark as read, and update count.
 */
export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('Disconnected');

  const pollingRef = useRef(null);
  const connectionCheckRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Fetches unread alerts from the API and updates state.
   * @returns {Promise<void>}
   */
  const fetchUnreadAlerts = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return;
    }

    try {
      const data = await getUnreadAlerts();
      if (!mountedRef.current) return;

      setUnreadCount(data.unreadCount ?? 0);
      setAlerts(data.alerts ?? []);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err?.response?.status === 401 || err?.response?.status === 403) {
        return;
      }
      console.error('[NotificationContext] Failed to fetch unread alerts:', err);
      setError('Failed to fetch notifications');
    }
  }, []);

  /**
   * Fetches a paginated list of all alerts from the API.
   * @param {number} [requestedPage=1]
   * @param {number} [requestedPageSize=20]
   * @returns {Promise<void>}
   */
  const fetchAlerts = useCallback(async (requestedPage = 1, requestedPageSize = 20) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getAlerts({ page: requestedPage, pageSize: requestedPageSize });
      if (!mountedRef.current) return;

      setAllAlerts(data.alerts ?? []);
      setTotalAlerts(data.total ?? 0);
      setPage(data.page ?? requestedPage);
      setPageSize(data.pageSize ?? requestedPageSize);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err?.response?.status === 401 || err?.response?.status === 403) {
        return;
      }
      console.error('[NotificationContext] Failed to fetch alerts:', err);
      setError('Failed to fetch notifications');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Marks the specified alerts as read.
   * @param {string[]} alertIds
   * @returns {Promise<void>}
   */
  const markAsRead = useCallback(async (alertIds) => {
    if (!alertIds || alertIds.length === 0) {
      return;
    }

    try {
      const result = await markAlertsRead(alertIds);
      if (!mountedRef.current) return;

      if (result.success) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alertIds.includes(alert.id) ? { ...alert, isRead: true } : alert
          )
        );

        setAllAlerts((prev) =>
          prev.map((alert) =>
            alertIds.includes(alert.id) ? { ...alert, isRead: true } : alert
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - alertIds.length));
      }
    } catch (err) {
      if (!mountedRef.current) return;

      console.error('[NotificationContext] Failed to mark alerts as read:', err);
      setError('Failed to mark notifications as read');
    }
  }, []);

  /**
   * Marks all currently unread alerts as read.
   * @returns {Promise<void>}
   */
  const markAllAsRead = useCallback(async () => {
    const unreadAlertIds = alerts
      .filter((alert) => !alert.isRead)
      .map((alert) => alert.id);

    if (unreadAlertIds.length === 0) {
      return;
    }

    await markAsRead(unreadAlertIds);
  }, [alerts, markAsRead]);

  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handles an incoming real-time notification from SignalR.
   * @param {Alert} payload
   */
  const handleNotification = useCallback((payload) => {
    if (!mountedRef.current) return;

    const newAlert = {
      id: payload.id || payload.Id,
      type: payload.type || payload.Type || '',
      message: payload.message || payload.Message || '',
      createdAt: payload.createdAt || payload.CreatedAt || new Date().toISOString(),
      isRead: payload.isRead ?? payload.IsRead ?? false,
      relatedEntityType: payload.relatedEntityType || payload.RelatedEntityType || null,
      relatedEntityId: payload.relatedEntityId || payload.RelatedEntityId || null,
    };

    setAlerts((prev) => {
      const exists = prev.some((a) => a.id === newAlert.id);
      if (exists) return prev;
      return [newAlert, ...prev];
    });

    setAllAlerts((prev) => {
      const exists = prev.some((a) => a.id === newAlert.id);
      if (exists) return prev;
      return [newAlert, ...prev];
    });

    if (!newAlert.isRead) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  /**
   * Starts the polling interval for fetching unread alerts.
   * @param {number} intervalMs
   */
  const startPolling = useCallback((intervalMs) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      fetchUnreadAlerts();
    }, intervalMs);
  }, [fetchUnreadAlerts]);

  /**
   * Stops the polling interval.
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Initializes SignalR connection and sets up polling fallback.
   */
  const initializeConnection = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return;
    }

    // Subscribe to real-time notifications
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    unsubscribeRef.current = onNotification(handleNotification);

    try {
      await connect();
      if (!mountedRef.current) return;

      const state = getConnectionState();
      setConnectionState(state);

      if (state === 'Connected') {
        // Connected via SignalR — use slower polling as backup
        startPolling(POLLING_INTERVAL_MS);
      } else {
        // SignalR not connected — use faster polling as fallback
        startPolling(POLLING_FALLBACK_INTERVAL_MS);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      console.warn('[NotificationContext] SignalR connection failed, falling back to polling:', err);
      setConnectionState('Disconnected');
      startPolling(POLLING_FALLBACK_INTERVAL_MS);
    }
  }, [handleNotification, startPolling]);

  // Monitor connection state periodically
  useEffect(() => {
    connectionCheckRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      const state = getConnectionState();
      setConnectionState((prev) => {
        if (prev !== state) {
          // Adjust polling interval based on connection state
          if (state === 'Connected') {
            startPolling(POLLING_INTERVAL_MS);
          } else if (prev === 'Connected' && state !== 'Connected') {
            startPolling(POLLING_FALLBACK_INTERVAL_MS);
          }
          return state;
        }
        return prev;
      });
    }, 5000);

    return () => {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
        connectionCheckRef.current = null;
      }
    };
  }, [startPolling]);

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      fetchUnreadAlerts();
      initializeConnection();
    }

    return () => {
      mountedRef.current = false;
      stopPolling();

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      disconnect().catch((err) => {
        console.error('[NotificationContext] Error during disconnect:', err);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    unreadCount,
    alerts,
    allAlerts,
    isLoading,
    error,
    totalAlerts,
    page,
    pageSize,
    fetchUnreadAlerts,
    fetchAlerts,
    markAsRead,
    markAllAsRead,
    clearError,
    connectionState,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NotificationContext;