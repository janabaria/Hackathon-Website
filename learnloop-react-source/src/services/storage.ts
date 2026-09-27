import { createEmptyData, dataSchema, type AppData } from '../domain/schema';

// Deliberately separate from the previous demo's keys: no mock data is migrated.
export const STORAGE_KEY = 'learnloop-react.workspace.v1';

export function loadData(): { data: AppData; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? dataSchema.parse(JSON.parse(raw)) : createEmptyData(), error: null };
  } catch {
    return {
      data: createEmptyData(),
      error:
        'Saved data could not be loaded. It has not been overwritten. Export the original backup from Settings, then import a valid file or reset this workspace.',
    };
  }
}

export function saveData(data: AppData): void {
  // Persist before committing React state. A full/blocked store must never look saved.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function downloadJson(value: unknown, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
