/**
 * Storage layer using IndexedDB for large photo storage.
 * localStorage has a ~5MB limit; IndexedDB supports hundreds of MB to GB.
 * Photos are stored as binary Blobs (no base64 overhead).
 */

// ── Types ──────────────────────────────────────────────────────

export interface Photo {
  id: string;
  url: string; // object URL for display (created from stored blob)
  name: string;
}

export interface Album {
  id: string;
  title: string;
  createdAt: number;
  photos: Photo[];
}

export interface AlbumSummary {
  id: string;
  title: string;
  createdAt: number;
  photoCount: number;
  thumbnailUrl: string;
}

export interface PhotoFeedback {
  photoId: string;
  text: string;
}

export interface Review {
  id: string;
  albumId: string;
  reviewerName: string;
  selectedPhotoIds: string[];
  feedback: PhotoFeedback[];
  submittedAt: number;
}

// ── Internal stored types ──────────────────────────────────────

interface StoredAlbumMeta {
  id: string;
  title: string;
  createdAt: number;
  photoIds: string[];
  thumbnailDataUrl: string; // tiny thumbnail for list view
}

interface StoredPhoto {
  id: string;
  albumId: string;
  blob: Blob;
  name: string;
}

// ── IndexedDB setup ────────────────────────────────────────────

const DB_NAME = "picpick_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("albums")) {
        db.createObjectStore("albums", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("photos")) {
        const ps = db.createObjectStore("photos", { keyPath: "id" });
        ps.createIndex("albumId", "albumId", { unique: false });
      }
      if (!db.objectStoreNames.contains("reviews")) {
        const rs = db.createObjectStore("reviews", { keyPath: "id" });
        rs.createIndex("albumId", "albumId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function idbGetAll<T>(store: string): Promise<T[]> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function idbGetByIndex<T>(store: string, indexName: string, key: string): Promise<T[]> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.getAll(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function idbPut(store: string, value: unknown): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

// ── Thumbnail generator ────────────────────────────────────────

async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(blob);
    img.onload = () => {
      const size = 120;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL("image/jpeg", 0.5));
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("Thumbnail failed")); };
    img.src = src;
  });
}

// ── Album CRUD ─────────────────────────────────────────────────

export async function saveAlbum(
  meta: { id: string; title: string; createdAt: number },
  photos: { id: string; blob: Blob; name: string }[]
): Promise<void> {
  const thumbnail = photos.length > 0
    ? await generateThumbnail(photos[0].blob)
    : "";

  const albumMeta: StoredAlbumMeta = {
    id: meta.id,
    title: meta.title,
    createdAt: meta.createdAt,
    photoIds: photos.map(p => p.id),
    thumbnailDataUrl: thumbnail,
  };

  await idbPut("albums", albumMeta);
  for (const p of photos) {
    const stored: StoredPhoto = { id: p.id, albumId: meta.id, blob: p.blob, name: p.name };
    await idbPut("photos", stored);
  }
}

export async function getAlbum(id: string): Promise<Album | null> {
  const meta = await idbGet<StoredAlbumMeta>("albums", id);
  if (!meta) return null;

  const storedPhotos = await idbGetByIndex<StoredPhoto>("photos", "albumId", id);
  const photoMap = new Map(storedPhotos.map(p => [p.id, p]));

  const photos: Photo[] = meta.photoIds
    .map(pid => photoMap.get(pid))
    .filter((p): p is StoredPhoto => !!p)
    .map(p => ({ id: p.id, url: URL.createObjectURL(p.blob), name: p.name }));

  return { id: meta.id, title: meta.title, createdAt: meta.createdAt, photos };
}

export async function getAllAlbumSummaries(): Promise<AlbumSummary[]> {
  const metas = await idbGetAll<StoredAlbumMeta>("albums");
  return metas.map(m => ({
    id: m.id,
    title: m.title,
    createdAt: m.createdAt,
    photoCount: m.photoIds.length,
    thumbnailUrl: m.thumbnailDataUrl,
  }));
}

export async function deleteAlbum(id: string): Promise<void> {
  const meta = await idbGet<StoredAlbumMeta>("albums", id);
  if (meta) {
    for (const pid of meta.photoIds) {
      await idbDelete("photos", pid);
    }
  }
  await idbDelete("albums", id);
  await deleteReviewsForAlbum(id);
}

// ── Review CRUD ────────────────────────────────────────────────

export async function saveReview(review: Review): Promise<void> {
  await idbPut("reviews", review);
}

export async function getReviewsForAlbum(albumId: string): Promise<Review[]> {
  return idbGetByIndex<Review>("reviews", "albumId", albumId);
}

async function deleteReviewsForAlbum(albumId: string): Promise<void> {
  const reviews = await getReviewsForAlbum(albumId);
  for (const r of reviews) {
    await idbDelete("reviews", r.id);
  }
}

// ── Helpers ────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Revoke object URLs to free memory. Call on component unmount. */
export function revokePhotoUrls(photos: Photo[]): void {
  photos.forEach(p => {
    try { URL.revokeObjectURL(p.url); } catch { /* ignore */ }
  });
}

/** Storage estimate (if browser supports it) */
export async function getStorageEstimate(): Promise<{ usedMB: number; quotaMB: number } | null> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return {
      usedMB: Math.round((est.usage ?? 0) / 1024 / 1024),
      quotaMB: Math.round((est.quota ?? 0) / 1024 / 1024),
    };
  }
  return null;
}

// ── Migration from localStorage ────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const b64 = atob(parts[1]);
  const u8 = new Uint8Array(b64.length);
  for (let i = 0; i < b64.length; i++) u8[i] = b64.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

interface LegacyPhoto { id: string; dataUrl: string; name: string; }
interface LegacyAlbum { id: string; title: string; createdAt: number; photos: LegacyPhoto[]; }

export async function migrateFromLocalStorage(): Promise<void> {
  const ALBUMS_KEY = "picpick_albums";
  const REVIEWS_KEY = "picpick_reviews";
  const MIGRATED_KEY = "picpick_migrated_to_idb";

  if (localStorage.getItem(MIGRATED_KEY)) return;

  try {
    const rawAlbums = localStorage.getItem(ALBUMS_KEY);
    if (rawAlbums) {
      const albums: LegacyAlbum[] = JSON.parse(rawAlbums);
      for (const album of albums) {
        const photos = album.photos.map(p => ({
          id: p.id,
          blob: dataUrlToBlob(p.dataUrl),
          name: p.name,
        }));
        await saveAlbum(
          { id: album.id, title: album.title, createdAt: album.createdAt },
          photos
        );
      }
    }

    const rawReviews = localStorage.getItem(REVIEWS_KEY);
    if (rawReviews) {
      const reviews: Review[] = JSON.parse(rawReviews);
      for (const r of reviews) await saveReview(r);
    }

    localStorage.setItem(MIGRATED_KEY, "1");
    localStorage.removeItem(ALBUMS_KEY);
    localStorage.removeItem(REVIEWS_KEY);
  } catch (e) {
    console.warn("Migration from localStorage failed:", e);
  }
}