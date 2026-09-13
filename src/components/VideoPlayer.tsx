"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  Server, 
  RefreshCw,
  Film,
  AlertCircle,
  Tv,
  Settings,
  Sparkles,
  Download,
  ChevronDown,
  Headphones,
  Subtitles,
  X,
  Check,
  PictureInPicture2,
  Gauge
} from "lucide-react";
import styles from "./VideoPlayer.module.css";

interface VideoPlayerProps {
  animeId?: string;
  animeTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
  nextEpisodeNumber?: number | null;
  malId?: number;
  anilistId?: number;
  videoUrl?: string;
  initialTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onNextEpisode?: () => void;
}

type ServerType = "native_hls" | "gogo_embed";

interface CachedEpisodeData {
  animeId: string;
  episode: number;
  data: {
    success: boolean;
    sources?: { url: string; quality: string; isM3U8: boolean }[];
    embedUrls?: { label: string; url: string; serverType: string; isDub?: boolean }[];
  };
}

interface DownloadOption {
  quality: string;
  label: string;
  size: string | null; // real size when known (Content-Length); null = unavailable
}

// Qualities are ONLY offered when the resolved stream actually provides them.
// Sizes are only shown when verified from the source response; otherwise null ("Size unavailable").
const getDownloadLabel = (quality: string): string => {
  if (quality === "1080p") return "Full HD";
  if (quality === "720p") return "HD";
  if (quality === "480p") return "SD";
  if (quality === "360p") return "Data Saver";
  return quality;
};

const EDGE_PROXY_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || "";

