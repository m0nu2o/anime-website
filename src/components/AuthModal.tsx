"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import styles from "./AuthModal.module.css";

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (tab === "signin") {
      const res = await signInWithEmail(email, password);
      if (res.error) {
        setError(res.error);
      }
    } else if (tab === "signup") {
      if (!username.trim()) {
        setError("Username is required");
        setLoading(false);
        return;
      }
      const res = await signUpWithEmail(email, password, username);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage("Account created successfully!");
      }
    } else if (tab === "forgot") {
      if (!email.trim()) {
        setError("Email is required");
        setLoading(false);
        return;
      }
      const res = await resetPassword(email);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage("Password reset instructions sent! Please check your email inbox.");
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
                setSuccessMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              className={`${styles.tabBtn} ${tab === "signup" ? styles.activeTab : ""}`}
              onClick={() => {
                setTab("signup");
                setError(null);
                setSuccessMessage(null);
              }}
            >
              Create Account
            </button>
            <button
              className={`${styles.tabBtn} ${tab === "forgot" ? styles.activeTab : ""}`}
              onClick={() => {
                setTab("forgot");
                setError(null);
                setSuccessMessage(null);
              }}
            >
              Reset
            </button>
          </div>
          <button className={styles.closeBtn} onClick={closeAuthModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          {successMessage && (
            <div style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#34d399",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}>
              <CheckCircle size={16} />
              <span>{successMessage}</span>
            </div>
          )}

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

          {tab !== "forgot" && (
            <div className={styles.inputGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="auth-password" className={styles.label}>Password</label>
                {tab === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab("forgot");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent, #a855f7)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
          )}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : tab === "signin" ? (
              "Sign In"
            ) : tab === "signup" ? (
              "Create Account"
            ) : (
              "Send Reset Link"
            )}
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
                    setSuccessMessage(null);
                  }}
                >
                  Sign up
                </button>
              </>
            ) : tab === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className={styles.switchBtn}
                  onClick={() => {
                    setTab("signin");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Remember your password?{" "}
                <button
                  type="button"
                  className={styles.switchBtn}
                  onClick={() => {
                    setTab("signin");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Back to Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
