import React, { createContext, useContext, useState, useEffect } from 'react';
import offlineSyncService from '../services/offlineSync';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingVitals, setPendingVitals] = useState(0);
  const [pendingPatients, setPendingPatients] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initial count
    offlineSyncService.getDetailedQueueCounts().then((counts) => {
      setPendingCount(counts.total);
      setPendingVitals(counts.vitals);
      setPendingPatients(counts.patients);
    });

    const unsubscribe = offlineSyncService.subscribe((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setPendingVitals(status.pendingVitals || 0);
      setPendingPatients(status.pendingPatients || 0);
      setIsSyncing(status.isSyncing);
    });

    return () => unsubscribe();
  }, []);

  const triggerSync = async () => {
    return await offlineSyncService.syncPendingQueue();
  };

  const enqueueRecord = async (record) => {
    return await offlineSyncService.enqueueRecord(record);
  };

  const enqueuePatientRecord = async (patient) => {
    return await offlineSyncService.enqueuePatientRecord(patient);
  };

  return (
    <SyncContext.Provider value={{ 
      isOnline, 
      pendingCount, 
      pendingVitals, 
      pendingPatients, 
      isSyncing, 
      triggerSync, 
      enqueueRecord,
      enqueuePatientRecord 
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
