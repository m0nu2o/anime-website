"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, KeyRound, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import styles from "../login/login.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const { user, resetPassword, updatePassword } = useAuth();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If user is authenticated (e.g. following a recovery magic link), allow password update directly
  const isUpdatingPassword = !!user;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await resetPassword(email);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("If an account exists with this email, a password reset link has been sent. Please check your inbox.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await updatePassword(newPassword);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Your password has been updated successfully! Redirecting...");
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconCircle}>
          <KeyRound size={24} color="var(--primary, #8b5cf6)" />
        </div>
        <h1 className={styles.title}>
          {isUpdatingPassword ? "Set New Password" : "Reset Password"}
        </h1>
        <p className={styles.subtitle}>
          {isUpdatingPassword
            ? "Enter your new password below to secure your account."
            : "Enter the email associated with your account and we'll send you a recovery link."}
        </p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className={styles.errorBox}
          style={{
            borderColor: "rgba(34, 197, 94, 0.4)",
            background: "rgba(34, 197, 94, 0.1)",
            color: "#4ade80",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {isUpdatingPassword ? (
        <form onSubmit={handleUpdatePassword} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="new-password" className={styles.label}>New Password</label>
            <div className={styles.inputWrap}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm-password" className={styles.label}>Confirm New Password</label>
            <div className={styles.inputWrap}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequestReset} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="reset-email" className={styles.label}>Email Address</label>
            <div className={styles.inputWrap}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="reset-email"
                type="email"
                required
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}

      <div className={styles.footer}>
        <Link href="/login" className={styles.switchLink}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <main className={styles.pageWrap}>
        <Suspense fallback={<div className={styles.card}><Loader2 size={24} className="spinner" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </>
  );
}
