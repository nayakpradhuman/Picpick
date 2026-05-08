export interface Photo {
  id: string;
  dataUrl: string;
  name: string;
}

export interface Album {
  id: string;
  title: string;
  createdAt: number;
  photos: Photo[];
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

const ALBUMS_KEY = "picpick_albums";
const REVIEWS_KEY = "picpick_reviews";

export function saveAlbum(album: Album): void {
  const albums = getAllAlbums();
  const existing = albums.findIndex((a) => a.id === album.id);
  if (existing >= 0) {
    albums[existing] = album;
  } else {
    albums.push(album);
  }
  localStorage.setItem(ALBUMS_KEY, JSON.stringify(albums));
}

export function getAlbum(id: string): Album | null {
  const albums = getAllAlbums();
  return albums.find((a) => a.id === id) || null;
}

export function getAllAlbums(): Album[] {
  try {
    const raw = localStorage.getItem(ALBUMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteAlbum(id: string): void {
  const albums = getAllAlbums().filter((a) => a.id !== id);
  localStorage.setItem(ALBUMS_KEY, JSON.stringify(albums));
  deleteReviewsForAlbum(id);
}

export function saveReview(review: Review): void {
  const reviews = getAllReviews();
  const existing = reviews.findIndex((r) => r.id === review.id);
  if (existing >= 0) {
    reviews[existing] = review;
  } else {
    reviews.push(review);
  }
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

export function getReviewsForAlbum(albumId: string): Review[] {
  return getAllReviews().filter((r) => r.albumId === albumId);
}

export function deleteReviewsForAlbum(albumId: string): void {
  const reviews = getAllReviews().filter((r) => r.albumId !== albumId);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

function getAllReviews(): Review[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}