async function queryEdgeFlixServers(targetAniId: string, ep: number) {
  if (!EDGE_PROXY_URL) return null;
  const cleanId = String(targetAniId).replace(/^anilist-/, "").trim();
  if (!cleanId || !/^\d+$/.test(cleanId)) return null;

  try {
    const targetUrl = `https://reanime.to/api/flix/${cleanId}/${ep}`;
    const proxyUrl = `${EDGE_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && Array.isArray(json?.servers) && json.servers.length > 0) {
      return json.servers;
    }
  } catch (err) {
    console.warn("[EdgeProxy] Flix query error:", err);
  }
  return null;
}

const globalStreamCache = new Map<string, {
  success: boolean;
  provider: string;
  sources?: { url: string; quality: string; isM3U8: boolean }[];
  embedUrls: { label: string; url: string; serverType: string; isDub: boolean }[];
  dubAvailable: boolean | null;
  subAvailable: boolean | null;
  timestamp: number;
}>();

export default function VideoPlayer({
  animeId = "",
  animeTitle = "Anime Episode",
  episodeNumber = 1,
  totalEpisodes,
  nextEpisodeNumber,
  malId,
  anilistId,
  videoUrl,
  initialTime = 0,
  onProgress,
  onNextEpisode,
}: VideoPlayerProps) {
  const router = useRouter();
  const [activeServer, setActiveServer] = useState<ServerType | null>(null);
  const [isDub, setIsDub] = useState(false);
  const [dubAvailable, setDubAvailable] = useState<boolean | null>(null);
  const [subAvailable, setSubAvailable] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoNext, setAutoNext] = useState(true);
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showStatus = useCallback((text: string, type: "success" | "warning" | "error" = "success") => {
    setStatusBanner({ text, type });
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusBanner(null), 3500);
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Quality settings
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto");
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Watch History & Resume
  const [resumeNotice, setResumeNotice] = useState<{ episode: number; time: number } | null>(null);
  
  // Stream data from API
  const [streamSources, setStreamSources] = useState<{ url: string; quality: string; isM3U8: boolean }[]>([]);
  const [embedUrls, setEmbedUrls] = useState<{ label: string; url: string; serverType?: string; isDub?: boolean }[]>([]);
  const [activeEmbedIdx, setActiveEmbedIdx] = useState(0);
  const availableDownloadSources = streamSources.filter(
    (s) => s.url && (s.url.startsWith("http://") || s.url.startsWith("https://")) && !s.url.includes("placeholder") && !s.url.includes("trailer")
  );
  const hasDirectDownloads = availableDownloadSources.length > 0;
  const downloadOptions = availableDownloadSources.map((source) => ({
    quality: source.quality || "Default",
    label: getDownloadLabel(source.quality || "Default"),
    url: source.url,
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Download Quality Menu State
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setIsDownloadOpen(false);
      }
    };
    if (isDownloadOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDownloadOpen]);

  // Handle Download trigger
  const handleDownloadQuality = async (quality: string, explicitSourceUrl?: string) => {
    setIsDownloadOpen(false);
    setDownloadingQuality(quality);

    const safeTitle = (animeTitle || "Anime")
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 32);
    const fileName = `${safeTitle}_EP${episodeNumber}_${quality}_${isDub ? "DUB" : "SUB"}.mp4`;

    const directUrl = explicitSourceUrl || (availableDownloadSources.length > 0 ? availableDownloadSources[0].url : "");
    const downloadApiUrl = `/api/anime/download?title=${encodeURIComponent(cleanTitle)}&episode=${episodeNumber}&quality=${quality}&dub=${isDub}${directUrl ? `&sourceUrl=${encodeURIComponent(directUrl)}` : ""}${animeId ? `&animeId=${encodeURIComponent(animeId)}` : ""}`;

    showStatus(`📥 Starting ${quality} download for Ep ${episodeNumber}...`, "success");

    try {
      // Trigger native browser download directly via temporary anchor
      const a = document.createElement("a");
      a.href = downloadApiUrl;
      a.setAttribute("download", fileName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      showStatus(`📥 Download started: ${safeTitle} Ep ${episodeNumber} (${quality} ${isDub ? "DUB" : "SUB"})`, "success");
    } catch {
      showStatus(`⚠️ Unable to start download for Ep ${episodeNumber}.`, "warning");
    } finally {
      setDownloadingQuality(null);
    }
  };

  // Primary title slug for embedding
  const cleanTitle = animeTitle.replace(/\([^)]*\)/g, "").trim();

  // Load language preference and volume on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("preferredLanguage");
      if (savedLang === "dub") setIsDub(true);
      else if (savedLang === "sub") setIsDub(false);
    } catch {}

    try {
      const savedVol = localStorage.getItem("nextgen_player_volume");
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          setVolume(v);
          if (videoRef.current) {
            videoRef.current.volume = v;
            videoRef.current.muted = v === 0;
          }
          if (v === 0) setIsMuted(true);
        }
      }
    } catch {}

    if (typeof document !== "undefined" && "pictureInPictureEnabled" in document) {
      setIsPipSupported(Boolean(document.pictureInPictureEnabled));
    }
  }, []);

  // Close speed menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };
    if (isSpeedMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSpeedMenuOpen]);

  // Watch History: Check if previous progress exists
  useEffect(() => {
    if (!animeId || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("watchHistory");
      if (raw) {
        const history = JSON.parse(raw);
        const saved = history[animeId];
        if (saved && saved.episode === episodeNumber && saved.currentTime > 15) {
          setResumeNotice({ episode: saved.episode, time: Math.floor(saved.currentTime) });
        }
      }
    } catch {}
  }, [animeId, episodeNumber]);

  // Watch History: Auto-save progress every 15s while playing
  useEffect(() => {
    if (!isPlaying || !videoRef.current || !animeId) return;
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.currentTime > 10) {
        try {
          const raw = localStorage.getItem("watchHistory") || "{}";
          const history = JSON.parse(raw);
          history[animeId] = {
            episode: episodeNumber,
            currentTime: Math.floor(videoRef.current.currentTime),
            duration: Math.floor(videoRef.current.duration || duration),
            timestamp: Date.now(),
          };
          localStorage.setItem("watchHistory", JSON.stringify(history));
        } catch {}
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isPlaying, animeId, episodeNumber, duration]);

  // 1. Fetch real stream sources from our Next.js streaming API
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();
    const requestId = ++activeRequestIdRef.current;

    async function loadStream() {
      setIsLoadingStream(true);
      setIsBuffering(true);
      // Clear previous episode sources immediately to prevent race conditions or cross-episode leaks
      setStreamSources([]);
      setEmbedUrls([]);
      setActiveServer(null);

      // Fast in-memory cache lookup for 0ms instant switch
      const cacheKey = `${animeId || cleanTitle}_${episodeNumber}`;
      const memoryCached = globalStreamCache.get(cacheKey);
      if (memoryCached && memoryCached.success && ((memoryCached.embedUrls && memoryCached.embedUrls.length > 0) || (memoryCached.sources && memoryCached.sources.length > 0))) {
        if (!isCancelled && requestId === activeRequestIdRef.current) {
          applyStreamData(memoryCached);
          setIsLoadingStream(false);
          setIsBuffering(false);
          return;
        }
      }

      function applyStreamData(data: {
        sources?: { url: string; quality: string; isM3U8: boolean }[];
        embedUrls?: { label: string; url: string; serverType?: string; isDub?: boolean }[];
        dubAvailable?: boolean | null;
        subAvailable?: boolean | null;
      }) {
        setStreamSources(data.sources || []);
        setEmbedUrls(data.embedUrls || []);
        const hasDubServer = Boolean(data.dubAvailable && (data.embedUrls || []).some((e) => Boolean(e.isDub) === true));
        const hasSubServer = Boolean(data.subAvailable || (data.embedUrls || []).some((e) => !e.isDub));
        setDubAvailable(hasDubServer);
        setSubAvailable(hasSubServer);

        const savedPref = typeof window !== "undefined" ? localStorage.getItem("preferredLanguage") : null;
        let targetIsDub = false;
        if (savedPref === "dub") {
          if (hasDubServer) {
            targetIsDub = true;
            showStatus("🎤 Playing English Dub", "success");
          } else {
            targetIsDub = false;
            if (hasSubServer) {
              showStatus("🎬 English Dub not available. Playing Sub instead.", "warning");
            }
            try { localStorage.setItem("preferredLanguage", "sub"); } catch {}
          }
        } else if (savedPref === "sub") {
          targetIsDub = false;
          if (hasSubServer) {
            showStatus("📝 Playing Japanese with English Subtitles", "success");
          } else if (hasDubServer) {
            targetIsDub = true;
            showStatus("🎤 Sub unavailable. Playing English Dub instead.", "warning");
          }
        } else {
          targetIsDub = hasDubServer && !hasSubServer;
        }

        setIsDub(targetIsDub);

        const matchIdx = (data.embedUrls || []).findIndex((e) => Boolean(e.isDub) === targetIsDub);
        const chosenIdx = matchIdx >= 0 ? matchIdx : 0;
        setActiveEmbedIdx(chosenIdx);

        if (data.sources && data.sources.length > 0) {
          setActiveServer("native_hls");
        } else if (data.embedUrls && data.embedUrls.length > 0) {
          setActiveServer("gogo_embed");
        }
      }

      try {
        let cleanAniId = anilistId
          ? String(anilistId).replace(/^anilist-/, "").trim()
          : (animeId?.startsWith("anilist-") ? animeId.replace("anilist-", "").trim() : null);

        let resolved = false;

        // Fast-path: query edge proxy immediately if cleanAniId is available (~200ms)
        if (cleanAniId && /^\d+$/.test(cleanAniId)) {
          queryEdgeFlixServers(cleanAniId, episodeNumber).then((edgeServers) => {
            if (!isCancelled && requestId === activeRequestIdRef.current && edgeServers && edgeServers.length > 0 && !resolved) {
              resolved = true;
              const embeds = edgeServers.map((s: { serverName?: string; dataType?: string; dataLink: string }, idx: number) => {
                const isServerDub = s.dataType?.toLowerCase() === "dub";
                const finalUrl = isServerDub ? `${s.dataLink}${s.dataLink.includes("?") ? "&" : "?"}a=1` : s.dataLink;
                const serverDisplayName = s.serverName || `HD-${idx + 1}`;
                return {
                  label: `ReAnime ${serverDisplayName} (${(s.dataType || "sub").toUpperCase()})`,
                  url: finalUrl,
                  serverType: `reanime_${serverDisplayName.toLowerCase().replace(/\s+/g, "")}`,
                  isDub: isServerDub,
                };
              });

              const fastData = {
                success: true,
                provider: "ReAnime Cloud Engine (FlixCloud HD-1 & HD-2)",
                sources: [],
                embedUrls: embeds,
                dubAvailable: embeds.some((e: { isDub?: boolean }) => Boolean(e.isDub)),
                subAvailable: embeds.some((e: { isDub?: boolean }) => !e.isDub),
                timestamp: Date.now(),
              };
              globalStreamCache.set(cacheKey, fastData);
              applyStreamData(fastData);
              setIsLoadingStream(false);
              setIsBuffering(false);
            }
          }).catch(() => {});
        }

        // Concurrently query streaming API
        const res = await fetch(
          `/api/anime/stream?title=${encodeURIComponent(cleanTitle)}&episode=${episodeNumber}&dub=${isDub}&malId=${malId || ""}&animeId=${encodeURIComponent(animeId || "")}&anilistId=${anilistId || ""}`,
          { signal: controller.signal }
        ).catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("[Stream API fetch warning]:", err);
          }
          return null;
        });

        if (resolved) return; // Fast-path already handled playback start

        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.anilistId && !cleanAniId) {
            cleanAniId = String(data.anilistId).replace(/^anilist-/, "").trim();
          }
          if (data?.success && ((data.sources && data.sources.length > 0) || (data.embedUrls && data.embedUrls.length > 0))) {
            resolved = true;
            globalStreamCache.set(cacheKey, { ...data, timestamp: Date.now() });
            applyStreamData(data);
            return;
          }
        }

        // If server route had no playable streams, query edge proxy now with resolved anilistId
        if (!resolved && cleanAniId && /^\d+$/.test(cleanAniId)) {
          const edgeServers = await queryEdgeFlixServers(cleanAniId, episodeNumber);
          if (edgeServers && edgeServers.length > 0) {
            resolved = true;
            const embeds = edgeServers.map((s: { serverName?: string; dataType?: string; dataLink: string }, idx: number) => {
              const isServerDub = s.dataType?.toLowerCase() === "dub";
              const finalUrl = isServerDub ? `${s.dataLink}${s.dataLink.includes("?") ? "&" : "?"}a=1` : s.dataLink;
              const serverDisplayName = s.serverName || `HD-${idx + 1}`;
              return {
                label: `ReAnime ${serverDisplayName} (${(s.dataType || "sub").toUpperCase()})`,
                url: finalUrl,
                serverType: `reanime_${serverDisplayName.toLowerCase().replace(/\s+/g, "")}`,
                isDub: isServerDub,
              };
            });

            const finalData = {
              success: true,
              provider: "ReAnime Cloud Engine (FlixCloud HD-1 & HD-2)",
              sources: [],
              embedUrls: embeds,
              dubAvailable: embeds.some((e: { isDub?: boolean }) => Boolean(e.isDub)),
              subAvailable: embeds.some((e: { isDub?: boolean }) => !e.isDub),
              timestamp: Date.now(),
            };
            globalStreamCache.set(cacheKey, finalData);
            applyStreamData(finalData);
            return;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.warn("Failed to load anime stream:", err);
        }
      } finally {
        if (!isCancelled && requestId === activeRequestIdRef.current) {
          setIsLoadingStream(false);
          setIsBuffering(false);
        }
      }
    }

    loadStream();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [cleanTitle, episodeNumber, isDub, malId, animeId, anilistId]);

  // Smart Preload Next Episode metadata in background (loads into instant-access memory cache)
  useEffect(() => {
    if (!cleanTitle || !animeId) return;
    const nextEp = episodeNumber + 1;
    if (totalEpisodes && nextEp > totalEpisodes) return;

    const controller = new AbortController();
    const nextCacheKey = `${animeId || cleanTitle}_${nextEp}`;

    const timer = setTimeout(async () => {
      if (globalStreamCache.has(nextCacheKey)) return;
      try {
        const res = await fetch(
          `/api/anime/stream?title=${encodeURIComponent(cleanTitle)}&episode=${nextEp}&dub=${isDub}&malId=${malId || ""}&animeId=${encodeURIComponent(animeId || "")}&anilistId=${anilistId || ""}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.success && ((data.sources && data.sources.length > 0) || (data.embedUrls && data.embedUrls.length > 0))) {
            globalStreamCache.set(nextCacheKey, { ...data, timestamp: Date.now() });
          }
        }
      } catch {}
    }, 2000);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [animeId, cleanTitle, episodeNumber, isDub, malId, anilistId, totalEpisodes]);

  // 2. Initialize HLS or direct video playback with complete HLS.js configuration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (activeServer === "native_hls") {
      const sourceUrl = videoUrl || (streamSources.length > 0 ? streamSources[0].url : "");

      if (!sourceUrl) return;

      if (sourceUrl.includes(".m3u8") && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 120,
          backBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
        });

        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          if (data.levels && data.levels.length > 0) {
            const qualities = data.levels.map((lvl: { height?: number }) => `${lvl.height || 720}p`);
            setAvailableQualities(Array.from(new Set(qualities)));
          }
          video.play().catch(() => {});
          setIsPlaying(true);
          setIsBuffering(false);
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          setIsBuffering(false);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          if (hls.levels[data.level]) {
            setSelectedQuality(`${hls.levels[data.level].height}p`);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                // Auto switch to backup embed server if HLS fatally fails
                if (embedUrls.length > 0) {
                  setActiveServer("gogo_embed");
                }
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else {
        video.src = sourceUrl;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeServer, streamSources, videoUrl, embedUrls]);

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const rawDur = videoRef.current.duration;
    const dur = !isNaN(rawDur) && isFinite(rawDur) && rawDur > 0 ? rawDur : 0;
    setCurrentTime(curr);
    setDuration(dur);
    if (isBuffering && curr > 0) {
      setIsBuffering(false);
    }
    onProgress?.(curr, dur);
  };

  // Buffer safety auto-clear: never allow spinner to remain if playback is running
  useEffect(() => {
    if (isBuffering) {
      const timer = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused && videoRef.current.currentTime > 0) {
          setIsBuffering(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isBuffering]);

  // Smart Next Episode Transition (strictly to verified next released episode)
  const goToNextEpisode = useCallback(() => {
    if (onNextEpisode) {
      onNextEpisode();
    } else if (animeId && typeof nextEpisodeNumber === "number" && nextEpisodeNumber > 0) {
      router.push(`/watch/${animeId}/${nextEpisodeNumber}`);
    } else if (animeId && episodeNumber) {
      if (totalEpisodes && episodeNumber >= totalEpisodes) {
        showStatus("🎉 You are caught up to the latest released episode!", "success");
        return;
      }
      showStatus("No subsequent released episode available.", "warning");
    }
  }, [onNextEpisode, animeId, episodeNumber, nextEpisodeNumber, totalEpisodes, router, showStatus]);

  // Video ended -> trigger next episode
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoNext) {
      goToNextEpisode();
    }
  };

  // Toggle Play / Pause with Autoplay Policy check
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsAutoplayBlocked(false);
        })
        .catch((err) => {
          if (err?.name === "NotAllowedError") {
            setIsAutoplayBlocked(true);
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Seek handler
  const handleSeek = (delta: number) => {
    if (!videoRef.current) return;
    const next = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = next;
    setCurrentTime(next);
  };

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    const elem = containerRef.current as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen().catch?.(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen().catch?.(() => {});
      }
    }
  }, []);

  // Volume slider change
  const handleVolumeChange = (newVol: number) => {
    const safeVol = Math.max(0, Math.min(1, newVol));
    setVolume(safeVol);
    if (videoRef.current) {
      videoRef.current.volume = safeVol;
      videoRef.current.muted = safeVol === 0;
    }
    setIsMuted(safeVol === 0);
    try {
      localStorage.setItem("nextgen_player_volume", String(safeVol));
    } catch {}
  };

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted || volume === 0) {
      const restoreVol = volume > 0 ? volume : 0.8;
      videoRef.current.muted = false;
      videoRef.current.volume = restoreVol;
      setVolume(restoreVol);
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Playback speed selector
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setIsSpeedMenuOpen(false);
    showStatus(`⚡ Playback speed: ${speed}x`, "success");
  };

  // Picture in Picture toggle
  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      const doc = document as Document & { pictureInPictureElement?: Element; exitPictureInPicture?: () => Promise<void> };
      if (doc.pictureInPictureElement) {
        await doc.exitPictureInPicture?.();
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP error:", err);
      showStatus("Picture-in-Picture unavailable in this browser.", "warning");
    }
  };

  // Subtitle & Audio track management for HLS / Video element
  const applyAudioAndSubtitles = useCallback((dubMode: boolean) => {
    // 1. Text tracks / Subtitles
    if (videoRef.current?.textTracks) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].kind === "subtitles" || tracks[i].kind === "captions") {
          tracks[i].mode = dubMode ? "disabled" : "showing";
        }
      }
    }

    // 2. HLS Audio tracks
    if (hlsRef.current && hlsRef.current.audioTracks) {
      const audioTracks = hlsRef.current.audioTracks;
      if (audioTracks.length > 1) {
        if (dubMode) {
          const enIdx = audioTracks.findIndex((t) =>
            t.lang?.toLowerCase().includes("en") ||
            t.name?.toLowerCase().includes("dub") ||
            t.name?.toLowerCase().includes("english")
          );
          if (enIdx >= 0) hlsRef.current.audioTrack = enIdx;
        } else {
          const jaIdx = audioTracks.findIndex((t) =>
            t.lang?.toLowerCase().includes("ja") ||
            t.name?.toLowerCase().includes("jap") ||
            t.name?.toLowerCase().includes("orig")
          );
          if (jaIdx >= 0) hlsRef.current.audioTrack = jaIdx;
        }
      }
    }
  }, []);

  const hasDub = typeof dubAvailable === "boolean" ? dubAvailable : embedUrls.some((e) => e.isDub === true) || null;
  const hasSub = typeof subAvailable === "boolean" ? subAvailable : embedUrls.some((e) => e.isDub === false) || null;

  // Language switch handler with full status banner feedback & subtitle sync
  const switchLanguage = useCallback((targetLang: "dub" | "sub") => {
    if (isLoadingStream) return;

    if (targetLang === "dub") {
      if (!hasDub) {
        showStatus(hasDub === null ? "🎤 English Dub availability not verified for this anime." : "🎬 English Dub not available for this anime.", "warning");
        if (hasSub) {
          setIsDub(false);
          try { localStorage.setItem("preferredLanguage", "sub"); } catch {}
        }
        return;
      }

      setIsDub(true);
      try { localStorage.setItem("preferredLanguage", "dub"); } catch {}
      showStatus("🎤 Playing English Dub", "success");

      const dubIdx = embedUrls.findIndex((e) => e.isDub === true);
      if (dubIdx >= 0) {
        setActiveEmbedIdx(dubIdx);
        setActiveServer("gogo_embed");
      }
      applyAudioAndSubtitles(true);
    } else {
      if (!hasSub) {
        showStatus("📝 Subtitles not available for this episode.", "warning");
        return;
      }

      setIsDub(false);
      try { localStorage.setItem("preferredLanguage", "sub"); } catch {}
      showStatus("📝 Playing Japanese with English Subtitles", "success");

      const subIdx = embedUrls.findIndex((e) => !e.isDub);
      if (subIdx >= 0) {
        setActiveEmbedIdx(subIdx);
        setActiveServer("gogo_embed");
      }
      applyAudioAndSubtitles(false);
    }
  }, [hasDub, hasSub, isLoadingStream, embedUrls, applyAudioAndSubtitles, showStatus]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(10);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-10);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        switchLanguage("dub");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        switchLanguage("sub");
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePictureInPicture();
      } else if (e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        goToNextEpisode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, goToNextEpisode, duration, isPlaying, switchLanguage, togglePictureInPicture]);

  // Format time mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const preferredEmbeds = embedUrls.filter((embed) => (isDub ? embed.isDub === true : !embed.isDub));
  const filteredEmbeds = preferredEmbeds.length > 0 ? preferredEmbeds : embedUrls;

  return (
    <div className={styles.wrapper}>
      {/* Top Stream Control Bar */}
      <div className={styles.serverBar}>
        <div className={styles.serverGroup}>
          <span className={styles.serverLabel}>
            <Server size={14} /> Server:
          </span>

          {/* Real Working ReAnime Embed Servers (filtered strictly by active Sub/Dub) */}
          {filteredEmbeds.map((embed) => {
            const originalIdx = embedUrls.indexOf(embed);
            return (
              <button
                key={originalIdx}
                onClick={() => {
                  setActiveServer("gogo_embed");
                  setActiveEmbedIdx(originalIdx);
                }}
                className={`${styles.serverPill} ${activeServer === "gogo_embed" && activeEmbedIdx === originalIdx ? styles.serverPillActive : ""}`}
                title={embed.label}
              >
                {embed.label}
              </button>
            );
          })}

          {/* Direct HLS Player (Shown if available or requested) */}
          {streamSources.length > 0 && (
            <button
              onClick={() => setActiveServer("native_hls")}
              className={`${styles.serverPill} ${activeServer === "native_hls" ? styles.serverPillActive : ""}`}
              title="Native HLS stream"
            >
              <Sparkles size={12} style={{ marginRight: "4px" }} />
              Direct HLS
            </button>
          )}

          {/* No sources fallback */}
          {!isLoadingStream && filteredEmbeds.length === 0 && streamSources.length === 0 && (
            <span className={styles.noServers}>No servers found</span>
          )}
        </div>

        {/* Audio (Sub / Dub) & Controls */}
        <div className={styles.controlsRight}>
          {/* Modern Segmented Audio Language Capsule (SUB / DUB) */}
          <div className={styles.audioSegmentWrap} role="radiogroup" aria-label="Audio language selection">
            <button
              id="sub-btn"
              type="button"
              onClick={() => switchLanguage("sub")}
              disabled={!hasSub}
              className={`${styles.audioSegmentBtn} ${!isDub ? styles.audioSegmentActive : ""} ${!hasSub ? styles.audioSegmentDisabled : ""}`}
              title={hasSub ? "Play Japanese with English Subtitles" : "Subtitles unavailable"}
              aria-checked={!isDub}
              role="radio"
            >
              <Subtitles size={13} className={styles.audioIcon} />
              <span>SUB</span>
            </button>

            <button
              id="dub-btn"
              type="button"
              onClick={() => switchLanguage("dub")}
              disabled={!hasDub}
              className={`${styles.audioSegmentBtn} ${isDub ? styles.audioSegmentActive : ""} ${!hasDub ? styles.audioSegmentDisabled : ""}`}
              title={hasDub === null ? "DUB availability not verified" : hasDub ? "Play English Dub" : "English Dub unavailable for this anime"}
              aria-checked={isDub}
              role="radio"
            >
              <Headphones size={13} className={styles.audioIcon} />
              <span>DUB</span>
              {hasDub === null && <span className={styles.dubDot} title="DUB availability not verified" />}
              {hasDub === true && <span className={styles.dubDot} title="English Dub Available" />}
            </button>
          </div>

          {/* Real Download Button — Always Visible in Control Bar */}
          {hasDirectDownloads ? (
            <div className={styles.downloadWrapper} ref={downloadMenuRef}>
              <button
                id="download-btn"
                type="button"
                onClick={() => setIsDownloadOpen((prev) => !prev)}
                className={`${styles.downloadBtn} ${isDownloadOpen ? styles.downloadBtnActive : ""}`}
                title="Download Episode"
                aria-label="Download Episode with quality selection"
                aria-haspopup="true"
                aria-expanded={isDownloadOpen}
                disabled={Boolean(downloadingQuality)}
              >
                {downloadingQuality ? (
                  <>
                    <span className={styles.downloadSpinner} />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download size={13} className={styles.downloadIcon} />
                    <span>Download</span>
                    <ChevronDown size={11} className={`${styles.downloadChevron} ${isDownloadOpen ? styles.chevronRotated : ""}`} />
                  </>
                )}
              </button>

              {/* Quality Selection Popover Menu */}
              {isDownloadOpen && (
                <div className={styles.qualityDropdown} role="menu" aria-label="Select download quality">
                  <div className={styles.qualityHeader}>
                    <div className={styles.qualityTitleWrap}>
                      <Download size={13} className={styles.qualityHeaderIcon} />
                      <span className={styles.qualityHeaderTitle}>Download Ep {episodeNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDownloadOpen(false)}
                      className={styles.qualityCloseBtn}
                      aria-label="Close download menu"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div className={styles.qualityList}>
                    {downloadOptions.map((opt) => (
                      <button
                        key={opt.quality}
                        type="button"
                        onClick={() => handleDownloadQuality(opt.quality, opt.url)}
                        className={styles.qualityOption}
                        role="menuitem"
                        disabled={Boolean(downloadingQuality)}
                      >
                        <span className={styles.qualityBadge}>{opt.quality}</span>
                        <div className={styles.qualityMeta}>
                          <span className={styles.qualityLabel}>{opt.label}</span>
                          <span className={styles.qualitySize}>{opt.url.endsWith(".m3u8") ? "HLS Stream" : "Direct Stream"}</span>
                        </div>
                        {downloadingQuality === opt.quality ? (
                          <span className={styles.downloadSpinner} />
                        ) : (
                          <Download size={12} className={styles.qualityDownloadIcon} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="download-btn"
              type="button"
              className={`${styles.downloadBtn} ${styles.downloadBtnDisabled}`}
              title="Download unavailable for this stream source"
              disabled
              aria-disabled="true"
            >
              <Download size={13} className={styles.downloadIcon} />
              <span>Download unavailable</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className={styles.fullscreenTopBtn}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>
      </div>

      {/* Main Video Screen Container */}
      <div className={styles.playerContainer} ref={containerRef}>
        {/* Language Status Message */}
        {statusBanner && (
          <div
            id="language-status"
            className={`${styles.statusMessage} ${
              statusBanner.type === "success"
                ? styles.statusSuccess
                : statusBanner.type === "warning"
                ? styles.statusWarning
                : styles.statusError
            }`}
          >
            <span>{statusBanner.text}</span>
          </div>
        )}

        {/* Fullscreen Top Header with Back / Exit Fullscreen */}
        {isFullscreen && (
          <div className={styles.fullscreenTopBar}>
            <button
              onClick={toggleFullscreen}
              className={styles.fullscreenBackBtn}
              aria-label="Exit Fullscreen"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize size={18} />
              <span>Exit Fullscreen</span>
            </button>
            <div className={styles.fullscreenTitle}>
              <span>{animeTitle}</span>
              <span className={styles.fullscreenEpDot}>•</span>
              <span>Episode {episodeNumber}</span>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className={styles.toastBanner}>
            <AlertCircle size={15} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Resume Previous Watch Session Banner */}
        {resumeNotice && (
          <div className={styles.resumeBanner}>
            <span>
              Resume Episode {resumeNotice.episode} from <strong>{formatTime(resumeNotice.time)}</strong>?
            </span>
            <div className={styles.resumeButtons}>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = resumeNotice.time;
                    videoRef.current.play().catch(() => {});
                  }
                  setResumeNotice(null);
                }}
                className={styles.resumeConfirmBtn}
              >
                Resume
              </button>
              <button
                onClick={() => setResumeNotice(null)}
                className={styles.resumeDismissBtn}
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay with Spinner — only for native HLS, not embed */}
        {isBuffering && activeServer === "native_hls" && streamSources.length > 0 && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>
              Loading stream... <span className={styles.loadingQualityBadge}>{selectedQuality}</span>
            </p>
          </div>
        )}
        {/* Slim loading bar for embed fetch */}
        {isLoadingStream && activeServer !== "native_hls" && embedUrls.length === 0 && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Finding stream sources...</p>
          </div>
        )}

        {activeServer === "native_hls" && streamSources.length > 0 ? (
          <div className={styles.videoWrapper} onClick={togglePlay}>
            <video
              ref={videoRef}
              className={styles.videoFrame}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
              onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onCanPlayThrough={() => setIsBuffering(false)}
              onLoadedData={() => setIsBuffering(false)}
              onLoadStart={() => setIsBuffering(true)}
              playsInline
            />

              {/* Center Play Overlay when paused */}
            {!isPlaying && (
              <div className={styles.centerPlayOverlay}>
                <div className={styles.playIconPulse}>
                  <Play size={36} fill="#fff" />
                </div>
              </div>
            )}
          </div>
        ) : activeServer === "gogo_embed" && (embedUrls[activeEmbedIdx] || embedUrls[0]) ? (
          (() => {
            const currentEmbed = embedUrls[activeEmbedIdx] || embedUrls[0];
            return (
              <iframe
                key={`${currentEmbed.url}-${isDub}`}
                src={currentEmbed.url}
                title={`${animeTitle} - Episode ${episodeNumber} - ${currentEmbed.label}`}
                className={styles.videoFrame}
                referrerPolicy="origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                loading="eager"
              />
            );
          })()
        ) : (
          <>
            {/* No verified source: honest empty state, no fake play button */}
            {!isLoadingStream && filteredEmbeds.length === 0 && streamSources.length === 0 && (
              <div className={styles.placeholderFrame}>
                <div className={styles.notice}>
                  <h3>Streaming unavailable</h3>
                  <p>No verified stream source was found for this episode. Please try again later.</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Autoplay Blocked Notification Overlay */}
        {isAutoplayBlocked && (
          <div className={styles.autoplayBlockedOverlay}>
            <div className={styles.autoplayBlockedCard}>
              <Play size={32} className={styles.autoplayBlockedIcon} />
              <h3>Autoplay Blocked by Browser</h3>
              <p>Your browser requires interaction before media playback can start for Episode {episodeNumber}.</p>
              <button
                type="button"
                onClick={() => {
                  setIsAutoplayBlocked(false);
                  if (videoRef.current) {
                    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  }
                }}
                className={styles.autoplayResumeBtn}
              >
                <Play size={16} fill="#fff" />
                Play Episode {episodeNumber}
              </button>
            </div>
          </div>
        )}

        {/* Floating Quick Fullscreen Button */}
        <button 
          onClick={toggleFullscreen} 
          className={styles.floatingFullscreenBtn}
          title="Toggle Fullscreen Mode (F)"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {/* In-Player Scrubber & Controls Bar (native playback only) */}
      {activeServer === "native_hls" && (
        <div className={styles.playerControlsBar}>
          <button onClick={togglePlay} className={styles.playBtn} title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
            {isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
          </button>

          {/* Time Scrubber */}
          <div className={styles.scrubberContainer}>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = val;
                setCurrentTime(val);
              }}
              className={styles.scrubberInput}
              aria-label="Playback scrubber"
            />
            <div 
              className={styles.scrubberProgress} 
              style={{ width: `${duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%` }} 
            />
          </div>

          <div className={styles.timeDisplay}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume Control with Range Slider */}
          <div className={styles.volumeWrapper}>
            <button onClick={toggleMute} className={styles.volumeBtn} title={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}>
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className={styles.volumeSlider}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              aria-label="Volume level"
            />
          </div>

          {/* Playback Speed Selector */}
          <div className={styles.speedWrapper} ref={speedMenuRef}>
            <button
              onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
              className={styles.controlBtn}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              title="Playback Speed"
            >
              <Gauge size={14} />
              <span className={styles.qualityLabel}>{playbackSpeed}x</span>
            </button>
            {isSpeedMenuOpen && (
              <div className={styles.speedMenu}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`${styles.speedOption} ${playbackSpeed === s ? styles.speedOptionActive : ""}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Selector */}
          {availableQualities.length > 0 && (
            <div className={styles.qualityWrapper}>
              <button
                onClick={() => setIsQualityMenuOpen(!isQualityMenuOpen)}
                className={styles.controlBtn}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                title="Video Quality"
              >
                <Settings size={14} />
                <span className={styles.qualityLabel}>{selectedQuality}</span>
              </button>
              {isQualityMenuOpen && (
                <div className={styles.qualityMenu}>
                  <button
                    onClick={() => {
                      if (hlsRef.current) hlsRef.current.currentLevel = -1;
                      setSelectedQuality("Auto");
                      setIsQualityMenuOpen(false);
                    }}
                    className={`${styles.qualityOption} ${selectedQuality === "Auto" ? styles.qualityOptionActive : ""}`}
                  >
                    Auto (Adaptive)
                  </button>
                  {availableQualities.map((q, i) => (
                    <button
                      key={q}
                      onClick={() => {
                        if (hlsRef.current) hlsRef.current.currentLevel = i;
                        setSelectedQuality(q);
                        setIsQualityMenuOpen(false);
                      }}
                      className={`${styles.qualityOption} ${selectedQuality === q ? styles.qualityOptionActive : ""}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Picture in Picture */}
          {isPipSupported && (
            <button onClick={togglePictureInPicture} className={styles.pipBtn} title="Picture in Picture (P)">
              <PictureInPicture2 size={16} />
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className={styles.fsBtn} title="Fullscreen (F)">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className={styles.actionControls}>
        <div className={styles.quickSeekGroup}>
          <button 
            onClick={() => handleSeek(-10)} 
            className={styles.controlBtn} 
            title="Replay 10 Seconds (Left Arrow)"
          >
            <RotateCcw size={13} /> -10s
          </button>
          <button 
            onClick={() => handleSeek(10)} 
            className={styles.controlBtn} 
            title="Skip 10 Seconds (Right Arrow)"
          >
            <RotateCw size={13} /> +10s
          </button>
          <button 
            onClick={() => setAutoNext(!autoNext)} 
            className={`${styles.controlBtn} ${autoNext ? styles.controlBtnActive : ""}`}
            title="Automatically transition to the next released episode when finished"
          >
            Auto-Next: {autoNext ? "ON" : "OFF"}
          </button>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.hotkeysHelp}>
            <span className={styles.kbd}>Space</span> Play • 
            <span className={styles.kbd}>F</span> Full • 
            <span className={styles.kbd}>P</span> PiP • 
            <span className={styles.kbd}>M</span> Mute • 
            <span className={styles.kbd}>← / →</span> ±10s
          </div>

          <button 
            onClick={toggleFullscreen} 
            className={`${styles.controlBtn} ${styles.primaryFullscreenBtn}`} 
            title="Expand Video to Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>
        </div>
      </div>

      {/* Troubleshooting Server Banner */}
      <div className={styles.troubleshootBanner}>
        <AlertCircle size={14} className={styles.troubleshootIcon} />
        <span>
          {activeServer === "native_hls" && streamSources.length > 0
            ? <>Streaming via <strong>Native HLS Player</strong> ({streamSources[0]?.quality || "auto"}). Highest quality.</>
            : activeServer === "gogo_embed" && embedUrls[activeEmbedIdx]
            ? <>Loaded <strong>{embedUrls[activeEmbedIdx].label}</strong> (Powered by ReAnime.to streaming engine).</>
            : <>Select a ReAnime streaming server above to watch this episode.</>
          }
        </span>
      </div>
    </div>
  );
}
