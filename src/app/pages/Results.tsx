import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  Copy,
  Check,
  MessageSquare,
  Users,
  Images,
  Star,
  ArrowLeft,
  Share2,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { getAlbum, getReviewsForAlbum, deleteAlbum, type Album, type Review } from "../lib/storage";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [copied, setCopied] = useState(false);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = (albumId: string) => {
    const found = getAlbum(albumId);
    if (found) { setAlbum(found); setReviews(getReviewsForAlbum(albumId)); }
    else setNotFound(true);
  };

  useEffect(() => { if (id) loadData(id); }, [id]);

  // Poll for new reviews every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (id) setReviews(getReviewsForAlbum(id));
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const shareLink = `${window.location.origin}/album/${id}`;

  const handleShare = async () => {
    // Use native share on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: album?.title ?? "PicPick Album",
          text: "Pick your favourite photos and leave suggestions!",
          url: shareLink,
        });
        return;
      } catch {
        // User cancelled share — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy — please copy the link manually");
    }
  };

  const manualRefresh = () => {
    if (!id) return;
    setRefreshing(true);
    setReviews(getReviewsForAlbum(id));
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleDelete = () => {
    if (!id || !album) return;
    if (!window.confirm(`Delete "${album.title}" and all its reviews? This cannot be undone.`)) return;
    deleteAlbum(id);
    toast.success("Album deleted");
    navigate("/");
  };

  const handleExport = () => {
    if (!album) return;
    let text = `PicPick Results — ${album.title}\n`;
    text += `${"=".repeat(40)}\n\n`;
    text += `Photos: ${album.photos.length}\n`;
    text += `Responses: ${reviews.length}\n`;
    text += `Total suggestions: ${reviews.reduce((a, r) => a + r.feedback.filter((f) => f.text).length, 0)}\n\n`;

    if (reviews.length > 0) {
      text += `Photo Rankings:\n${"-".repeat(30)}\n`;
      sortedPhotos.forEach((photo, i) => {
        const votes = getVoteCount(photo.id);
        const suggestions = getSuggestions(photo.id);
        text += `${i + 1}. ${photo.name} — ${votes} vote${votes !== 1 ? "s" : ""}`;
        if (suggestions.length > 0) {
          text += `, ${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""}`;
        }
        text += "\n";
        suggestions.forEach((s) => { text += `   💬 ${s.reviewer}: ${s.text}\n`; });
      });

      text += `\nIndividual Responses:\n${"-".repeat(30)}\n`;
      reviews.forEach((r) => {
        text += `\n${r.reviewerName} — picked ${r.selectedPhotoIds.length} photo${r.selectedPhotoIds.length !== 1 ? "s" : ""}\n`;
        r.feedback.filter((f) => f.text).forEach((f) => {
          const p = album.photos.find((ph) => ph.id === f.photoId);
          text += `  💬 ${p?.name ?? "Photo"}: ${f.text}\n`;
        });
      });
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${album.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}_results.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported!");
  };

  const getVoteCount = (photoId: string) =>
    reviews.filter((r) => r.selectedPhotoIds.includes(photoId)).length;

  const getSuggestions = (photoId: string) =>
    reviews
      .flatMap((r) =>
        r.feedback
          .filter((f) => f.photoId === photoId && f.text)
          .map((f) => ({ reviewer: r.reviewerName, text: f.text }))
      );

  const sortedPhotos = album
    ? [...album.photos].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id))
    : [];
  const maxVotes = sortedPhotos.length > 0 ? getVoteCount(sortedPhotos[0].id) : 0;

  /* ── Not found ─────────────────────────────────────────────── */
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf0f8] via-white to-[#f0f0ff] flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-[#1a1a2e] mb-2">Album not found</h2>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] text-white border-0 h-11 rounded-xl"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  /* ── Loading ────────────────────────────────────────────────── */
  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSuggestions = reviews.reduce(
    (acc, r) => acc + r.feedback.filter((f) => f.text).length,
    0
  );

  /* ── Main ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf0f8] via-white to-[#f0f0ff]">

      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-2.5">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-black/5 transition-colors shrink-0"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 text-[#717182]" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] flex items-center justify-center shrink-0">
            <Images className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[#1a1a2e] truncate block text-sm" style={{ fontWeight: 600 }}>
              {album.title}
            </span>
          </div>
          <Link
            to={`/album/${id}`}
            className="flex items-center gap-1.5 text-sm text-[#8b5cf6] active:text-[#f472b6] transition-colors shrink-0 py-1 px-2 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Preview</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-12">

        {/* Share card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-black/5 p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-[#8b5cf6] shrink-0" />
            <span className="text-[#1a1a2e] text-sm" style={{ fontWeight: 500 }}>
              Share with friends
            </span>
          </div>

          {/* URL display row */}
          <div className="flex items-center gap-2 bg-[#f8f8fb] border border-black/8 rounded-xl px-3 py-2.5 mb-3">
            <span className="flex-1 text-xs text-[#717182] font-mono truncate">{shareLink}</span>
          </div>

          {/* Share / Copy button */}
          <Button
            className={`w-full h-11 rounded-xl border-0 transition-all ${
              copied
                ? "bg-green-500 text-white"
                : "bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] text-white"
            }`}
            onClick={handleShare}
          >
            {copied ? (
              <><Check className="w-4 h-4 mr-2" /> Copied!</>
            ) : (
              <><Share2 className="w-4 h-4 mr-2" /> Share Link</>
            )}
          </Button>

          <p className="text-xs text-[#717182] mt-2.5 leading-relaxed">
            ⚠️ Data is stored in this browser's localStorage. The review link works only on the same device/browser.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { icon: Images,       label: "Photos",      value: album.photos.length, color: "from-blue-400 to-blue-600" },
            { icon: Users,        label: "Responses",   value: reviews.length,      color: "from-[#f472b6] to-[#ec4899]" },
            { icon: MessageSquare,label: "Suggestions", value: totalSuggestions,    color: "from-[#8b5cf6] to-[#7c3aed]" },
          ].map(({ icon: Icon, label, value, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-black/5 p-3 text-center"
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-1.5`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-lg text-[#1a1a2e]" style={{ fontWeight: 700 }}>{value}</div>
              <div className="text-xs text-[#717182]">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Photo results */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-4">
          <div className="px-4 py-3.5 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#f472b6]" />
              <span className="text-[#1a1a2e] text-sm" style={{ fontWeight: 500 }}>
                Photo Results
                {reviews.length === 0 && (
                  <span className="text-[#717182]"> — waiting for responses</span>
                )}
              </span>
            </div>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg active:bg-black/5 transition-colors"
              onClick={manualRefresh}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#717182] ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-3">
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f472b6]/10 to-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#8b5cf6]" />
                </div>
                <p className="text-[#1a1a2e] text-sm" style={{ fontWeight: 500 }}>No responses yet</p>
                <p className="text-[#717182] text-xs mt-1">Share the link above to start getting feedback</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {sortedPhotos.map((photo, i) => {
                  const votes = getVoteCount(photo.id);
                  const suggestions = getSuggestions(photo.id);
                  const isTop = votes > 0 && votes === maxVotes;
                  const isExpanded = expandedPhotoId === photo.id;

                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div
                        className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform ${
                          isTop ? "ring-[3px] ring-[#f472b6] ring-offset-2" : ""
                        }`}
                        onClick={() => setExpandedPhotoId(isExpanded ? null : photo.id)}
                      >
                        <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />

                        {isTop && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-[#f472b6] to-[#ec4899] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                            <Star className="w-2.5 h-2.5" />
                            Top
                          </div>
                        )}

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent p-2.5 flex items-center gap-2">
                          <div className="flex items-center gap-1 text-white text-xs">
                            <Check className="w-3 h-3" />
                            <span>{votes}</span>
                          </div>
                          {suggestions.length > 0 && (
                            <div className="flex items-center gap-1 text-white text-xs">
                              <MessageSquare className="w-3 h-3" />
                              <span>{suggestions.length}</span>
                            </div>
                          )}
                          {(votes > 0 || suggestions.length > 0) && (
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-white ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Vote bar */}
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#f472b6] to-[#8b5cf6] rounded-full transition-all duration-700"
                          style={{ width: maxVotes > 0 ? `${(votes / maxVotes) * 100}%` : "0%" }}
                        />
                      </div>

                      {/* Suggestions panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 bg-[#fdf0f8] border border-[#f472b6]/20 rounded-xl p-3">
                              {suggestions.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-xs text-[#f472b6]" style={{ fontWeight: 600 }}>Suggestions</p>
                                  {suggestions.map((s, si) => (
                                    <div key={si} className="text-xs text-[#1a1a2e] leading-relaxed">
                                      <span className="text-[#8b5cf6]" style={{ fontWeight: 600 }}>{s.reviewer}: </span>
                                      {s.text}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-[#717182] text-center py-1">No suggestions for this photo</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Individual responses */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-4">
            <div className="px-4 py-3.5 border-b border-black/5 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-[#1a1a2e] text-sm" style={{ fontWeight: 500 }}>
                Individual Responses ({reviews.length})
              </span>
            </div>
            <div className="divide-y divide-black/5">
              {reviews.map((review) => {
                const isOpen = expandedReviewId === review.id;
                const suggestionCount = review.feedback.filter((f) => f.text).length;

                return (
                  <div key={review.id}>
                    <button
                      className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
                      onClick={() => setExpandedReviewId(isOpen ? null : review.id)}
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] flex items-center justify-center text-white text-xs shrink-0"
                        style={{ fontWeight: 700 }}
                      >
                        {review.reviewerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1a1a2e] text-sm truncate" style={{ fontWeight: 500 }}>
                          {review.reviewerName}
                        </p>
                        <p className="text-[#717182] text-xs">
                          {review.selectedPhotoIds.length} photo{review.selectedPhotoIds.length !== 1 ? "s" : ""} picked
                          {suggestionCount > 0 && ` · ${suggestionCount} suggestion${suggestionCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#717182] transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {/* Selected photo thumbnails */}
                            {review.selectedPhotoIds.length > 0 && (
                              <div>
                                <p className="text-xs text-[#717182] mb-2">Selected photos</p>
                                <div className="flex flex-wrap gap-2">
                                  {review.selectedPhotoIds.map((pid) => {
                                    const p = album.photos.find((ph) => ph.id === pid);
                                    if (!p) return null;
                                    return (
                                      <div key={pid} className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#8b5cf6]/30">
                                        <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Suggestions */}
                            {review.feedback.filter((f) => f.text).map((f, fi) => {
                              const p = album.photos.find((ph) => ph.id === f.photoId);
                              return (
                                <div key={fi} className="flex items-start gap-2.5 bg-[#fdf0f8] rounded-xl p-3">
                                  {p && (
                                    <div className="w-9 h-9 rounded-lg shrink-0 overflow-hidden">
                                      <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <p className="text-sm text-[#717182] leading-relaxed flex-1">"{f.text}"</p>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions: Export & Delete */}
        <div className="flex gap-2.5">
          {reviews.length > 0 && (
            <Button
              className="flex-1 h-11 rounded-xl bg-white border border-black/10 text-[#1a1a2e] hover:bg-gray-50 active:bg-gray-100"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2 text-[#8b5cf6]" />
              Export Results
            </Button>
          )}
          <Button
            className="flex-1 h-11 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 active:bg-red-100"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Album
          </Button>
        </div>
      </main>
    </div>
  );
}
