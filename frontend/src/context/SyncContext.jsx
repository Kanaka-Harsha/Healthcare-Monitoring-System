import React, { createContext, useContext, useState, useEffect } from 'react';
import offlineSyncService from '../services/offlineSync';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initial count
    offlineSyncService.getQueueCount().then(setPendingCount);

    const unsubscribe = offlineSyncService.subscribe((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
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

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, isSyncing, triggerSync, enqueueRecord }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
