"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import styles from "./AuthModal.module.css";

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (tab === "signin") {
      const res = await signInWithEmail(email, password);
      if (res.error) {
        setError(res.error);
      }
    } else {
      if (!username.trim()) {
        setError("Username is required");
        setLoading(false);
        return;
      }
      const res = await signUpWithEmail(email, password, username);
      if (res.error) {
        setError(res.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className={styles.overlay} onClick={closeAuthModal}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${tab === "signin" ? styles.activeTab : ""}`}
              onClick={() => {
                setTab("signin");
                setError(null);
              }}
            >
              Sign In
            </button>
            <button
              className={`${styles.tabBtn} ${tab === "signup" ? styles.activeTab : ""}`}
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
            >
              Create Account
            </button>
          </div>
          <button className={styles.closeBtn} onClick={closeAuthModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {tab === "signup" && (
            <div className={styles.inputGroup}>
              <label htmlFor="auth-username" className={styles.label}>Username</label>
              <div className={styles.inputWrapper}>
                <UserIcon size={18} className={styles.inputIcon} />
                <input
                  id="auth-username"
                  type="text"
                  required
                  className={styles.input}
                  placeholder="anime_fan_99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="auth-email" className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="auth-email"
                type="email"
                required
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="auth-password" className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? <Loader2 size={18} className={styles.spinner} /> : (tab === "signin" ? "Sign In" : "Create Account")}
          </button>

          <p className={styles.subtext}>
            {tab === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className={styles.switchBtn}
                  onClick={() => {
                    setTab("signup");
                    setError(null);
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className={styles.switchBtn}
                  onClick={() => {
                    setTab("signin");
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
