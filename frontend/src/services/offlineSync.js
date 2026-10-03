import { get, set } from 'idb-keyval';
import api from './api';

const QUEUE_KEY = 'healthcare_offline_vitals_queue';

class OfflineSyncService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.listeners = new Set();
    this.syncInProgress = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyStatus();
        this.syncPendingQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyStatus();
      });
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyStatus() {
    this.getQueueCount().then((count) => {
      this.listeners.forEach((cb) => {
        try {
          cb({ isOnline: this.isOnline, pendingCount: count, isSyncing: this.syncInProgress });
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  async getQueue() {
    try {
      const data = await get(QUEUE_KEY);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Failed to read offline queue from IndexedDB:', e);
      return [];
    }
  }

  async getQueueCount() {
    const queue = await this.getQueue();
    return queue.length;
  }

  async enqueueRecord(record) {
    const queue = await this.getQueue();
    const itemWithId = {
      ...record,
      client_sync_id: record.client_sync_id || `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_at: record.recorded_at || new Date().toISOString(),
    };
    queue.push(itemWithId);
    await set(QUEUE_KEY, queue);
    this.notifyStatus();

    // If online, attempt immediate sync
    if (this.isOnline) {
      this.syncPendingQueue();
    }
    return itemWithId;
  }

  async syncPendingQueue() {
    if (this.syncInProgress || !this.isOnline) return { success: false, synced: 0 };

    const queue = await this.getQueue();
    if (queue.length === 0) return { success: true, synced: 0 };

    this.syncInProgress = true;
    this.notifyStatus();

    try {
      const response = await api.post('/collector/vitals/batch-sync', {
        records: queue,
      });

      if (response.data && response.data.success) {
        // Clear successfully synced items
        await set(QUEUE_KEY, []);
        this.syncInProgress = false;
        this.notifyStatus();
        return {
          success: true,
          synced: response.data.synced_count,
          skipped: response.data.skipped_count,
        };
      }
    } catch (err) {
      console.warn('Sync attempt failed, records remain in offline queue for next retry:', err);
    } finally {
      this.syncInProgress = false;
      this.notifyStatus();
    }

    return { success: false, synced: 0 };
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
