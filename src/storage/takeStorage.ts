import type { SavedTake } from '../types/take';

const DB_NAME = 'violin-harmonic-analyzer-db';
const STORE = 'takes';
const VERSION = 1;

export async function openTakeDb(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) throw new Error('IndexedDB is not supported');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const run = async <T,>(mode: IDBTransactionMode, action: (store: IDBObjectStore, done: (v:T)=>void, fail: (e?:unknown)=>void)=>void): Promise<T> => {
  const db = await openTakeDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    action(store, resolve, reject);
    tx.onerror = () => reject(tx.error);
  });
};
export async function saveTake(take: SavedTake): Promise<void> { await run('readwrite', (s,d,f)=>{ const r=s.put(take); r.onsuccess=()=>d(undefined); r.onerror=()=>f(r.error);}); }
export async function getAllTakes(): Promise<SavedTake[]> { return run('readonly', (s,d,f)=>{ const r=s.getAll(); r.onsuccess=()=>d((r.result as SavedTake[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))); r.onerror=()=>f(r.error);}); }
export async function getTake(id: string): Promise<SavedTake | null> { return run('readonly', (s,d,f)=>{ const r=s.get(id); r.onsuccess=()=>d((r.result as SavedTake) ?? null); r.onerror=()=>f(r.error);}); }
export async function deleteTake(id: string): Promise<void> { await run('readwrite', (s,d,f)=>{ const r=s.delete(id); r.onsuccess=()=>d(undefined); r.onerror=()=>f(r.error);}); }
