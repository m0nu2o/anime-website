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
  Sparkles
} from "lucide-react";
import styles from "./VideoPlayer.module.css";

interface VideoPlayerProps {
  animeId?: string;
  animeTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
  malId?: number;
  anilistId?: number;
  youtubeVideoId?: string;
  videoUrl?: string;
  initialTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onNextEpisode?: () => void;
}

type ServerType = "native_hls" | "gogo_embed" | "streamwish" | "trailer" | "demo_mp4";

export default function VideoPlayer({
  animeId = "",
  animeTitle = "Anime Episode",
  episodeNumber = 1,
  totalEpisodes,
  malId,
  anilistId,
  youtubeVideoId,
  videoUrl,
  initialTime = 0,
  onProgress,
  onNextEpisode,
}: VideoPlayerProps) {
  const router = useRouter();
  const [activeServer, setActiveServer] = useState<ServerType>("native_hls");
  const [isDub, setIsDub] = useState(false);
  const [dubAvailable, setDubAvailable] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoNext, setAutoNext] = useState(true);
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(1440);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Quality settings
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto");
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);

  // Watch History & Resume
  const [resumeNotice, setResumeNotice] = useState<{ episode: number; time: number } | null>(null);
  
  // Stream data from API
  const [streamSources, setStreamSources] = useState<any[]>([]);
  const [embedUrls, setEmbedUrls] = useState<{ label: string; url: string; isDub?: boolean }[]>([]);
  const [activeEmbedIdx, setActiveEmbedIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Primary title slug for embedding
  const cleanTitle = animeTitle.replace(/\([^)]*\)/g, "").trim();

  // Load language preference on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("preferredLanguage");
      if (savedLang === "dub") setIsDub(true);
      else if (savedLang === "sub") setIsDub(false);
    } catch {}
  }, []);

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
    async function loadStream() {
      setIsLoadingStream(true);
      setIsBuffering(true);

      // Check preloaded cache first for instant switch
      if (typeof window !== "undefined" && (window as any).__nextEpisodeCache) {
        const cached = (window as any).__nextEpisodeCache;
        if (cached.animeId === animeId && cached.episode === episodeNumber && cached.data?.success) {
          setStreamSources(cached.data.sources || []);
          setEmbedUrls(cached.data.embedUrls || []);
          setActiveEmbedIdx(0);
          if (cached.data.sources && cached.data.sources.length > 0) {
            setActiveServer("native_hls");
          } else if (cached.data.embedUrls?.length > 0) {
            setActiveServer("gogo_embed");
          }
          setIsLoadingStream(false);
          setIsBuffering(false);
          return;
        }
      }

      try {
        const res = await fetch(
          `/api/anime/stream?title=${encodeURIComponent(cleanTitle)}&episode=${episodeNumber}&dub=${isDub}&malId=${malId || ""}&animeId=${encodeURIComponent(animeId || "")}&anilistId=${anilistId || ""}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.success) {
            setStreamSources(data.sources || []);
            setEmbedUrls(data.embedUrls || []);
            setDubAvailable(Boolean(data.dubAvailable));

            let currentDub = isDub;
            if (isDub && !data.dubAvailable) {
              setIsDub(false);
              currentDub = false;
              showToast("Dub not available for this anime. Switching to Sub.");
              try { localStorage.setItem("preferredLanguage", "sub"); } catch {}
            }

            // Find first matching embed for currentDub preference
            const matchIdx = (data.embedUrls || []).findIndex((e: any) => Boolean(e.isDub) === currentDub);
            setActiveEmbedIdx(matchIdx >= 0 ? matchIdx : 0);

            if (data.sources && data.sources.length > 0) {
              setActiveServer("native_hls");
            } else if (data.embedUrls?.length > 0) {
              setActiveServer("gogo_embed");
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load anime stream:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingStream(false);
          setIsBuffering(false);
        }
      }
    }

    loadStream();
    return () => {
      isCancelled = true;
    };
  }, [cleanTitle, episodeNumber, isDub, malId, animeId, anilistId, youtubeVideoId]);

  // Smart Preload Next Episode in background
  useEffect(() => {
    if (!animeId || !cleanTitle) return;
    const nextEp = episodeNumber + 1;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/anime/stream?title=${encodeURIComponent(cleanTitle)}&episode=${nextEp}&dub=${isDub}&malId=${malId || ""}&animeId=${encodeURIComponent(animeId || "")}&anilistId=${anilistId || ""}`
        );
        if (res.ok) {
          const data = await res.json();
          if (typeof window !== "undefined") {
            (window as any).__nextEpisodeCache = {
              animeId,
              episode: nextEp,
              data,
            };
          }
        }
      } catch {}
    }, 4000);
    return () => clearTimeout(timer);
  }, [animeId, cleanTitle, episodeNumber, isDub, malId, anilistId]);

  // 2. Initialize HLS or direct video playback with complete HLS.js configuration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (activeServer === "native_hls" || activeServer === "demo_mp4") {
      const sourceUrl = videoUrl || (streamSources.length > 0 ? streamSources[0].url : "");

      if (!sourceUrl) return;

      if (sourceUrl.includes(".m3u8") && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          if (data.levels && data.levels.length > 0) {
            const qualities = data.levels.map((lvl: any) => `${lvl.height || 720}p`);
            setAvailableQualities(Array.from(new Set(qualities)));
          }
          video.play().catch(() => {});
          setIsPlaying(true);
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
    const dur = videoRef.current.duration || 1440;
    setCurrentTime(curr);
    setDuration(dur);
    onProgress?.(curr, dur);
  };

  // Smart Next Episode Transition
  const goToNextEpisode = useCallback(() => {
    if (onNextEpisode) {
      onNextEpisode();
    } else if (animeId && episodeNumber) {
      if (totalEpisodes && episodeNumber >= totalEpisodes) {
        return;
      }
      router.push(`/watch/${animeId}/${episodeNumber + 1}`);
    }
  }, [onNextEpisode, animeId, episodeNumber, totalEpisodes, router]);

  // Video ended -> trigger next episode
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoNext) {
      goToNextEpisode();
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
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
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }, []);

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

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
      } else if (e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        goToNextEpisode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, goToNextEpisode, duration, isPlaying]);

  // Language switch handler with auto-fallback notification
  const handleSwitchLanguage = (toDub: boolean) => {
    if (toDub) {
      const hasDubServer = dubAvailable ?? embedUrls.some((e: any) => e.isDub === true);
      if (!hasDubServer) {
        showToast("Dub not available for this anime. Switching to Sub.");
        setIsDub(false);
        try { localStorage.setItem("preferredLanguage", "sub"); } catch {}
        return;
      }
      setIsDub(true);
      try { localStorage.setItem("preferredLanguage", "dub"); } catch {}
      const dubIdx = embedUrls.findIndex((e: any) => e.isDub === true);
      if (dubIdx >= 0) setActiveEmbedIdx(dubIdx);
    } else {
      setIsDub(false);
      try { localStorage.setItem("preferredLanguage", "sub"); } catch {}
      const subIdx = embedUrls.findIndex((e: any) => !e.isDub);
      if (subIdx >= 0) setActiveEmbedIdx(subIdx);
    }
  };

  // Format time mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className={styles.wrapper}>
      {/* Top Stream Control Bar */}
      <div className={styles.serverBar}>
        <div className={styles.serverGroup}>
          <span className={styles.serverLabel}>
            <Server size={14} /> Server:
          </span>

          {/* Real Working ReAnime Embed Servers (filtered strictly by active Sub/Dub) */}
          {embedUrls
            .filter((embed: any) => (isDub ? embed.isDub === true : !embed.isDub))
            .map((embed: any) => {
              const originalIdx = embedUrls.indexOf(embed);
              return (
                <button
                  key={originalIdx}
                  onClick={() => { setActiveServer("gogo_embed"); setActiveEmbedIdx(originalIdx); }}
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
        </div>

        {/* Audio (Sub / Dub) & Controls */}
        <div className={styles.controlsRight}>
          <div className={styles.audioGroup}>
            <button
              onClick={() => handleSwitchLanguage(false)}
              className={`${styles.audioBtn} ${!isDub ? styles.audioBtnActive : ""}`}
              title="Japanese Audio with English Subtitles"
            >
              SUB
            </button>
            <button
              onClick={() => handleSwitchLanguage(true)}
              className={`${styles.audioBtn} ${isDub ? styles.audioBtnActive : ""}`}
              title="English Dubbed Audio"
            >
              DUB
            </button>
          </div>

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
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
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
        ) : activeServer === "gogo_embed" && embedUrls[activeEmbedIdx] ? (
          <iframe
            key={`${embedUrls[activeEmbedIdx].url}-${isDub}`}
            src={embedUrls[activeEmbedIdx].url}
            title={`${animeTitle} - Episode ${episodeNumber} - ${embedUrls[activeEmbedIdx].label}`}
            className={styles.videoFrame}
            referrerPolicy="no-referrer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="eager"
          />
        ) : (
          <div className={styles.placeholderFrame}>
            <div className={styles.notice}>
              <h3>Select Streaming Server</h3>
              <p>Click any server button above or switch to Official PV to begin playback.</p>
              {embedUrls.length > 0 && (
                <button
                  onClick={() => { setActiveServer("gogo_embed"); setActiveEmbedIdx(0); }}
                  style={{
                    marginTop: "14px",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.9rem"
                  }}
                >
                  ▶ Watch on ReAnime Server HD-1
                </button>
              )}
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

      {/* In-Player Scrubber & Controls Bar */}
      {(activeServer === "native_hls" || activeServer === "demo_mp4") && (
        <div className={styles.playerControlsBar}>
          <button onClick={togglePlay} className={styles.playBtn} title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
            {isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
          </button>

          {/* Time Scrubber */}
          <div className={styles.scrubberContainer}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = val;
                setCurrentTime(val);
              }}
              className={styles.scrubberInput}
            />
            <div 
              className={styles.scrubberProgress} 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
            />
          </div>

          <div className={styles.timeDisplay}>
            {formatTime(currentTime)} / {formatTime(duration)}
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

          <button onClick={toggleMute} className={styles.volumeBtn} title={isMuted ? "Unmute (M)" : "Mute (M)"}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

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
            onClick={() => handleSeek(90)} 
            className={styles.controlBtn} 
            title="Skip Opening Theme (Standard 90 seconds)"
          >
            Skip OP (90s)
          </button>
          <button 
            onClick={() => {
              if (autoNext) goToNextEpisode();
              else handleSeek(90);
            }} 
            className={styles.controlBtn} 
            title="Skip Ending Theme & Credits (90 seconds)"
          >
            Skip ED (90s)
          </button>
          <button 
            onClick={() => setAutoNext(!autoNext)} 
            className={`${styles.controlBtn} ${autoNext ? styles.controlBtnActive : ""}`}
            title="Automatically transition to the next episode when finished"
          >
            Auto-Next: {autoNext ? "ON" : "OFF"}
          </button>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.hotkeysHelp}>
            <span className={styles.kbd}>Space</span> Play • 
            <span className={styles.kbd}>F</span> Fullscreen • 
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
            : activeServer === "trailer"
            ? <>Playing <strong>Official Studio Trailer</strong>. Switch to ReAnime HD-1 or HD-2 above for full episodes.</>
            : activeServer === "gogo_embed" && embedUrls[activeEmbedIdx]
            ? <>Loaded <strong>{embedUrls[activeEmbedIdx].label}</strong> (Powered by ReAnime.to streaming engine).</>
            : <>Select a ReAnime streaming server above to watch this episode.</>
          }
        </span>
      </div>
    </div>
  );
}
