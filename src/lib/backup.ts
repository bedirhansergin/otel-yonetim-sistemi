import type { ReservationGroup } from '../context/ReservationContext';

const STORAGE_KEY = 'otel_rezervasyon_yedekleri';

export interface BackupEntry {
  id: string;
  timestamp: string;
  operation: 'update_before' | 'create_after' | 'delete';
  label: string;
  reservation: ReservationGroup;
}

export function getBackups(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BackupEntry[];
  } catch {
    return [];
  }
}

export function saveBackup(entry: BackupEntry): void {
  try {
    const backups = getBackups();
    backups.unshift(entry);
    if (backups.length > 50) {
      backups.length = 50;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
  } catch { /* storage full or unavailable */ }
}

export function deleteBackup(id: string): void {
  try {
    const backups = getBackups().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
  } catch { /* storage unavailable */ }
}

export function clearAllBackups(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable */ }
}
