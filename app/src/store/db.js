/**
 * Thin promise wrapper over IndexedDB (SR-STO-01/02). Browser-only; the store
 * API in progress.js takes this handle injected so logic tests can use a fake.
 *
 * Schema is versioned by MIGRATIONS: one entry per DB version, run forward
 * from the version found on disk. Never reorder or edit shipped entries.
 */

export const MIGRATIONS = [
  // v1 — initial schema
  (db) => {
    db.createObjectStore('profiles', { keyPath: 'id' })
    db.createObjectStore('progress', { keyPath: ['profileId', 'lessonId'] })
    db.createObjectStore('app', { keyPath: 'key' })
  }
]

export function openDb(name = 'arietta') {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, MIGRATIONS.length)
    req.onupgradeneeded = (e) => {
      for (let v = e.oldVersion; v < MIGRATIONS.length; v++) MIGRATIONS[v](req.result)
    }
    req.onsuccess = () => resolve(wrap(req.result))
    req.onerror = () => reject(req.error)
  })
}

function op(db, store, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = run(tx.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function wrap(db) {
  return {
    get: (store, key) => op(db, store, 'readonly', s => s.get(key)),
    getAll: (store) => op(db, store, 'readonly', s => s.getAll()),
    put: (store, value) => op(db, store, 'readwrite', s => s.put(value)),
    delete: (store, key) => op(db, store, 'readwrite', s => s.delete(key)),
    close: () => db.close()
  }
}
