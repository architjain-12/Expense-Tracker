import {
    checkAndCreateAutoBackup,
    calculateNextAutoBackupAt,
  } from './backupService';
  
  import {
    db,
    getActivePartition,
  } from '../db/database';
  
  export type LifecycleState = {
    backupDue: boolean;
    pendingBackup: boolean;
    nextBackupAt: Date | null;
    lastCheckedAt: Date | null;
  };
  
  type Listener = (state: LifecycleState) => void;
  
  let state: LifecycleState = {
    backupDue: false,
    pendingBackup: false,
    nextBackupAt: null,
    lastCheckedAt: null,
  };
  
  const listeners = new Set<Listener>();
  
  let heartbeat: number | null = null;
  let initialized = false;
  
  function notify() {
    listeners.forEach(listener => listener(state));
  }
  
  export function getLifecycleState(): LifecycleState {
    return state;
  }
  
  export function subscribeLifecycle(listener: Listener): () => void {
    listeners.add(listener);
  
    listener(state);
  
    return () => {
      listeners.delete(listener);
    };
  }
  
  async function checkBackup() {
    try {
        const settings = await db.settings.get('app');
  
      if (!settings?.autoBackupEnabled) {
        state = {
          ...state,
          backupDue: false,
          pendingBackup: false,
          nextBackupAt: null,
          lastCheckedAt: new Date(),
        };
  
        notify();
        return;
      }
  
      const pending = await db.pendingBackups.get('auto');
  
      /*
       * If a backup is already waiting for the user,
       * do not create another one.
       */
      if (pending) {
        state = {
          ...state,
          backupDue: true,
          pendingBackup: true,
          nextBackupAt: null,
          lastCheckedAt: new Date(),
        };
  
        notify();
        return;
      }
  
      const nextBackup = calculateNextAutoBackupAt(settings);
      const now = Date.now();
  
      const due = nextBackup
        ? nextBackup.getTime() <= now
        : false;
  
      /*
       * Ask the backup service to create the backup if required.
       *
       * The service itself performs the authoritative
       * due-check, so this is safe even if multiple lifecycle
       * events happen close together.
       */
      if (due) {
        const created = await checkAndCreateAutoBackup(
          import.meta.env.VITE_APP_VERSION || 'LOCAL',
          getActivePartition()
        );
  
        if (created) {
          state = {
            ...state,
            backupDue: true,
            pendingBackup: true,
            nextBackupAt: null,
            lastCheckedAt: new Date(),
          };
  
          notify();
          return;
        }
      }
  
      state = {
        ...state,
        backupDue: false,
        pendingBackup: false,
        nextBackupAt: nextBackup,
        lastCheckedAt: new Date(),
      };
  
      notify();
    } catch (error) {
      console.error(
        'LIFECYCLE: backup check failed',
        error
      );
    }
  }
  
  export async function runLifecycleCheck() {
    await checkBackup();
  }
  
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      void runLifecycleCheck();
    }
  }
  
  function handleFocus() {
    void runLifecycleCheck();
  }
  
  function startHeartbeat() {
    if (heartbeat !== null) {
      window.clearInterval(heartbeat);
    }
  
    /*
     * This is NOT a background scheduler.
     *
     * It only keeps checking while the page is actually
     * alive and active.
     */
    heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runLifecycleCheck();
      }
    }, 60 * 1000);
  }
  
  export function initializeAppLifecycle() {
    if (initialized) {
      return;
    }
  
    initialized = true;
  
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
  
    window.addEventListener(
      'focus',
      handleFocus
    );
  
    startHeartbeat();
  
    void runLifecycleCheck();
  }
  
  export function destroyAppLifecycle() {
    document.removeEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
  
    window.removeEventListener(
      'focus',
      handleFocus
    );
  
    if (heartbeat !== null) {
      window.clearInterval(heartbeat);
      heartbeat = null;
    }
  
    initialized = false;
  }