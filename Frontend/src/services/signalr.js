import * as signalR from '@microsoft/signalr';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants.js';

/**
 * @typedef {Object} NotificationPayload
 * @property {string} id - Alert ID
 * @property {string} type - Alert type
 * @property {string} message - Alert message
 * @property {string} createdAt - ISO timestamp
 * @property {boolean} isRead - Read status
 * @property {string|null} relatedEntityType - Related entity type
 * @property {string|null} relatedEntityId - Related entity ID
 */

/** @type {signalR.HubConnection|null} */
let connection = null;

/** @type {Set<(payload: NotificationPayload) => void>} */
const listeners = new Set();

/** @type {boolean} */
let isConnecting = false;

/** @type {boolean} */
let intentionalDisconnect = false;

const HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL
  || `${API_BASE_URL.replace(/\/api\/?$/, '')}/hubs/notifications`;

const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

/**
 * Returns the current JWT access token from local storage.
 * @returns {string|null}
 */
function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Builds a new SignalR HubConnection instance with automatic reconnect.
 * @returns {signalR.HubConnection}
 */
function buildConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() || '',
    })
    .withAutomaticReconnect(RECONNECT_DELAYS)
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

/**
 * Dispatches a notification payload to all registered listeners.
 * @param {NotificationPayload} payload
 */
function notifyListeners(payload) {
  listeners.forEach((callback) => {
    try {
      callback(payload);
    } catch (err) {
      console.error('[SignalR] Listener error:', err);
    }
  });
}

/**
 * Establishes the SignalR connection to the NotificationHub.
 * If a connection already exists and is connected, this is a no-op.
 * @returns {Promise<void>}
 */
export async function connect() {
  if (isConnecting) {
    return;
  }

  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    return;
  }

  const token = getAccessToken();
  if (!token) {
    console.warn('[SignalR] No access token available, skipping connection.');
    return;
  }

  isConnecting = true;
  intentionalDisconnect = false;

  try {
    if (connection) {
      connection.off('ReceiveNotification');
      try {
        await connection.stop();
      } catch {
        // ignore stop errors on stale connection
      }
      connection = null;
    }

    connection = buildConnection();

    connection.on('ReceiveNotification', (payload) => {
      notifyListeners(payload);
    });

    connection.onreconnecting((error) => {
      console.warn('[SignalR] Reconnecting...', error?.message || '');
    });

    connection.onreconnected((connectionId) => {
      console.info('[SignalR] Reconnected with ID:', connectionId);
    });

    connection.onclose((error) => {
      if (!intentionalDisconnect && error) {
        console.error('[SignalR] Connection closed unexpectedly:', error.message);
      }
    });

    await connection.start();
    console.info('[SignalR] Connected to NotificationHub.');
  } catch (err) {
    console.error('[SignalR] Failed to connect:', err);
    connection = null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Disconnects the SignalR connection gracefully.
 * @returns {Promise<void>}
 */
export async function disconnect() {
  intentionalDisconnect = true;

  if (!connection) {
    return;
  }

  try {
    connection.off('ReceiveNotification');
    await connection.stop();
    console.info('[SignalR] Disconnected from NotificationHub.');
  } catch (err) {
    console.error('[SignalR] Error during disconnect:', err);
  } finally {
    connection = null;
  }
}

/**
 * Registers a callback to be invoked when a notification is received.
 * Returns an unsubscribe function.
 * @param {(payload: NotificationPayload) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onNotification(callback) {
  if (typeof callback !== 'function') {
    throw new Error('[SignalR] onNotification requires a function callback.');
  }

  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

/**
 * Returns the current connection state.
 * @returns {string} One of: 'Disconnected', 'Connecting', 'Connected', 'Disconnecting', 'Reconnecting'
 */
export function getConnectionState() {
  if (!connection) {
    return 'Disconnected';
  }
  return connection.state;
}

/**
 * Removes all registered notification listeners.
 */
export function removeAllListeners() {
  listeners.clear();
}