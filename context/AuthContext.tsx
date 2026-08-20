"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface OfficerUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  designation: string;
  agency: string;
  is_email_verified: boolean;
  avatar_url?: string | null;
  google_id?: string | null;
  isProfileComplete?: boolean;
}

export type AuthModalTab = "login" | "signup" | "otp" | "complete-profile";

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  message?: string;
  attemptsRemaining?: number;
  isLocked?: boolean;
  isExpired?: boolean;
}

export interface ResendOtpResult {
  success: boolean;
  error?: string;
  message?: string;
  secondsRemaining?: number;
}

interface AuthContextType {
  user: OfficerUser | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  pendingEmail: string;
  openAuthModal: (tab?: AuthModalTab, email?: string) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: AuthModalTab) => void;
  setPendingEmail: (email: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresOtp?: boolean }>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    designation: string;
    agency?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string, name?: string) => Promise<{ success: boolean; error?: string; secondsRemaining?: number }>;
  verifyOtp: (email: string, otp: string) => Promise<VerifyOtpResult>;
  resendOtp: (email: string) => Promise<ResendOtpResult>;
  loginWithGoogle: (credential?: string, testEmail?: string, testName?: string) => Promise<{ success: boolean; error?: string; needsProfileCompletion?: boolean }>;
  completeProfile: (data: {
    name: string;
    phone: string;
    designation: string;
    agency?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OfficerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>("login");
  const [pendingEmail, setPendingEmail] = useState("");

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        // If user is logged in via Google but hasn't completed mandatory phone & designation
        if (data.user.isProfileComplete === false) {
          setAuthModalTab("complete-profile");
          setIsAuthModalOpen(true);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed fetching user session:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const openAuthModal = (tab: AuthModalTab = "login", email = "") => {
    setAuthModalTab(tab);
    if (email) setPendingEmail(email);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    // Prevent closing if user needs mandatory profile completion
    if (user && user.isProfileComplete === false) {
      alert("Please complete the mandatory Officer Phone & Designation fields before proceeding.");
      return;
    }
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresOtp) {
          setPendingEmail(email);
          setAuthModalTab("otp");
          return { success: false, requiresOtp: true, error: data.message };
        }
        return { success: false, error: data.error || data.message || "Login failed." };
      }

      setUser(data.user);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    designation: string;
    agency?: string;
  }) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        return { success: false, error: result.message || result.error || "Signup failed." };
      }

      setPendingEmail(data.email);
      setAuthModalTab("otp");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const sendOtp = async (email: string, name?: string) => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.message || "Failed to send verification code.",
          secondsRemaining: data.secondsRemaining,
        };
      }

      setPendingEmail(email);
      setAuthModalTab("otp");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<VerifyOtpResult> => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.message || "Verification failed.",
          attemptsRemaining: data.attemptsRemaining,
          isLocked: data.isLocked,
          isExpired: data.isExpired,
        };
      }

      if (data.user) {
        setUser(data.user);
      } else {
        await fetchCurrentUser();
      }
      setIsAuthModalOpen(false);
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const resendOtp = async (email: string): Promise<ResendOtpResult> => {
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.message || "Resend failed.",
          secondsRemaining: data.secondsRemaining,
        };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const loginWithGoogle = async (credential?: string, testEmail?: string, testName?: string) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, email: testEmail, name: testName }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Google authentication failed." };
      }

      setUser(data.user);

      if (data.needsProfileCompletion) {
        setAuthModalTab("complete-profile");
        setIsAuthModalOpen(true);
        return { success: true, needsProfileCompletion: true };
      }

      setIsAuthModalOpen(false);
      return { success: true, needsProfileCompletion: false };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const completeProfile = async (data: {
    name: string;
    phone: string;
    designation: string;
    agency?: string;
  }) => {
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error || "Failed to update profile." };
      }

      setUser(result.user);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        pendingEmail,
        openAuthModal,
        closeAuthModal,
        setAuthModalTab,
        setPendingEmail,
        login,
        signup,
        sendOtp,
        verifyOtp,
        resendOtp,
        loginWithGoogle,
        completeProfile,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
