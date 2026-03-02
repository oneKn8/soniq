"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthLogo } from "@/components/auth";
import {
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      if (!supabase) {
        setIsValidSession(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication not configured");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <AuthCard className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Invalid or expired link
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
          <Link href="/forgot-password">
            <Button className="mt-6 w-full">Request new link</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="mt-3 w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </AuthCard>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <AuthCard className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Password updated
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been successfully reset. Redirecting to
            dashboard...
          </p>
          <Link href="/dashboard">
            <Button className="mt-6 w-full">Go to dashboard</Button>
          </Link>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthCard>
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <AuthLogo />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Set new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 inline h-3 w-3" />
            Back to login
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
