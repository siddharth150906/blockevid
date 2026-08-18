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

interface AuthContextType {
  user: OfficerUser | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  pendingEmail: string;
  devOtpHint: string | null;
  openAuthModal: (tab?: AuthModalTab, email?: string) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: AuthModalTab) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresOtp?: boolean }>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    designation: string;
    agency?: string;
  }) => Promise<{ success: boolean; error?: string; devOtp?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; error?: string; devOtp?: string }>;
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
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

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
          if (data.devOtp) setDevOtpHint(data.devOtp);
          setAuthModalTab("otp");
          return { success: false, requiresOtp: true, error: data.message };
        }
        return { success: false, error: data.error || "Login failed." };
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

      if (!res.ok) {
        return { success: false, error: result.error || "Signup failed." };
      }

      setPendingEmail(data.email);
      if (result.devOtp) setDevOtpHint(result.devOtp);
      setAuthModalTab("otp");
      return { success: true, devOtp: result.devOtp };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Verification failed." };
      }

      setUser(data.user);
      setDevOtpHint(null);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error occurred." };
    }
  };

  const resendOtp = async (email: string) => {
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Resend failed." };
      }

      if (data.devOtp) setDevOtpHint(data.devOtp);
      return { success: true, devOtp: data.devOtp };
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
      setDevOtpHint(null);
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
        devOtpHint,
        openAuthModal,
        closeAuthModal,
        setAuthModalTab,
        login,
        signup,
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
