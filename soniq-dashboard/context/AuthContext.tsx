"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: "google" | "github") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();
  // Initialize loading state based on whether auth needs to be checked
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    // Skip if Supabase is not configured - loading is already false from initial state
    if (!supabase) {
      return;
    }

    // Get initial session
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return { error: new Error("Auth not configured") };
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { error: error as Error | null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: Record<string, unknown>,
    ) => {
      if (!supabase) {
        return { error: new Error("Auth not configured") };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { error: error as Error | null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, [supabase]);

  const signInWithOAuth = useCallback(
    async (provider: "google" | "github") => {
      if (!supabase) return;
      const configuredRedirect = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL;
      const redirectTo =
        configuredRedirect || `${window.location.origin}/auth/callback`;
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });
    },
    [supabase],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
