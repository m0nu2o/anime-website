"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Mail, Lock, User as UserIcon, Loader2, AlertCircle, UserPlus, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import styles from "../login/login.module.css";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";

  const { signUpWithEmail, user } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user && !successNotice) {
      router.replace(redirect);
    }
  }, [user, redirect, router, successNotice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!username.trim()) {
      setError("Please provide a valid username.");
      return;
    }

    setLoading(true);
    const res = await signUpWithEmail(email, password, username);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccessNotice(
        "Account created! If your email requires confirmation, check your inbox. Otherwise you are now signed in."
      );
      setLoading(false);
      setTimeout(() => {
        router.push(redirect);
      }, 1500);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconCircle}>
          <UserPlus size={24} color="var(--primary, #8b5cf6)" />
        </div>
        <h1 className={styles.title}>Join NextGen Anime</h1>
        <p className={styles.subtitle}>
          Create your account to save favorites, sync episodes, and customize your profile.
        </p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid #10b981",
          borderRadius: "10px",
          padding: "12px 16px",
          color: "#34d399",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}>
          <CheckCircle size={18} />
          <span>{successNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="signup-username" className={styles.label}>Username</label>
          <div className={styles.inputWrap}>
            <UserIcon size={18} className={styles.inputIcon} />
            <input
              id="signup-username"
              type="text"
              required
              className={styles.input}
              placeholder="luffy_pirate_king"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="signup-email" className={styles.label}>Email Address</label>
          <div className={styles.inputWrap}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              id="signup-email"
              type="email"
              required
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="signup-password" className={styles.label}>Password (minimum 6 characters)</label>
          <div className={styles.inputWrap}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              id="signup-password"
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
          {loading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <div className={styles.footer}>
        <span>Already have an account?</span>
        <Link href={`/login${redirect !== "/profile" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className={styles.switchLink}>
          Sign in here
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <>
      <Navbar />
      <main className={styles.pageWrap}>
        <Suspense fallback={<div className={styles.card}><Loader2 size={24} className="spinner" /></div>}>
          <SignupForm />
        </Suspense>
      </main>
    </>
  );
}
