import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Check, MessageSquare, Send, Images, ThumbsUp,
  ChevronLeft, ChevronRight, X, Maximize2, Home,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  getAlbum, saveReview, generateId, revokePhotoUrls,
  type Album, type PhotoFeedback,
} from "../lib/storage";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function ReviewAlbum() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewerName, setReviewerName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      const found = await getAlbum(id);
      if (cancelled) return;
      if (found) setAlbum(found);
      else setNotFound(true);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
      // Revoke object URLs on unmount
      if (album) revokePhotoUrls(album.photos);
    };
  }, [id]);

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });
    setActiveComment(null);
  };

  const handleSubmit = async () => {
    if (!reviewerName.trim()) { toast.error("Please enter your name first"); return; }
    if (selectedIds.size === 0) { toast.error("Please select at least one photo you like"); return; }

    const photoFeedback: PhotoFeedback[] = Object.entries(feedback)
      .filter(([, text]) => text.trim())
      .map(([photoId, text]) => ({ photoId, text: text.trim() }));

    await saveReview({
      id: generateId(),
      albumId: id!,
      reviewerName: reviewerName.trim(),
      selectedPhotoIds: Array.from(selectedIds),
      feedback: photoFeedback,
      submittedAt: Date.now(),
    });

    setSubmitted(true);
  };

  const lightboxIndex = album?.photos.findIndex((p) => p.id === lightboxPhoto) ?? -1;

  const goLightbox = (dir: "prev" | "next") => {
    if (!album || lightboxIndex < 0) return;
    const len = album.photos.length;
    const newIndex = dir === "prev" ? (lightboxIndex - 1 + len) % len : (lightboxIndex + 1) % len;
    setLightboxPhoto(album.photos[newIndex].id);
  };

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) goLightbox(diff < 0 ? "next" : "prev");
    touchStartX.current = null;
  };

  /* ── Not found ─────────────────────────────────────────────── */
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf0f8] via-white to-[#f0f0ff] flex items-center justify-center px-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f472b6]/20 to-[#8b5cf6]/20 flex items-center justify-center mx-auto mb-4">
            <Images className="w-8 h-8 text-[#8b5cf6]" />
          </div>
          <h2 className="text-[#1a1a2e] mb-2">Album not found</h2>
          <p className="text-[#717182] text-sm mb-6 leading-relaxed">
            This link may have expired or the album was created on a different browser.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] text-white border-0 h-11 w-full rounded-xl"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  /* ── Loading ────────────────────────────────────────────────── */
  if (loading || !album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Success ────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf0f8] via-white to-[#f0f0ff] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-xs w-full"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-200">
            <ThumbsUp className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-[#1a1a2e] mb-2">Feedback Sent! 🎉</h2>
          <p className="text-[#717182] text-sm mb-1">
            Thanks <strong>{reviewerName}</strong>! You picked{" "}
            <strong>{selectedIds.size}</strong> photo{selectedIds.size !== 1 ? "s" : ""}.
          </p>
          <p className="text-[#717182] text-sm mb-7">Your selections have been saved.</p>
          <Button
            onClick={() => navigate("/")}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] text-white border-0"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ── Main review view ──────────────────────────────────────── */
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#fdf0f8] via-white to-[#f0f0ff] pb-36">
        {/* Header */}
        <header className="border-b border-black/5 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] flex items-center justify-center shrink-0">
              <Images className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#1a1a2e] truncate text-sm" style={{ fontWeight: 600 }}>{album.title}</p>
            </div>
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 bg-[#8b5cf6] text-white text-xs rounded-full px-2.5 py-1 shrink-0"
                >
                  <Check className="w-3 h-3" />
                  {selectedIds.size} selected
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-3 py-4">
          {/* Instruction banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-black/5 px-4 py-3.5 mb-4 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f472b6]/20 to-[#8b5cf6]/20 flex items-center justify-center shrink-0">
              <span className="text-base">✨</span>
            </div>
            <p className="text-[#717182] text-sm leading-snug pt-0.5">
              <span className="text-[#1a1a2e]" style={{ fontWeight: 600 }}>Tap a photo</span> to select it as a favourite.
              Use the <span className="text-[#1a1a2e]" style={{ fontWeight: 600 }}>💬 Add suggestion</span> button to leave feedback.
            </p>
          </motion.div>

          {/* Photo grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {album.photos.map((photo, i) => {
              const isSelected = selectedIds.has(photo.id);
              const hasFeedback = !!feedback[photo.id]?.trim();
              const isCommentOpen = activeComment === photo.id;

              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col gap-1.5"
                >
                  <div
                    className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.97] ${
                      isSelected
                        ? "ring-[3px] ring-[#8b5cf6] ring-offset-2 shadow-lg shadow-purple-100"
                        : "shadow-sm"
                    }`}
                    onClick={() => toggleSelect(photo.id)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className={`w-full h-full object-cover transition-transform duration-200 ${isSelected ? "scale-[1.03]" : ""}`}
                    />
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-[#8b5cf6]/20"
                        >
                          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#8b5cf6] shadow flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      className="absolute top-2 left-2 w-7 h-7 bg-black/50 rounded-lg flex items-center justify-center active:bg-black/70 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setLightboxPhoto(photo.id); }}
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>

                  <button
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all active:scale-95 ${
                      hasFeedback
                        ? "bg-[#f472b6] text-white"
                        : "bg-white border border-black/10 text-[#717182]"
                    }`}
                    onClick={() => setActiveComment(isCommentOpen ? null : photo.id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {hasFeedback ? "Edit suggestion" : "Add suggestion"}
                  </button>

                  <AnimatePresence>
                    {isCommentOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white rounded-xl border border-black/10 p-3 shadow-sm">
                          <Textarea
                            placeholder="Your suggestion for this photo…"
                            value={feedback[photo.id] || ""}
                            onChange={(e) =>
                              setFeedback((prev) => ({ ...prev, [photo.id]: e.target.value }))
                            }
                            className="text-sm resize-none min-h-[72px]"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {feedback[photo.id] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-[#717182]"
                                onClick={() => {
                                  setFeedback((prev) => { const n = { ...prev }; delete n[photo.id]; return n; });
                                  setActiveComment(null);
                                }}
                              >
                                Clear
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] text-white border-0 rounded-lg"
                              onClick={() => setActiveComment(null)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Sticky bottom submit bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur-md border-t border-black/10 px-4 pt-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <Input
            placeholder="Your name (required)"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="h-10 text-sm bg-[#f8f8fb]"
          />
          <Button
            className="w-full bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] text-white border-0 h-12 rounded-xl active:opacity-80"
            onClick={handleSubmit}
          >
            <Send className="w-4 h-4 mr-2" />
            {selectedIds.size > 0
              ? `Submit — ${selectedIds.size} photo${selectedIds.size !== 1 ? "s" : ""} selected`
              : "Submit Feedback"}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center"
            onClick={() => setLightboxPhoto(null)}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-white/15 rounded-full flex items-center justify-center active:bg-white/30 z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxPhoto(null); }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {album.photos.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 rounded-full flex items-center justify-center active:bg-white/30 z-10"
                  onClick={(e) => { e.stopPropagation(); goLightbox("prev"); }}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 rounded-full flex items-center justify-center active:bg-white/30 z-10"
                  onClick={(e) => { e.stopPropagation(); goLightbox("next"); }}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            <motion.img
              key={lightboxPhoto}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              src={album.photos.find((p) => p.id === lightboxPhoto)?.url}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
              style={{ padding: "0 56px" }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 inset-x-0 text-center">
              <span className="text-white/70 text-sm">
                {lightboxIndex + 1} / {album.photos.length}
              </span>
              {album.photos.length > 1 && (
                <p className="text-white/40 text-xs mt-0.5">Swipe to navigate</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
