"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/lib/supabase/AuthContext";
import { 
  Users, 
  Send, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Sparkles 
} from "lucide-react";
import styles from "./page.module.css";

interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  text: string;
  timestamp: string;
}

export default function WatchPartyRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const roomId = (params?.roomId as string) || "anime-room-1";
  const animeTitle = searchParams.get("title") || "Attack on Titan";
  const epNumber = parseInt(searchParams.get("ep") || "1", 10);
  const animeId = searchParams.get("anime") || "kitsu-7442";

  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "System",
      text: `Welcome to Watch Party room ${roomId}! Synchronized playback active.`,
      timestamp: "Just now",
    },
    {
      id: "2",
      sender: "Eren",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      text: "Hyped for this episode! That opening animation is incredible.",
      timestamp: "1m ago",
    },
  ]);
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
    if (!inputText.trim()) return;

    const senderName = profile?.username || user?.email?.split("@")[0] || "Anime Otaku";
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: senderName,
      avatar: profile?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      text: inputText.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

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
              {animeTitle} — Episode {epNumber} (Room #{roomId})
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
              animeTitle={animeTitle}
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
                  <img
                    src={msg.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                    alt={msg.sender}
                    className={styles.msgAvatar}
                  />
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
