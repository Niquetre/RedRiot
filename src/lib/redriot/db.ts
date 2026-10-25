import { normalize, type AppData } from "./types.ts";

const DB_NAME = "redriot";
const STORE = "kv";
const THEME_KEY = "redriot-theme";
const BACKUP_KEY = "redriot-backup";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
  });
}

function slim(data: AppData): AppData {
  return {
    ...data,
    tasks: data.tasks.map((task) => ({ ...task, attachments: [] })),
  };
}

export async function loadData(): Promise<AppData | null> {
  try {
    const db = await openDb();
    const value = await new Promise<AppData | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get("data");
      request.onsuccess = () => resolve((request.result as AppData | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (value) return normalize(value);
  } catch {
    /* sigue el respaldo */
  }
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw) as AppData);
  } catch {
    return null;
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    localStorage.setItem(THEME_KEY, data.preferences.theme);
  } catch {
    /* privado */
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, "data");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(slim(data)));
    } catch {
      /* sin espacio */
    }
    throw error;
  }
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(slim(data)));
  } catch {
    /* el original sigue en IndexedDB */
  }
}
