import { db, getActivePartition } from '../db/database';
import {
  createEncryptedArchive,
  savePendingAutoBackup,
  getPendingAutoBackup,
} from './backupService';

export async function checkAutoBackup(
  applicationVersion: string,
  password: string
): Promise<{
  due: boolean;
  pending: File | null;
}> {

  const settings = await db.settings.get('app');

  if (!settings?.autoBackupEnabled) {
    return {
      due: false,
      pending: null,
    };
  }

  // If a backup is already waiting for the user,
  // don't generate another one.
  const existingPending =
    await getPendingAutoBackup();

  if (existingPending) {
    return {
      due: true,
      pending: existingPending,
    };
  }

  const intervalHours =
    settings.autoBackupIntervalHours ?? 24;

  const intervalMs =
    intervalHours * 60 * 60 * 1000;

  const lastSavedAt =
    settings.lastAutoBackupSavedAt
      ? new Date(
          settings.lastAutoBackupSavedAt
        ).getTime()
      : 0;

  const now = Date.now();

  if (
    lastSavedAt > 0 &&
    now - lastSavedAt < intervalMs
  ) {
    return {
      due: false,
      pending: null,
    };
  }

  const archive =
    await createEncryptedArchive(
      password,
      applicationVersion,
      getActivePartition()
    );

  await savePendingAutoBackup(
    archive.archiveFile
  );

  await db.settings.update('app', {
    lastAutoBackupGeneratedAt:
      new Date().toISOString(),
  });

  return {
    due: true,
    pending: archive.archiveFile,
  };
}