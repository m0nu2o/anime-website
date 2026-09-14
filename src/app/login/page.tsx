"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Mail, Lock, Loader2, AlertCircle, LogIn, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const callbackError = searchParams.get("error");

  const { signInWithEmail, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError === "auth_callback_failed" ? "Authentication verification link expired or invalid." : null
  );
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (user) {
      router.replace(redirect);
    }
  }, [user, redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signInWithEmail(email, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push(redirect);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconCircle}>
          <LogIn size={24} color="var(--primary, #8b5cf6)" />
        </div>
        <h1 className={styles.title}>Sign in to NextGen</h1>
        <p className={styles.subtitle}>
          Track episodes, synchronize your watchlist, and join discussions.
        </p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>Email Address</label>
          <div className={styles.inputWrap}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              id="login-email"
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
          <div className={styles.labelRow}>
            <label htmlFor="login-password" className={styles.label}>Password</label>
            <Link href="/reset-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <div className={styles.inputWrap}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              id="login-password"
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
            <>
              <span>Sign In</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className={styles.footer}>
        <span>Don&apos;t have an account yet?</span>
        <Link href={`/signup${redirect !== "/profile" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className={styles.switchLink}>
          Create an Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className={styles.pageWrap}>
        <Suspense fallback={<div className={styles.card}><Loader2 size={24} className="spinner" /></div>}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
