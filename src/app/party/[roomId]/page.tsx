"use client";

import React, { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/lib/supabase/AuthContext";
import { Users, Send, Share2, Check, MessageCircle } from "lucide-react";
import styles from "./page.module.css";

interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  text: string;
  timestamp: string;
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
  return (initials || "U").toUpperCase();
}

function WatchPartyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const rawRoomId = Array.isArray(params?.roomId) ? params.roomId[0] : params?.roomId;
  const roomId = rawRoomId?.trim();
  const title = searchParams.get("title")?.trim();
  const epParam = searchParams.get("ep")?.trim();
  const animeId = searchParams.get("anime")?.trim();
  const epNumber = epParam ? Number(epParam) : NaN;
  const isValid = Boolean(roomId && title && animeId && Number.isInteger(epNumber) && epNumber > 0);

  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isValid
      ? [
          {
            id: "1",
            sender: "System",
            text: `Welcome to Watch Party room ${roomId}. Share the room link to watch together with friends.`,
            timestamp: "Just now",
          },
        ]
      : []
  );
  const [inputText, setInputText] = useState("");

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !isValid) return;

    const senderName = profile?.username || user?.email?.split("@")[0] || "Guest";
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: senderName,
      avatar: profile?.avatar_url || undefined,
      text: inputText.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  if (!isValid) {
    return (
      <>
        <Navbar />
        <div className={styles.partyContainer}>
          <BackButton label="Back to Home" fallbackUrl="/" />
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <span className={styles.liveBadge}>
                <span className={styles.pulseDot} /> WATCH PARTY LIVE
              </span>
              <h1 className={styles.roomTitle}>Watch Party Unavailable</h1>
            </div>
          </div>
          <div
            style={{
              marginTop: "24px",
              padding: "24px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6 }}>
              Watch party details are missing. A valid room link must include <strong>title</strong>, <strong>ep</strong>, and <strong>anime</strong> query parameters.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.partyContainer}>
        <BackButton label="Back to Episode" fallbackUrl={`/watch/${animeId}/${epNumber}`} />
        {/* Top Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.liveBadge}>
              <span className={styles.pulseDot} /> WATCH PARTY LIVE
            </span>
            <h1 className={styles.roomTitle}>
              {title} — Episode {epNumber} (Room #{roomId})
            </h1>
          </div>

          <button onClick={handleCopyLink} className={styles.shareBtn}>
            {copied ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
            <span>{copied ? "Room Link Copied!" : "Invite Friends"}</span>
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className={styles.grid}>
          {/* Main Video Stream */}
          <div className={styles.videoCol}>
            <VideoPlayer
              animeId={animeId}
              animeTitle={title}
              episodeNumber={epNumber}
            />
          </div>

          {/* Realtime Chat Panel */}
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div className={styles.chatTitle}>
                <MessageCircle size={16} color="var(--accent)" />
                <span>Room Discussion</span>
              </div>
              <span className={styles.userCount}>
                <Users size={12} style={{ display: "inline", marginRight: "4px" }} />
                Synced
              </span>
            </div>

            <div className={styles.messagesList}>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.messageItem}>
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.sender} className={styles.msgAvatar} />
                  ) : (
                    <div className={styles.msgAvatar} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "0.8rem" }}>
                      {getInitials(msg.sender)}
                    </div>
                  )}
                  <div className={styles.msgBody}>
                    <div className={styles.msgAuthor}>{msg.sender}</div>
                    <div className={styles.msgText}>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className={styles.chatInputWrapper}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Chat with watch party..."
                className={styles.chatInput}
                maxLength={200}
              />
              <button type="submit" className={styles.chatSendBtn}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function WatchPartyFallback() {
  return (
    <>
      <Navbar />
      <div className={styles.partyContainer}>
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading watch party...
        </div>
      </div>
    </>
  );
}

export default function WatchPartyRoom() {
  return (
    <Suspense fallback={<WatchPartyFallback />}>
      <WatchPartyContent />
    </Suspense>
  );
}
