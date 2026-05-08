/**
 * Storage layer using Supabase (cloud database + file storage).
 * Albums and reviews in PostgreSQL, photos in Supabase Storage.
 * Works across devices — shareable links work for everyone.
 */
import { supabase } from "./supabaseClient";

// ── Public types (unchanged from before) ───────────────────────

export interface Photo {
  id: string;
  url: string;
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

// ── Helpers ────────────────────────────────────────────────────

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ── Album CRUD ─────────────────────────────────────────────────

export async function saveAlbum(
  meta: { id: string; title: string; createdAt: number },
  photos: { id: string; blob: Blob; name: string }[]
): Promise<void> {
  // 1. Upload each photo to Supabase Storage
  const photoRecords: { id: string; album_id: string; name: string; storage_path: string; position: number }[] = [];
  let thumbnailUrl = "";

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const path = `${meta.id}/${p.id}.jpg`;

    const { error } = await supabase.storage
      .from("photos")
      .upload(path, p.blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;

    const url = getPublicUrl(path);
    if (i === 0) thumbnailUrl = url;

    photoRecords.push({
      id: p.id,
      album_id: meta.id,
      name: p.name,
      storage_path: path,
      position: i,
    });
  }

  // 2. Save album metadata
  const { error: albumErr } = await supabase.from("albums").insert({
    id: meta.id,
    title: meta.title,
    created_at: meta.createdAt,
    thumbnail_url: thumbnailUrl,
  });
  if (albumErr) throw albumErr;

  // 3. Save photo records
  if (photoRecords.length > 0) {
    const { error: photoErr } = await supabase.from("photos").insert(photoRecords);
    if (photoErr) throw photoErr;
  }
}

export async function getAlbum(id: string): Promise<Album | null> {
  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .single();

  if (!album) return null;

  const { data: photosData } = await supabase
    .from("photos")
    .select("*")
    .eq("album_id", id)
    .order("position");

  const photos: Photo[] = (photosData || []).map((p) => ({
    id: p.id,
    url: getPublicUrl(p.storage_path),
    name: p.name,
  }));

  return {
    id: album.id,
    title: album.title,
    createdAt: album.created_at,
    photos,
  };
}

export async function getAllAlbumSummaries(): Promise<AlbumSummary[]> {
  const { data } = await supabase
    .from("albums")
    .select("id, title, created_at, thumbnail_url")
    .order("created_at", { ascending: false });

  if (!data) return [];

  // Get photo counts
  const { data: counts } = await supabase
    .from("photos")
    .select("album_id");

  const countMap = new Map<string, number>();
  (counts || []).forEach((p) => {
    countMap.set(p.album_id, (countMap.get(p.album_id) || 0) + 1);
  });

  return data.map((a) => ({
    id: a.id,
    title: a.title,
    createdAt: a.created_at,
    photoCount: countMap.get(a.id) || 0,
    thumbnailUrl: a.thumbnail_url || "",
  }));
}

export async function deleteAlbum(id: string): Promise<void> {
  // Get photo paths for storage cleanup
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("album_id", id);

  // Delete from storage
  if (photos && photos.length > 0) {
    await supabase.storage
      .from("photos")
      .remove(photos.map((p) => p.storage_path));
  }

  // Delete album (CASCADE deletes photos + reviews)
  await supabase.from("albums").delete().eq("id", id);
}

// ── Review CRUD ────────────────────────────────────────────────

export async function saveReview(review: Review): Promise<void> {
  const { error } = await supabase.from("reviews").insert({
    id: review.id,
    album_id: review.albumId,
    reviewer_name: review.reviewerName,
    selected_photo_ids: review.selectedPhotoIds,
    feedback: review.feedback,
    submitted_at: review.submittedAt,
  });
  if (error) throw error;
}

export async function getReviewsForAlbum(albumId: string): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("album_id", albumId)
    .order("submitted_at");

  return (data || []).map((r) => ({
    id: r.id,
    albumId: r.album_id,
    reviewerName: r.reviewer_name,
    selectedPhotoIds: r.selected_photo_ids,
    feedback: r.feedback as PhotoFeedback[],
    submittedAt: r.submitted_at,
  }));
}

// ── No-ops (kept for backward compatibility with page imports) ─

/** No-op — Supabase URLs don't need revoking */
export function revokePhotoUrls(_photos: Photo[]): void {}

/** No-op — migration not needed with Supabase */
export async function migrateFromLocalStorage(): Promise<void> {}

/** No-op — Supabase handles storage */
export async function getStorageEstimate(): Promise<{ usedMB: number; quotaMB: number } | null> {
  return null;
}