/**
 * Resilient Offline & Background Synchronization Queue for Google Sheets
 * Ensures zero data loss and instantaneous UI responsiveness.
 * All creates, updates, and deletes are committed to local state immediately
 * and reliably synchronized with the Google Sheets database.
 */

import { apiPost } from './api';

const SYNC_QUEUE_KEY = 'shramik_setu_sync_queue_v1';
let isProcessing = false;
const listeners = new Set();

/**
 * Get all pending sync queue items
 */
export function getSyncQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save sync queue to localStorage and notify listeners
 */
function saveSyncQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    notifyListeners(queue.length);
  } catch (e) {
    console.error('Failed to save sync queue:', e);
  }
}

/**
 * Subscribe to sync queue length changes
 */
export function subscribeSyncStatus(fn) {
  listeners.add(fn);
  fn(getSyncQueue().length);
  return () => listeners.delete(fn);
}

function notifyListeners(pendingCount) {
  listeners.forEach(fn => {
    try {
      fn(pendingCount);
    } catch (e) {}
  });
}

/**
 * Enqueue an operation into the persistent sync queue
 */
export function enqueueSync(action, payload, entityId, entityType = 'general') {
  const queue = getSyncQueue();
  
  // If an existing pending action is for the same entity and action, update it with latest payload
  const existingIdx = queue.findIndex(item => item.entityId && item.entityId === entityId && item.action === action);
  const newItem = {
    queueId: `SQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    action,
    payload,
    entityId: entityId || null,
    entityType,
    retries: 0,
    queuedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }

  saveSyncQueue(queue);

  // Trigger background drain
  processSyncQueue().catch(() => {});
  return newItem;
}

/**
 * Drain and process the sync queue sequentially
 */
export async function processSyncQueue() {
  if (isProcessing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  isProcessing = true;
  try {
    const remaining = [];
    for (const item of queue) {
      try {
        const res = await apiPost(item.action, item.payload, 15000);
        if (res && res.success) {
          // Successfully synchronized to Google Sheets database!
          continue;
        } else {
          item.retries = (item.retries || 0) + 1;
          item.lastError = res?.error || 'Database did not return success';
          remaining.push(item);
        }
      } catch (err) {
        item.retries = (item.retries || 0) + 1;
        item.lastError = err?.message || 'Network error';
        remaining.push(item);
      }
    }
    saveSyncQueue(remaining);
  } finally {
    isProcessing = false;
  }
}

/**
 * Direct sync with instant responsiveness and resilient fallback
 * 1. Attempts fast push to Google Sheets (8s timeout)
 * 2. If it succeeds, confirms immediate cloud sync
 * 3. If slow, timed out, or offline, smoothly queues for background sync without blocking or failing UI
 */
export async function syncDirect(action, payload, entityId, entityType = 'general') {
  try {
    const res = await apiPost(action, payload, 8000);
    if (res && res.success) {
      return { success: true, immediate: true, data: res };
    }
  } catch (err) {
    console.warn(`[SyncDirect ${action}] Immediate call notice:`, err?.message);
  }

  // Fallback to persistent background sync queue so no data is lost
  enqueueSync(action, payload, entityId, entityType);
  return { success: true, queued: true };
}

// Background event listeners for auto-syncing
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue().catch(() => {});
  });

  // Check and flush queue every 15 seconds
  setInterval(() => {
    const queue = getSyncQueue();
    if (queue.length > 0) {
      processSyncQueue().catch(() => {});
    }
  }, 15000);
}
