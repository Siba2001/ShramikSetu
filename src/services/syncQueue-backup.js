/**
 * High-Reliability Non-Blocking Sync Queue
 * Manages background requests with deduplication, offline resilience, and automatic retries.
 */

import { apiPost } from './api';

const QUEUE_STORAGE_KEY = 'shramik_setu_sync_queue_v1';

class SyncQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isProcessing = false;
    this.listeners = new Set();
    
    // Auto-process queue when browser comes online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  loadQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {}
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (e) {}
    });
  }

  /**
   * Enqueue a background sync task
   */
  enqueue(action, payload) {
    const taskId = `${action}_${payload.id || Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    // Deduplicate: If an identical action for the same ID is already pending, update its payload
    const existingIdx = this.queue.findIndex(item => item.action === action && item.payload?.id && item.payload.id === payload.id);
    if (existingIdx !== -1) {
      this.queue[existingIdx].payload = payload;
      this.queue[existingIdx].timestamp = Date.now();
      this.queue[existingIdx].attempts = 0;
    } else {
      this.queue.push({
        taskId,
        action,
        payload,
        timestamp: Date.now(),
        attempts: 0
      });
    }

    this.saveQueue();
    this.notify('enqueued', { action, taskId });
    this.processQueue();
  }

  /**
   * Process all pending tasks sequentially
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isProcessing = true;
    this.notify('processing_start', { count: this.queue.length });

    while (this.queue.length > 0) {
      const item = this.queue[0];
      try {
        const res = await apiPost(item.action, item.payload);
        if (res && res.success) {
          // Success: dequeue
          this.queue.shift();
          this.saveQueue();
          this.notify('task_success', { action: item.action, taskId: item.taskId });
        } else {
          // Server error or rejection
          item.attempts++;
          if (item.attempts >= 4) {
            // Drop after 4 attempts to avoid infinite poisoning
            console.warn(`[SyncQueue] Dropping task ${item.action} after 4 failed attempts:`, res?.error);
            this.queue.shift();
            this.saveQueue();
          } else {
            // Back off and retry later
            this.saveQueue();
            break;
          }
        }
      } catch (err) {
        item.attempts++;
        if (item.attempts >= 4) {
          this.queue.shift();
          this.saveQueue();
        }
        break; // Network unreachable, stop until next tick
      }
    }

    this.isProcessing = false;
    this.notify('processing_end', { remaining: this.queue.length });
  }

  getPendingCount() {
    return this.queue.length;
  }
}

export const syncQueue = new SyncQueue();
