import { get, set } from 'idb-keyval';
import api from './api';

const VITALS_QUEUE_KEY = 'healthcare_offline_vitals_queue';
const PATIENTS_QUEUE_KEY = 'healthcare_offline_patients_queue';

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
    this.getDetailedQueueCounts().then((counts) => {
      this.listeners.forEach((cb) => {
        try {
          cb({ 
            isOnline: this.isOnline, 
            pendingCount: counts.total, 
            pendingVitals: counts.vitals,
            pendingPatients: counts.patients,
            isSyncing: this.syncInProgress 
          });
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  async getVitalsQueue() {
    try {
      const data = await get(VITALS_QUEUE_KEY);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Failed to read offline vitals queue from IndexedDB:', e);
      return [];
    }
  }

  async getPatientsQueue() {
    try {
      const data = await get(PATIENTS_QUEUE_KEY);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Failed to read offline patients queue from IndexedDB:', e);
      return [];
    }
  }

  async getDetailedQueueCounts() {
    const [vitals, patients] = await Promise.all([
      this.getVitalsQueue(),
      this.getPatientsQueue()
    ]);
    return {
      vitals: vitals.length,
      patients: patients.length,
      total: vitals.length + patients.length
    };
  }

  async getQueueCount() {
    const counts = await this.getDetailedQueueCounts();
    return counts.total;
  }

  // Enqueue vitals screening
  async enqueueRecord(record) {
    const queue = await this.getVitalsQueue();
    const itemWithId = {
      ...record,
      client_sync_id: record.client_sync_id || `offline-vitals-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_at: record.recorded_at || new Date().toISOString(),
    };
    queue.push(itemWithId);
    await set(VITALS_QUEUE_KEY, queue);
    this.notifyStatus();

    // If online, attempt immediate sync
    if (this.isOnline) {
      this.syncPendingQueue();
    }
    return itemWithId;
  }

  // Enqueue new patient registration & medical history
  async enqueuePatientRecord(patient) {
    const queue = await this.getPatientsQueue();
    const itemWithId = {
      ...patient,
      client_sync_id: patient.client_sync_id || `offline-pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: patient.created_at || new Date().toISOString(),
    };
    queue.push(itemWithId);
    await set(PATIENTS_QUEUE_KEY, queue);
    this.notifyStatus();

    // If online, attempt immediate sync
    if (this.isOnline) {
      this.syncPendingQueue();
    }
    return itemWithId;
  }

  async syncPendingQueue() {
    if (this.syncInProgress || !this.isOnline) return { success: false, synced: 0 };

    const [patientsQueue, vitalsQueue] = await Promise.all([
      this.getPatientsQueue(),
      this.getVitalsQueue()
    ]);

    if (patientsQueue.length === 0 && vitalsQueue.length === 0) {
      return { success: true, synced: 0 };
    }

    this.syncInProgress = true;
    this.notifyStatus();

    let totalSynced = 0;

    try {
      // 1. First sync queued patient registrations so their records exist in DB
      if (patientsQueue.length > 0) {
        try {
          const patientRes = await api.post('/collector/patient/batch-sync', {
            patients: patientsQueue,
          });
          if (patientRes.data && patientRes.data.success) {
            await set(PATIENTS_QUEUE_KEY, []);
            totalSynced += (patientRes.data.synced_count || 0) + (patientRes.data.updated_count || 0);
          }
        } catch (patErr) {
          console.warn('Patient batch sync failed, retrying on next connect:', patErr);
        }
      }

      // 2. Then sync queued vitals screenings
      if (vitalsQueue.length > 0) {
        try {
          const vitalsRes = await api.post('/collector/vitals/batch-sync', {
            records: vitalsQueue,
          });
          if (vitalsRes.data && vitalsRes.data.success) {
            await set(VITALS_QUEUE_KEY, []);
            totalSynced += vitalsRes.data.synced_count || 0;
          }
        } catch (vitErr) {
          console.warn('Vitals batch sync failed, retrying on next connect:', vitErr);
        }
      }

      this.syncInProgress = false;
      this.notifyStatus();

      return {
        success: true,
        synced: totalSynced
      };
    } catch (err) {
      console.warn('Overall sync attempt failed:', err);
    } finally {
      this.syncInProgress = false;
      this.notifyStatus();
    }

    return { success: false, synced: 0 };
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
