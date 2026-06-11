import type { CarbonRecord, OffsetRecord } from "../types/carbon";

const DB_NAME = "carbon-footprint-db";
const DB_VERSION = 2;
const RECORDS_STORE = "records";
const OFFSETS_STORE = "offsets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(OFFSETS_STORE)) {
        db.createObjectStore(OFFSETS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadRecords(): Promise<CarbonRecord[]> {
  const db = await openDb();
  return new Promise((resolve) => {
    const req = db.transaction(RECORDS_STORE).objectStore(RECORDS_STORE).getAll();
    req.onsuccess = () => resolve(req.result as CarbonRecord[]);
  });
}

export async function saveRecords(records: CarbonRecord[]) {
  const db = await openDb();
  const tx = db.transaction(RECORDS_STORE, "readwrite");
  tx.objectStore(RECORDS_STORE).clear();
  records.forEach((record) => tx.objectStore(RECORDS_STORE).put(record));
}

export async function loadOffsets(): Promise<OffsetRecord[]> {
  const db = await openDb();
  return new Promise((resolve) => {
    const req = db.transaction(OFFSETS_STORE).objectStore(OFFSETS_STORE).getAll();
    req.onsuccess = () => resolve(req.result as OffsetRecord[]);
  });
}

export async function saveOffsets(offsets: OffsetRecord[]) {
  const db = await openDb();
  const tx = db.transaction(OFFSETS_STORE, "readwrite");
  tx.objectStore(OFFSETS_STORE).clear();
  offsets.forEach((offset) => tx.objectStore(OFFSETS_STORE).put(offset));
}
