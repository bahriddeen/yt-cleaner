/**
 * Export / import of the user's data and settings as JSON.
 */
import type { ExportPayload, ImportPayload } from '@/types';
import { repository } from '@/storage/repository';
import { SCHEMA_VERSION } from '@/storage/defaults';

/** Serialises the full store into a portable payload. */
export async function exportData(): Promise<ExportPayload> {
  const [settings, dailyState, history] = await Promise.all([
    repository.getSettings(),
    repository.getDailyState(),
    repository.getHistory(),
  ]);
  return {
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    settings,
    dailyState,
    history,
  };
}

/**
 * Imports a payload. Settings are merged over current settings; state and
 * history are replaced only when present. Unknown/partial payloads are handled
 * gracefully so a settings-only export can be re-imported.
 */
export async function importData(payload: ImportPayload): Promise<void> {
  if (payload.settings) {
    await repository.patchSettings(payload.settings);
  }
  if (payload.dailyState) {
    await repository.setDailyState(payload.dailyState);
  }
  if (payload.history) {
    await repository.setHistory(payload.history);
  }
}
