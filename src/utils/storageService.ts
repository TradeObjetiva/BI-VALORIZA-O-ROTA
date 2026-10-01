import { RawTradeRow } from '../types/trade';

export interface SavedSheet {
  id: string;
  name: string;
  fileName: string;
  uploadDate: string;
  rowCount: number;
  data: RawTradeRow[];
  isDefault: boolean;
}

export type SavedSheetMeta = Omit<SavedSheet, 'data'>;

const DB_NAME = 'BI_VALORIZACAO_TRADE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'sheets';
export const LAST_UPLOADED_ID = 'last-uploaded';
const LAST_META_KEY = 'bi-valorizacao-last-file';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('uploadDate', 'uploadDate', { unique: false });
        store.createIndex('isDefault', 'isDefault', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function persistLastUploadedSheet(
  name: string,
  fileName: string,
  data: RawTradeRow[]
): Promise<SavedSheet> {
  return saveSheetToStorage(name, fileName, data, true, LAST_UPLOADED_ID);
}

export async function saveSheetToStorage(
  name: string,
  fileName: string,
  data: RawTradeRow[],
  setAsDefault = true,
  fixedId?: string
): Promise<SavedSheet> {
  const db = await openDB();
  const id = fixedId || `sheet-${Date.now()}`;
  const now = new Date().toISOString();

  // If setAsDefault, clear existing default flags
  if (setAsDefault) {
    await clearDefaultFlag(db);
  }

  const sheet: SavedSheet = {
    id,
    name: name || fileName,
    fileName,
    uploadDate: now,
    rowCount: data.length,
    data,
    isDefault: setAsDefault,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(sheet);

    req.onsuccess = () => {
      try {
        localStorage.setItem(
          LAST_META_KEY,
          JSON.stringify({ id, name: sheet.name, fileName: sheet.fileName, rowCount: sheet.rowCount })
        );
      } catch {
        /* quota / private mode */
      }
      resolve(sheet);
    };
    req.onerror = () => reject(req.error);
  });
}

async function clearDefaultFlag(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        if (cursor.value.isDefault) {
          const updated = { ...cursor.value, isDefault: false };
          cursor.update(updated);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSavedSheets(): Promise<SavedSheetMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    const result: SavedSheetMeta[] = [];

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        const { data, ...meta } = cursor.value;
        result.push(meta);
        cursor.continue();
      } else {
        // Sort newest first
        result.sort(
          (a, b) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
        resolve(result);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSheetById(id: string): Promise<SavedSheet | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getDefaultOrLastSheet(): Promise<SavedSheet | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    const list: SavedSheet[] = [];

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        list.push(cursor.value);
        cursor.continue();
      } else {
        if (list.length === 0) {
          resolve(null);
          return;
        }
        const lastUploaded = list.find((s) => s.id === LAST_UPLOADED_ID);
        if (lastUploaded) {
          resolve(lastUploaded);
          return;
        }
        const def = list.find((s) => s.isDefault);
        if (def) {
          resolve(def);
          return;
        }
        // Otherwise sort by uploadDate descending
        list.sort(
          (a, b) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
        resolve(list[0]);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setDefaultSheet(id: string): Promise<void> {
  const db = await openDB();
  await clearDefaultFlag(db);
  const sheet = await getSheetById(id);
  if (!sheet) return;

  sheet.isDefault = true;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(sheet);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSheet(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllSavedSheets(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
