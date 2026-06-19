import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export const BACKUP_APP_ID = "study-hub";
export const BACKUP_VERSION = 1;

const LS_PREFIX = "study-hub:";
const PREF_KEYS = ["sh:gcal_url", "sh:gcal_events", "sh:gcal_synced"];

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  localStorage: Record<string, string>;
  preferences: Record<string, string>;
}

export async function collectBackup(): Promise<BackupFile> {
  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(LS_PREFIX) || key.startsWith("sh:")) {
      const val = localStorage.getItem(key);
      if (val != null) lsData[key] = val;
    }
  }

  const prefData: Record<string, string> = {};
  if (Capacitor.isNativePlatform()) {
    for (const key of PREF_KEYS) {
      const { value } = await Preferences.get({ key });
      if (value != null) prefData[key] = value;
    }
  }

  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: lsData,
    preferences: prefData,
  };
}

export async function applyBackup(backup: BackupFile): Promise<void> {
  for (const [key, value] of Object.entries(backup.localStorage)) {
    localStorage.setItem(key, value);
  }
  for (const [key, value] of Object.entries(backup.preferences ?? {})) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }
}

export function backupFilename(): string {
  return `studyhub-backup-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
}
