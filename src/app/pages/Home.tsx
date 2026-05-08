import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Upload, ImagePlus, X, Sparkles, ArrowRight, Images, Trash2, Clock, FolderOpen, HardDrive } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  saveAlbum, generateId, getAllAlbumSummaries, deleteAlbum,
  migrateFromLocalStorage, getStorageEstimate, type AlbumSummary,
} from "../lib/storage";
import { compressImage } from "../lib/imageUtils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface PendingPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  name: string;
}

export function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingAlbums, setExistingAlbums] = useState<AlbumSummary[]>([]);
  const [storageInfo, setStorageInfo] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      await migrateFromLocalStorage();
      setExistingAlbums(await getAllAlbumSummaries());
      const est = await getStorageEstimate();
      if (est) setStorageInfo(`${est.usedMB} MB used of ${est.quotaMB} MB`);
    };
    init();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => { photos.forEach(p => URL.revokeObjectURL(p.previewUrl)); };
  }, [photos]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    setUploading(true);
    const results: PendingPhoto[] = [];

    for (const file of fileArray) {
      try {
        const blob = await compressImage(file);
        const previewUrl = URL.createObjectURL(blob);
        results.push({ id: generateId(), blob, previewUrl, name: file.name });
      } catch {
        toast.error(`Could not process ${file.name}`);
      }
    }

    setPhotos((prev) => [...prev, ...results]);
    setUploading(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCreate = async () => {
    if (!albumTitle.trim()) { toast.error("Please enter an album title"); return; }
    if (photos.length === 0) { toast.error("Please upload at least one photo"); return; }
    if (uploading) { toast.error("Please wait for photos to finish uploading"); return; }

    setIsCreating(true);
    const albumId = generateId();

    try {
      await saveAlbum(
        { id: albumId, title: albumTitle.trim(), createdAt: Date.now() },
        photos.map(p => ({ id: p.id, blob: p.blob, name: p.name }))
      );
      setTimeout(() => navigate(`/album/${albumId}/results`), 300);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save album. Please try again.");
      setIsCreating(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string, title: string) => {
    if (!window.confirm(`Delete "${title}" and all its reviews? This cannot be undone.`)) return;
    await deleteAlbum(albumId);
    setExistingAlbums(await getAllAlbumSummaries());
    toast.success("Album deleted");
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf0f8] via-white to-[#f0f0ff]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] flex items-center justify-center shrink-0">
            <Images className="w-4 h-4 text-white" />
          </div>
          <span className="text-[#1a1a2e]" style={{ fontWeight: 600 }}>PicPick</span>
          <span className="text-[#717182] text-sm hidden sm:inline">— share photos, get feedback</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f472b6]/10 to-[#8b5cf6]/10 border border-[#f472b6]/20 rounded-full px-3.5 py-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span className="text-sm text-[#8b5cf6]">No account needed</span>
          </div>
          <h1 className="text-[#1a1a2e] mb-2">Upload & Share for Feedback</h1>
          <p className="text-[#717182] text-sm max-w-sm mx-auto leading-relaxed">
            Upload photos, share a link — friends pick their favorites and leave suggestions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden"
        >
          {/* Album title */}
          <div className="p-4 sm:p-6 border-b border-black/5">
            <label className="block text-sm text-[#717182] mb-2">Album title</label>
            <Input
              placeholder="e.g. Tokyo Trip, Graduation Photos…"
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
              className="h-11 text-base"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          {/* Upload zone */}
          <div className="p-4 sm:p-6">
            <div
              className={`relative border-2 border-dashed rounded-2xl py-8 px-4 text-center cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                isDragging
                  ? "border-[#8b5cf6] bg-[#8b5cf6]/5"
                  : "border-black/10 hover:border-[#f472b6]/50 hover:bg-[#fdf0f8]/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f472b6]/15 to-[#8b5cf6]/15 flex items-center justify-center">
                  {uploading ? (
                    <span className="w-6 h-6 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-[#8b5cf6]" />
                  )}
                </div>
                <div>
                  <p className="text-[#1a1a2e] text-sm" style={{ fontWeight: 500 }}>
                    {uploading ? "Processing photos…" : "Tap to add photos"}
                  </p>
                  <p className="text-[#717182] text-xs mt-0.5">
                    {uploading ? "Please wait" : "JPG, PNG, WEBP — auto-compressed"}
                  </p>
                </div>
              </div>
            </div>

            {/* Photo grid preview */}
            <AnimatePresence>
              {photos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[#717182]">
                      {photos.length} photo{photos.length !== 1 ? "s" : ""} ready
                    </span>
                    <button
                      className="flex items-center gap-1.5 text-sm text-[#8b5cf6] transition-colors py-1 px-2 -mr-2 rounded-lg active:opacity-70"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Add more
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photos.map((photo, i) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ delay: i * 0.03 }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                      >
                        <img src={photo.previewUrl} alt={photo.name} className="w-full h-full object-cover" />
                        <button
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/65 rounded-full flex items-center justify-center active:bg-black/90 transition-colors"
                          onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA */}
          <div className="px-4 sm:px-6 pb-5">
            <Button
              className="w-full bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] hover:opacity-90 active:opacity-80 text-white border-0 h-12 rounded-xl text-base"
              onClick={handleCreate}
              disabled={isCreating || uploading}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                <>
                  Create Album & Get Share Link
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            {storageInfo && (
              <p className="text-center text-xs text-[#717182] mt-3 leading-relaxed flex items-center justify-center gap-1">
                <HardDrive className="w-3 h-3" />
                {storageInfo}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── My Albums ──────────────────────────────────────────── */}
        <AnimatePresence>
          {existingAlbums.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
              className="mt-6 bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-3.5 border-b border-black/5 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#8b5cf6]" />
                <span className="text-[#1a1a2e] text-sm" style={{ fontWeight: 600 }}>
                  My Albums ({existingAlbums.length})
                </span>
              </div>
              <div className="divide-y divide-black/5">
                {[...existingAlbums].reverse().map((album) => (
                  <div
                    key={album.id}
                    className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {album.thumbnailUrl && (
                        <img src={album.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <button
                      className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
                      onClick={() => navigate(`/album/${album.id}/results`)}
                    >
                      <p className="text-[#1a1a2e] text-sm truncate" style={{ fontWeight: 500 }}>
                        {album.title}
                      </p>
                      <p className="text-[#717182] text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(album.createdAt)} · {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                      </p>
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#717182] hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-all shrink-0"
                      onClick={() => handleDeleteAlbum(album.id, album.title)}
                      title="Delete album"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
