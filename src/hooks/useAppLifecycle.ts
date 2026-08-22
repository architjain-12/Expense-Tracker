import { useEffect, useState } from 'react';

import {
  initializeAppLifecycle,
  subscribeLifecycle,
  type LifecycleState,
} from '../services/appLifecycleService';

const initialState: LifecycleState = {
  backupDue: false,
  pendingBackup: false,
  nextBackupAt: null,
  lastCheckedAt: null,
};

export function useAppLifecycle() {
  const [state, setState] =
    useState<LifecycleState>(initialState);

  useEffect(() => {
    initializeAppLifecycle();

    return subscribeLifecycle(setState);
  }, []);

  return state;
}