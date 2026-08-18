"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Shield, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Briefcase, 
  Building2, 
  X, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Sparkles
} from "lucide-react";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    pendingEmail,
    devOtpHint,
    login,
    signup,
    verifyOtp,
    resendOtp,
    loginWithGoogle,
    completeProfile,
    user,
  } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state (Mandatory fields: name, email, password, phone, designation)
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupDesignation, setSignupDesignation] = useState("Cyber Crime Inspector");
  const [signupAgency, setSignupAgency] = useState("Delhi Cyber Cell");

  // OTP form state
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Complete profile state (for Google first-time users)
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileDesignation, setProfileDesignation] = useState("Forensic Analyst");
  const [profileAgency, setProfileAgency] = useState("Delhi Cyber Cell");

  // Status & error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Sync state when tab changes
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (authModalTab === "otp") {
      setResendTimer(60);
      setCanResend(false);
    }
    if (authModalTab === "complete-profile" && user) {
      setProfileName(user.name || "");
      setProfilePhone(user.phone || "");
      setProfileDesignation(user.designation || "Cyber Crime Inspector");
      setProfileAgency(user.agency || "Delhi Cyber Cell");
    }
  }, [authModalTab, user]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authModalTab === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authModalTab, resendTimer]);

  // Render Google Identity Services Button if script is available
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Check if google accounts script is loaded on window
    const win = window as any;
    if (win.google && win.google.accounts && clientId && !clientId.startsWith("your_google")) {
      try {
        win.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              setIsSubmitting(true);
              loginWithGoogle(response.credential).finally(() => setIsSubmitting(false));
            }
          },
        });

        if (googleBtnRef.current) {
          win.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_black",
            size: "large",
            width: 320,
            text: "continue_with",
            shape: "rectangular",
          });
        }
      } catch (err) {
        console.warn("Google Sign-In initialization note:", err);
      }
    }
  }, [isAuthModalOpen, authModalTab, loginWithGoogle]);

  if (!isAuthModalOpen) return null;

  // Handle standard login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  // Handle standard signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Mandatory validations
    if (!signupName.trim()) {
      setErrorMessage("Officer Full Name is mandatory.");
      return;
    }
    if (!signupPhone.trim()) {
      setErrorMessage("Official Phone Number is mandatory.");
      return;
    }
    if (!signupDesignation.trim()) {
      setErrorMessage("Officer Designation / Rank is mandatory.");
      return;
    }
    if (!signupEmail.trim() || !signupPassword.trim()) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    const res = await signup({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      phone: signupPhone,
      designation: signupDesignation,
      agency: signupAgency,
    });
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    const res = await verifyOtp(pendingEmail || signupEmail || loginEmail, otpCode.trim());
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const targetEmail = pendingEmail || signupEmail || loginEmail;
    const res = await resendOtp(targetEmail);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage("A fresh verification code has been dispatched.");
      setResendTimer(60);
      setCanResend(false);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  // Handle completing mandatory profile (Google OAuth first-time)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!profileName.trim()) {
      setErrorMessage("Officer Name is mandatory.");
      return;
    }
    if (!profilePhone.trim()) {
      setErrorMessage("Official Contact Phone Number is mandatory.");
      return;
    }
    if (!profileDesignation.trim()) {
      setErrorMessage("Officer Designation / Rank is mandatory.");
      return;
    }

    setIsSubmitting(true);
    const res = await completeProfile({
      name: profileName,
      phone: profilePhone,
      designation: profileDesignation,
      agency: profileAgency,
    });
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  // Quick Google Sign-in demo handler (works even without client id configuration)
  const handleQuickGoogleAuth = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const sampleEmail = `officer.${Math.floor(Math.random() * 900 + 100)}@delhipolice.gov.in`;
    const sampleName = `Investigator Kumar`;
    const res = await loginWithGoogle(undefined, sampleEmail, sampleName);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#070c18] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-200">
        
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Close Button */}
        {authModalTab !== "complete-profile" && (
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                BlockEvid Officer Portal
                <span className="text-[10px] uppercase font-mono tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 rounded">
                  AUTHENTICATED LEDGER
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {authModalTab === "login" && "Authorize your investigator credentials to access the chain of custody."}
                {authModalTab === "signup" && "Register your officer credentials. Mandatory email OTP verification required."}
                {authModalTab === "otp" && "Enter the 6-digit cryptographic OTP sent to your email."}
                {authModalTab === "complete-profile" && "Mandatory Officer Profile: Submit your Phone & Designation to proceed."}
              </p>
            </div>
          </div>

          {/* Tab Switcher (Only visible for Login & Signup) */}
          {(authModalTab === "login" || authModalTab === "signup") && (
            <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-[#040711] border border-zinc-800 rounded-xl text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthModalTab("login");
                }}
                className={`py-2 px-3 rounded-lg font-semibold transition-all ${
                  authModalTab === "login"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthModalTab("signup");
                }}
                className={`py-2 px-3 rounded-lg font-semibold transition-all ${
                  authModalTab === "signup"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* ============================== */}
          {/* 1. LOGIN TAB                   */}
          {/* ============================== */}
          {authModalTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-400" /> Officer Email Address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="investigator@police.gov.in"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" /> Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-mono text-sm font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Authenticate Credentials
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Or OAuth Sign In</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Google OAuth Button */}
              <div className="space-y-2">
                <div ref={googleBtnRef} className="flex justify-center" />
                
                <button
                  type="button"
                  onClick={handleQuickGoogleAuth}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#0c1222] hover:bg-[#11192e] border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-mono text-zinc-300 flex items-center justify-center gap-3 transition-colors cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Sign in with Google OAuth</span>
                </button>
              </div>

              <div className="text-center pt-2 text-xs text-zinc-500 font-mono">
                Need a new officer account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthModalTab("signup")}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Register here
                </button>
              </div>
            </form>
          )}

          {/* ============================== */}
          {/* 2. SIGN UP TAB                 */}
          {/* ============================== */}
          {authModalTab === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              
              {/* Mandatory Notice */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-[11px] font-mono text-emerald-400/90 flex items-center gap-2">
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                <span>All officer fields (Name, Phone, Designation) are mandatory for judicial audit logging.</span>
              </div>

              {/* Name (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-400" /> Officer Full Name
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Insp. Vikram Malhotra"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  required
                />
              </div>

              {/* Email (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-emerald-400" /> Official Email Address
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="vikram.malhotra@cybercrime.gov.in"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  required
                />
              </div>

              {/* Phone (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> Contact Phone Number
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  required
                />
              </div>

              {/* Designation / Rank (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-400" /> Officer Designation / Rank
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <select
                  value={signupDesignation}
                  onChange={(e) => setSignupDesignation(e.target.value)}
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                >
                  <option value="Cyber Crime Inspector">Cyber Crime Inspector</option>
                  <option value="Senior Forensic Analyst">Senior Forensic Analyst</option>
                  <option value="Sub-Inspector (Investigative)">Sub-Inspector (Investigative)</option>
                  <option value="Assistant Commissioner of Police (ACP)">Assistant Commissioner of Police (ACP)</option>
                  <option value="Digital Evidence Custodian">Digital Evidence Custodian</option>
                  <option value="Court Registrar / Judicial Officer">Court Registrar / Judicial Officer</option>
                  <option value="Forensic Science Lab Director">Forensic Science Lab Director</option>
                </select>
              </div>

              {/* Agency / Police Unit */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" /> Law Enforcement Unit / Agency
                </label>
                <input
                  type="text"
                  value={signupAgency}
                  onChange={(e) => setSignupAgency(e.target.value)}
                  placeholder="Delhi Cyber Cell / CFSL New Delhi"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" /> Set Master Password
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Min 6 chars</span>
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-mono text-sm font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Verify Email via 6-Digit OTP
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Or Sign Up With</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleQuickGoogleAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#0c1222] hover:bg-[#11192e] border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-mono text-zinc-300 flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
                <span>Sign up with Google OAuth</span>
              </button>

              <div className="text-center pt-2 text-xs text-zinc-500 font-mono">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setAuthModalTab("login")}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Log in here
                </button>
              </div>
            </form>
          )}

          {/* ============================== */}
          {/* 3. OTP VERIFICATION TAB        */}
          {/* ============================== */}
          {authModalTab === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="p-4 bg-[#040711] border border-zinc-800 rounded-xl text-center space-y-2 font-mono">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="text-xs text-zinc-400">
                  A verification code has been dispatched to:
                </div>
                <div className="text-sm font-bold text-white break-all">
                  {pendingEmail || signupEmail || loginEmail}
                </div>
              </div>

              {/* Dev OTP Helper Box for seamless testing */}
              {devOtpHint && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400">
                    💡 <strong>Test OTP Code:</strong> <span className="font-bold text-white tracking-widest">{devOtpHint}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtpHint)}
                    className="px-2 py-1 bg-emerald-500 text-black font-bold rounded hover:bg-emerald-400 transition-colors"
                  >
                    Auto Fill
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 block text-center">
                  Enter 6-Digit Cryptographic Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-[1em] text-2xl font-mono font-bold bg-[#040711] border border-zinc-800 rounded-xl p-3.5 text-emerald-400 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length !== 6}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-mono text-sm font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Verify Officer Credentials
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs font-mono pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModalTab("signup")}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  ← Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || isSubmitting}
                  className={`font-semibold transition-colors ${
                    canResend
                      ? "text-emerald-400 hover:underline cursor-pointer"
                      : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  {canResend ? "Resend Code" : `Resend in ${resendTimer}s`}
                </button>
              </div>
            </form>
          )}

          {/* ============================== */}
          {/* 4. COMPLETE PROFILE TAB        */}
          {/* ============================== */}
          {authModalTab === "complete-profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> First-Time Officer Registration
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Judicial and forensic chain-of-custody protocols require verified contact details and designation. All fields below are mandatory.
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-400" /> Officer Full Name
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Officer Name"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              {/* Phone (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> Official Contact Phone Number
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              {/* Designation (Mandatory) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-400" /> Official Designation / Rank
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Mandatory *</span>
                </label>
                <select
                  value={profileDesignation}
                  onChange={(e) => setProfileDesignation(e.target.value)}
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                >
                  <option value="Cyber Crime Inspector">Cyber Crime Inspector</option>
                  <option value="Senior Forensic Analyst">Senior Forensic Analyst</option>
                  <option value="Sub-Inspector (Investigative)">Sub-Inspector (Investigative)</option>
                  <option value="Assistant Commissioner of Police (ACP)">Assistant Commissioner of Police (ACP)</option>
                  <option value="Digital Evidence Custodian">Digital Evidence Custodian</option>
                  <option value="Court Registrar / Judicial Officer">Court Registrar / Judicial Officer</option>
                  <option value="Forensic Science Lab Director">Forensic Science Lab Director</option>
                </select>
              </div>

              {/* Agency */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" /> Law Enforcement Unit / Agency
                </label>
                <input
                  type="text"
                  value={profileAgency}
                  onChange={(e) => setProfileAgency(e.target.value)}
                  placeholder="Delhi Cyber Cell"
                  className="w-full bg-[#040711] border border-zinc-800 rounded-xl p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-mono text-sm font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Registration & Authorize
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
