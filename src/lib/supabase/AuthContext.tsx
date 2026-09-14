"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import { Profile } from "./types";
import { getProfile, upsertProfile } from "./dal";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  uploadAvatar: (file: File) => Promise<{ url?: string; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isAuthModalOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signInWithEmail: async () => ({}),
  signUpWithEmail: async () => ({}),
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  uploadAvatar: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchProfile = async (currentUser: User) => {
    try {
      let p = await getProfile(currentUser.id);
      if (!p) {
        // Create initial profile if none exists
        const defaultUsername =
          currentUser.user_metadata?.username ||
          currentUser.email?.split("@")[0] ||
          `user_${currentUser.id.slice(0, 6)}`;
        p = await upsertProfile({
          id: currentUser.id,
          username: defaultUsername,
          display_name: defaultUsername,
        });
      }
      setProfile(p);
    } catch (err) {
      console.warn("Failed to fetch/create profile:", err);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      }
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      closeAuthModal();
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      return { error: msg };
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    try {
      const cleanUsername = username.trim() || email.split("@")[0];
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: cleanUsername, display_name: cleanUsername },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        await upsertProfile({
          id: data.user.id,
          username: cleanUsername,
          display_name: cleanUsername,
        });
      }
      closeAuthModal();
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      return { error: msg };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password reset request failed";
      return { error: msg };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      return { error: msg };
    }
  };

  const uploadAvatar = async (file: File): Promise<{ url?: string; error?: string }> => {
    if (!user) return { error: "Must be signed in to upload an avatar" };
    try {
      const ext = file.name.split(".").pop() || "png";
      const randomId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : "upload";
      const filePath = `${user.id}/avatar_${randomId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) return { error: uploadError.message };

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await upsertProfile({
        id: user.id,
        avatar_url: publicUrl,
      });

      await refreshProfile();
      return { url: publicUrl };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Avatar upload failed";
      return { error: msg };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        updatePassword,
        uploadAvatar,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
