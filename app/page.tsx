"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Shield, 
  FileCheck, 
  History, 
  Upload, 
  UserCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Server, 
  GitCommit, 
  Activity, 
  CornerDownRight, 
  Share2, 
  HelpCircle,
  Terminal,
  RefreshCw,
  FolderLock,
  LogIn,
  LogOut,
  User,
  BadgeCheck,
  Sparkles,
  Lock
} from "lucide-react";

// Types
interface CustodyTransfer {
  timestamp: string;
  fromUser: string;
  toUser: string;
  toAgency: string;
  purpose: string;
  signature: string;
}

interface EvidenceBlock {
  index: number;
  timestamp: string;
  hash: string;
  prevHash: string;
  caseId: string;
  caseName: string;
  fileName: string;
  fileSize: number; // in bytes
  fileType: string;
  investigator: string;
  agency: string;
  location: string;
  originDevice: string;
  signature: string;
  transfers: CustodyTransfer[];
}

// Initial Mock Ledger Data
const INITIAL_LEDGER: EvidenceBlock[] = [
  {
    index: 0,
    timestamp: "2026-08-18 10:15:30",
    hash: "6a09e667f3bcc908b2fb13665182a17511b15df84501235b2e61df18f76e399c",
    prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
    caseId: "CASE-2026-089A",
    caseName: "Delhi Mall Cyber Theft",
    fileName: "cctv_entrance_cam3.mp4",
    fileSize: 45291880, // ~43.2MB
    fileType: "video/mp4",
    investigator: "Insp. Rajesh Kumar",
    agency: "Delhi Cyber Cell",
    location: "South Delhi District",
    originDevice: "Hikvision NVR v3.1",
    signature: "SIG_0x98f821d234a...[Verified]",
    transfers: [
      {
        timestamp: "2026-08-18 14:30:00",
        fromUser: "Insp. Rajesh Kumar",
        toUser: "Dr. Sunita Mehta",
        toAgency: "Central Forensic Science Lab",
        purpose: "Extract frame analysis & enhance suspect facial features",
        signature: "SIG_0xef12389a1c2...[Verified]"
      }
    ]
  },
  {
    index: 1,
    timestamp: "2026-08-18 11:45:12",
    hash: "8f5a11b2de7c6a59b3d2f9c8d7e6f54c3b2a10e9f8d7c6b5a493f2d1e0c9b8a7",
    prevHash: "6a09e667f3bcc908b2fb13665182a17511b15df84501235b2e61df18f76e399c",
    caseId: "CASE-2026-112C",
    caseName: "Corporate Espionage Intrusion",
    fileName: "firewall_logs_server7.log",
    fileSize: 248910, // ~243KB
    fileType: "text/plain",
    investigator: "Sub-Insp. Priya Sen",
    agency: "National Cyber Crime Unit",
    location: "Noida Cyber Forensic Hub",
    originDevice: "Palo Alto Firewall PA-5220",
    signature: "SIG_0x11ab449d012...[Verified]",
    transfers: []
  },
  {
    index: 2,
    timestamp: "2026-08-18 16:22:05",
    hash: "e5a32b6e1f0c9d8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b",
    prevHash: "8f5a11b2de7c6a59b3d2f9c8d7e6f54c3b2a10e9f8d7c6b5a493f2d1e0c9b8a7",
    caseId: "CASE-2026-095F",
    caseName: "Intercepted Cyber Extortion Call",
    fileName: "ransom_voip_intercept.wav",
    fileSize: 1891002, // ~1.8MB
    fileType: "audio/wav",
    investigator: "Insp. Rajesh Kumar",
    agency: "Delhi Cyber Cell",
    location: "Technical Intelligence Division",
    originDevice: "Asterisk PBX Recorder",
    signature: "SIG_0x88cdef0129a...[Verified]",
    transfers: [
      {
        timestamp: "2026-08-18 17:10:00",
        fromUser: "Insp. Rajesh Kumar",
        toUser: "ACP Amit Singh",
        toAgency: "Delhi Police HQ",
        purpose: "Briefing and presentation of digital evidence for warrant execution",
        signature: "SIG_0xa4d8b2e1c3a...[Verified]"
      },
      {
        timestamp: "2026-08-19 09:00:00",
        fromUser: "ACP Amit Singh",
        toUser: "Registrar Anil Sharma",
        toAgency: "District Court Delhi",
        purpose: "Formal deposition of digital evidence registry to judicial record",
        signature: "SIG_0xf2b5a6c8d7e...[Verified]"
      }
    ]
  }
];

// Helper to format bytes
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function Home() {
  const { user, openAuthModal, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "register" | "transfer" | "verify" | "simulation">("overview");
  const [ledger, setLedger] = useState<EvidenceBlock[]>(INITIAL_LEDGER);
  
  // Registration Form State
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regHash, setRegHash] = useState<string>("");
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [caseId, setCaseId] = useState<string>("CASE-2026-");
  const [caseName, setCaseName] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<string>("");
  const [investigator, setInvestigator] = useState<string>("");
  const [agency, setAgency] = useState<string>("Delhi Cyber Cell");
  const [location, setLocation] = useState<string>("");
  const [originDevice, setOriginDevice] = useState<string>("");

  // Sync logged in officer details into form defaults
  useEffect(() => {
    if (user) {
      setInvestigator(`${user.name} (${user.designation})`);
      if (user.agency) setAgency(user.agency);
    }
  }, [user]);
  
  // Transfer Custody Form State
  const [selectedEvId, setSelectedEvId] = useState<number>(-1);
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAgency, setTransferAgency] = useState<string>("");
  const [transferPurpose, setTransferPurpose] = useState<string>("");

  // Verification Portal State
  const [verFile, setVerFile] = useState<File | null>(null);
  const [verHash, setVerHash] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "idle" | "authentic" | "tampered" | "not_found";
    matchedBlock?: EvidenceBlock;
    calculatedHash?: string;
  }>({ status: "idle" });

  // Simulation Lab State
  const [simScenario, setSimScenario] = useState<"confession" | "whatsapp">("confession");
  const [simText, setSimText] = useState<string>(
    "CASE: 2026-089A\nTIMELINE: 18th August 2026\nSUSPECT: Vikram Malbotra\nDECLARATION: I, Vikram Malhotra, voluntarily submit that I was present in the server room at 10:14 PM. However, I did not install the cyber payload. The network log of my keycard entry is correct but the security vault door was already unlatched when I reached."
  );
  const [simRegisteredHash, setSimRegisteredHash] = useState<string>("");
  const [simCurrentHash, setSimCurrentHash] = useState<string>("");
  const [simStatus, setSimStatus] = useState<"idle" | "authentic" | "tampered">("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const verInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage if exists
  useEffect(() => {
    const savedLedger = localStorage.getItem("blockevid_ledger");
    if (savedLedger) {
      try {
        setLedger(JSON.parse(savedLedger));
      } catch (e) {
        console.error("Failed parsing ledger from localStorage", e);
      }
    }
  }, []);

  // Save to local storage on update
  const updateLedger = (newLedger: EvidenceBlock[]) => {
    setLedger(newLedger);
    localStorage.setItem("blockevid_ledger", JSON.stringify(newLedger));
  };

  // Sync simulation scenario hashes
  useEffect(() => {
    const syncSimHashes = async () => {
      const regText = simScenario === "confession" 
        ? "CASE: 2026-089A\nTIMELINE: 18th August 2026\nSUSPECT: Vikram Malbotra\nDECLARATION: I, Vikram Malhotra, voluntarily submit that I was present in the server room at 10:14 PM. However, I did not install the cyber payload. The network log of my keycard entry is correct but the security vault door was already unlatched when I reached."
        : "WHATSAPP DECRYPTED CHAT DUMP\n[10:12 PM] Suspect A: Package is ready at the station.\n[10:13 PM] Suspect B: Did you clear the cameras?\n[10:15 PM] Suspect A: Yes, camera 3 is disabled for 10 mins. Run it now.";
      
      const encoder = new TextEncoder();
      const regBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(regText));
      const regHex = Array.from(new Uint8Array(regBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      
      setSimRegisteredHash(regHex);
      
      // Calculate current hash
      const currentBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(simText));
      const currentHex = Array.from(new Uint8Array(currentBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      setSimCurrentHash(currentHex);
      
      if (currentHex === regHex) {
        setSimStatus("authentic");
      } else {
        setSimStatus("tampered");
      }
    };
    
    syncSimHashes();
  }, [simScenario, simText]);

  // Hashing logic using browser cryptography
  const calculateSHA256 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
          resolve(hashHex);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle file select for registration
  const handleRegFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRegFile(file);
    setIsHashing(true);
    try {
      const hash = await calculateSHA256(file);
      setRegHash(hash);
      setFileName(file.name);
      setFileSize(file.size);
      setFileType(file.type || "unknown");
    } catch (err) {
      console.error(err);
      alert("Error generating cryptographic hash");
    } finally {
      setIsHashing(false);
    }
  };

  // Submit Evidence Registration
  const handleRegisterEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regHash || !fileName) {
      alert("Please upload a file to generate the SHA-256 hash.");
      return;
    }

    const prevBlock = ledger[ledger.length - 1];
    const prevHash = prevBlock ? prevBlock.hash : "0000000000000000000000000000000000000000000000000000000000000000";
    
    // Sign generation signature with authenticated officer ID if available
    const officerTag = user ? user.name.replace(/\s+/g, "_") : "Officer";
    const signature = `SIG_${officerTag}_0x${Math.random().toString(16).substr(2, 10)}...[Verified]`;

    const newBlock: EvidenceBlock = {
      index: ledger.length,
      timestamp: new Date().toISOString().replace("T", " ").substr(0, 19),
      hash: regHash,
      prevHash,
      caseId: caseId || "CASE-2026-UNKNOWN",
      caseName: caseName || "General Evidence",
      fileName,
      fileSize,
      fileType,
      investigator: investigator || (user ? `${user.name} (${user.designation})` : "System Auditor"),
      agency: agency || (user ? user.agency : "Delhi Cyber Cell"),
      location: location || "Forensic Lab",
      originDevice: originDevice || "Secured Console",
      signature,
      transfers: []
    };

    updateLedger([...ledger, newBlock]);
    
    // Reset form
    setRegFile(null);
    setRegHash("");
    setCaseId("CASE-2026-");
    setCaseName("");
    setFileName("");
    setFileSize(0);
    setFileType("");
    setInvestigator("");
    setLocation("");
    setOriginDevice("");
    
    alert(`Success: Cryptographic block #${newBlock.index} successfully minted & appended to the BlockEvid ledger!`);
    setActiveTab("overview");
  };

  // Submit Custody Transfer
  const handleTransferCustody = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEvId < 0) {
      alert("Select evidence to hand over.");
      return;
    }

    const updated = ledger.map((block) => {
      if (block.index === selectedEvId) {
        const signature = `SIG_0x${Math.random().toString(16).substr(2, 12)}...[Verified]`;
        
        // Find current holder
        const lastTransfer = block.transfers[block.transfers.length - 1];
        const fromUser = lastTransfer ? lastTransfer.toUser : block.investigator;

        const transfer: CustodyTransfer = {
          timestamp: new Date().toISOString().replace("T", " ").substr(0, 19),
          fromUser,
          toUser: transferTo,
          toAgency: transferAgency,
          purpose: transferPurpose,
          signature
        };
        return {
          ...block,
          transfers: [...block.transfers, transfer]
        };
      }
      return block;
    });

    updateLedger(updated);
    
    // Reset form
    setTransferTo("");
    setTransferAgency("");
    setTransferPurpose("");
    setSelectedEvId(-1);
    
    alert("Chain of custody transfer successfully logged and signed!");
    setActiveTab("overview");
  };

  // Drag and Drop Verification Logic
  const handleVerifyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerFile(file);
    setIsVerifying(true);
    setVerificationResult({ status: "idle" });

    try {
      const hash = await calculateSHA256(file);
      setVerHash(hash);

      // Find in ledger
      const matched = ledger.find(block => block.hash === hash);
      if (matched) {
        setVerificationResult({
          status: "authentic",
          matchedBlock: matched,
          calculatedHash: hash
        });
      } else {
        // Find if file name exists but hash changed (TAMPERED)
        const nameMatch = ledger.find(block => block.fileName === file.name);
        if (nameMatch) {
          setVerificationResult({
            status: "tampered",
            matchedBlock: nameMatch,
            calculatedHash: hash
          });
        } else {
          setVerificationResult({
            status: "not_found",
            calculatedHash: hash
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying cryptographic fingerprint");
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset local storage to initial mock ledger state
  const resetLedgerData = () => {
    if (confirm("Are you sure you want to restore the default secure Chain-of-Custody ledger?")) {
      updateLedger(INITIAL_LEDGER);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-[#f3f4f6]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#090d1a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Shield className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                BlockEvid <span className="text-[10px] uppercase font-mono tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 rounded">CHAIN-OF-CUSTODY</span>
              </h1>
              <p className="text-xs text-zinc-500">Immutable Digital Evidence Integrity Engine</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              <span>LEDGER: ONLINE</span>
              <span className="text-zinc-600">|</span>
              <span>BLOCKS: #{ledger.length}</span>
            </div>
            
            <button 
              onClick={resetLedgerData}
              className="p-1.5 hover:bg-zinc-800 rounded-md border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Reset Ledger State"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Officer Authentication Status */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <div className="flex items-center gap-2.5 bg-[#060a16] border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : "O"}
                  </div>
                  <div className="text-left font-mono hidden sm:block">
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>{user.name}</span>
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-400 inline" />
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                      <span className="text-emerald-400 font-semibold">{user.designation}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-500">{user.agency}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
                  title="Sign Out Officer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Officer Sign In</span>
                  <span className="sm:hidden">Sign In</span>
                </button>
                <button
                  onClick={() => openAuthModal("signup")}
                  className="px-3 py-1.5 text-xs font-mono font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Operations</div>
            
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === "overview"
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Server className="h-4 w-4" />
              <span>Ledger Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("register")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === "register"
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Register Evidence</span>
            </button>

            <button
              onClick={() => setActiveTab("transfer")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === "transfer"
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Share2 className="h-4 w-4" />
              <span>Log Custody Handover</span>
            </button>

            <button
              onClick={() => setActiveTab("verify")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === "verify"
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <FileCheck className="h-4 w-4" />
              <span>Courtroom Verifier</span>
            </button>

            <div className="h-px bg-zinc-800 my-4" />
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Simulators</div>

            <button
              onClick={() => setActiveTab("simulation")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === "simulation"
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Terminal className="h-4 w-4 animate-pulse" />
              <span>Integrity Tamper Lab</span>
            </button>

            {/* Quick Stats sidebar widget */}
            <div className="pt-6">
              <div className="bg-[#0b101d] rounded-xl p-4 border border-zinc-800/80 font-mono text-[11px] text-zinc-400 space-y-2">
                <div className="text-zinc-500 border-b border-zinc-800 pb-1 uppercase font-semibold">Nodes & Security</div>
                <div className="flex justify-between">
                  <span>SHA-256 Engine:</span>
                  <span className="text-emerald-400 font-semibold">WebCrypto v2</span>
                </div>
                <div className="flex justify-between">
                  <span>Hash Mismatch Alert:</span>
                  <span className="text-red-400 font-semibold">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Ledger Integrity:</span>
                  <span className="text-emerald-400 font-semibold">100.00%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Tab Content Display */}
        <main className="flex-grow">
          {/* TAB 1: LEDGER OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="cyber-card rounded-xl p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-400 uppercase">Blocks Registered</span>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md"><Server className="h-4 w-4" /></div>
                  </div>
                  <div className="text-3xl font-bold mt-2 text-white">{ledger.length}</div>
                </div>

                <div className="cyber-card rounded-xl p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-400 uppercase">Chain Integrity Rate</span>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md"><Shield className="h-4 w-4" /></div>
                  </div>
                  <div className="text-3xl font-bold mt-2 text-emerald-400">100.00%</div>
                </div>

                <div className="cyber-card rounded-xl p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-400 uppercase">Tamper Incidents</span>
                    <div className="p-1.5 bg-red-500/10 text-red-400 rounded-md"><AlertTriangle className="h-4 w-4" /></div>
                  </div>
                  <div className="text-3xl font-bold mt-2 text-red-500">0</div>
                </div>
              </div>

              {/* Block List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-emerald-400" /> Immutable Chain Ledger Audit
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">Chained cryptographic state</span>
                </div>

                {ledger.map((block) => (
                  <div key={block.index} className="cyber-card rounded-xl border border-zinc-800/80 p-6 relative overflow-visible">
                    
                    {/* Visual Timeline Connector line */}
                    {block.index < ledger.length - 1 && <div className="timeline-line" />}

                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      
                      {/* Left Block Identifier */}
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-mono text-emerald-400 font-bold">
                          #{block.index}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-white">{block.caseName}</h4>
                            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{block.caseId}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {block.fileName}</span>
                            <span>({formatBytes(block.fileSize)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block Signatures / Time */}
                      <div className="text-right flex flex-col items-end gap-1 text-xs font-mono">
                        <div className="text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {block.timestamp}</div>
                        <div className="text-emerald-400/90 font-semibold bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded">{block.signature}</div>
                      </div>
                    </div>

                    {/* Cryptographic Hashes */}
                    <div className="mt-4 bg-[#050914] p-3 rounded-lg border border-zinc-900 space-y-1.5 font-mono text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 uppercase text-[9px] w-20">File Hash:</span>
                        <span className="text-white break-all select-all font-bold">{block.hash}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 uppercase text-[9px] w-20">Prev Block:</span>
                        <span className="text-zinc-500 break-all select-all">{block.prevHash}</span>
                      </div>
                    </div>

                    {/* Origin Metadata */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-400">
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase">Investigator</span>
                        <span className="text-zinc-300 font-medium">{block.investigator}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase">Agency</span>
                        <span className="text-zinc-300 font-medium">{block.agency}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase">Device Origin</span>
                        <span className="text-zinc-300 font-medium">{block.originDevice}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase">Locality GPS</span>
                        <span className="text-zinc-300 font-medium">{block.location}</span>
                      </div>
                    </div>

                    {/* Chain of Custody transfers */}
                    {block.transfers.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-900">
                        <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-2 font-bold tracking-wider">Custody Handover Trail ({block.transfers.length})</span>
                        <div className="space-y-2">
                          {block.transfers.map((trans, i) => (
                            <div key={i} className="flex gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                              <CornerDownRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-grow">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                  <span>{trans.timestamp}</span>
                                  <span className="text-zinc-400 bg-emerald-500/5 border border-emerald-500/10 px-1 rounded">{trans.signature}</span>
                                </div>
                                <div className="text-zinc-200 mt-1">
                                  Transfer: <strong className="text-white">{trans.fromUser}</strong> to <strong className="text-emerald-400">{trans.toUser}</strong> ({trans.toAgency})
                                </div>
                                <div className="text-[11px] text-zinc-500 italic mt-0.5">
                                  Purpose: {trans.purpose}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER EVIDENCE */}
          {activeTab === "register" && (
            <div className="cyber-card rounded-xl p-6 md:p-8 space-y-6">
              <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-emerald-400" /> Ingest & Cryptographically Mint Evidence
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Upload file to extract its unique mathematical SHA-256 fingerprint. No data is sent to external databases; hashing happens client-side.
                  </p>
                </div>

                {user ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400">
                    <BadgeCheck className="h-4 w-4" />
                    <span>Signing as: <strong>{user.name}</strong></span>
                  </div>
                ) : (
                  <button
                    onClick={() => openAuthModal("login")}
                    className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Sign in to stamp verified signature</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleRegisterEvidence} className="space-y-6">
                
                {/* Drag and Drop Zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 bg-[#060a15] rounded-xl p-8 text-center cursor-pointer transition-colors duration-200"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleRegFileChange}
                    className="hidden" 
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    {regFile ? (
                      <div>
                        <p className="text-white text-sm font-semibold">{regFile.name}</p>
                        <p className="text-zinc-500 text-xs mt-1 font-mono">Size: {formatBytes(regFile.size)} | Type: {regFile.type || "unknown"}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-zinc-300 text-sm font-medium">Select file to ingest</p>
                        <p className="text-zinc-500 text-xs mt-1">CCTV logs, photos, voice call wav files, cyber audits</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hashing Status */}
                {isHashing && (
                  <div className="flex items-center justify-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>Computing SHA-256 local evidence block cryptographic hash...</span>
                  </div>
                )}

                {regHash && (
                  <div className="bg-[#050914] p-4 rounded-xl border border-zinc-800 space-y-1 font-mono text-xs">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Generated SHA-256 Evidence Hash</span>
                    <div className="text-emerald-400 font-bold select-all break-all text-sm mt-1">{regHash}</div>
                  </div>
                )}

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Case File ID</label>
                    <input 
                      type="text" 
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      placeholder="CASE-2026-XXXX"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Case Folder Name</label>
                    <input 
                      type="text" 
                      value={caseName}
                      onChange={(e) => setCaseName(e.target.value)}
                      placeholder="e.g. Rohini Bank Intrusion"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Investigator-in-Custody</label>
                    <input 
                      type="text" 
                      value={investigator}
                      onChange={(e) => setInvestigator(e.target.value)}
                      placeholder="Name / Officer ID"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Police Unit / Agency</label>
                    <input 
                      type="text" 
                      value={agency}
                      onChange={(e) => setAgency(e.target.value)}
                      placeholder="Delhi Cyber Forensic Unit"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">GPS / Crime Location Coordinates</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="28.6139° N, 77.2090° E"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Origin Recording Hardware Device</label>
                    <input 
                      type="text" 
                      value={originDevice}
                      onChange={(e) => setOriginDevice(e.target.value)}
                      placeholder="CCTV Camera 4 Model B"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!regHash}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg font-mono text-sm font-semibold tracking-wider transition-colors text-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  MINT IMMUTABLE LEDGER BLOCK
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: LOG CUSTODY HANDOVER */}
          {activeTab === "transfer" && (
            <div className="cyber-card rounded-xl p-6 md:p-8 space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-emerald-400" /> Log custody transfer event
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Authenticate handover of physical evidence files to forensic laboratories, courts, or senior inspectors, maintaining complete audits.
                </p>
              </div>

              <form onSubmit={handleTransferCustody} className="space-y-6">
                
                {/* Select Evidence Item */}
                <div className="space-y-1">
                  <label className="text-xs font-mono text-zinc-400 block">Select Active Block Evidence</label>
                  <select 
                    value={selectedEvId}
                    onChange={(e) => setSelectedEvId(Number(e.target.value))}
                    className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="-1">-- Choose Evidence file --</option>
                    {ledger.map((item) => (
                      <option key={item.index} value={item.index}>
                        #{item.index} | {item.fileName} ({item.caseId})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEvId >= 0 && (
                  <div className="bg-[#050914] p-3 rounded-lg border border-zinc-900 text-xs font-mono space-y-1 text-zinc-400">
                    <div>
                      <span className="text-zinc-500 uppercase text-[9px] w-28 inline-block">Registered Case:</span>
                      <span className="text-white">{ledger[selectedEvId].caseName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase text-[9px] w-28 inline-block">File Hash:</span>
                      <span className="text-zinc-400 select-all break-all">{ledger[selectedEvId].hash}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase text-[9px] w-28 inline-block">Current Custodian:</span>
                      <span className="text-emerald-400">
                        {ledger[selectedEvId].transfers.length > 0 
                          ? ledger[selectedEvId].transfers[ledger[selectedEvId].transfers.length - 1].toUser
                          : ledger[selectedEvId].investigator
                        }
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Receiver Official Name</label>
                    <input 
                      type="text" 
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="e.g. Dr. Sunita Mehta"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-zinc-400 block">Receiver Agency</label>
                    <input 
                      type="text" 
                      value={transferAgency}
                      onChange={(e) => setTransferAgency(e.target.value)}
                      placeholder="e.g. Central Forensic Lab"
                      className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-zinc-400 block">Custody Handover Purpose / Remarks</label>
                  <textarea 
                    value={transferPurpose}
                    onChange={(e) => setTransferPurpose(e.target.value)}
                    placeholder="Extract data records, present to judicial court, cloning forensic harddrive..."
                    rows={3}
                    className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Digital Handover Signature */}
                <div className="bg-[#050914] p-3 rounded-lg border border-zinc-900 text-xs font-mono text-zinc-500">
                  Authentication: The handover will be cryptographically signed by current custodian credentials.
                </div>

                <button
                  type="submit"
                  disabled={selectedEvId < 0 || !transferTo || !transferAgency}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg font-mono text-sm font-semibold tracking-wider transition-colors text-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  SIGN & LOG TRANSFER BLOCKS
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: COURTROOM VERIFICATION PORTAL */}
          {activeTab === "verify" && (
            <div className="space-y-6">
              <div className="cyber-card rounded-xl p-6 md:p-8 space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-400" /> Courtroom Evidence Integrity Verification
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Drag and drop digital files to instantly cross-verify their cryptographic hash against the immutable ledger blocks.
                  </p>
                </div>

                {/* Upload verify box */}
                <div 
                  onClick={() => verInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 bg-[#060a15] rounded-xl p-10 text-center cursor-pointer transition-colors duration-200"
                >
                  <input 
                    type="file" 
                    ref={verInputRef} 
                    onChange={handleVerifyFileChange}
                    className="hidden" 
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400">
                      <FolderLock className="h-6 w-6" />
                    </div>
                    {verFile ? (
                      <div>
                        <p className="text-white text-sm font-semibold">{verFile.name}</p>
                        <p className="text-zinc-500 text-xs mt-1 font-mono">Calculated Hash: {verHash.slice(0, 16)}...</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-zinc-300 text-sm font-medium">Verify Evidence Authenticity</p>
                        <p className="text-zinc-500 text-xs mt-1">Drop the evidence file here to verify mathematical integrity</p>
                      </div>
                    )}
                  </div>
                </div>

                {isVerifying && (
                  <div className="flex items-center justify-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>Analyzing cryptographic blocks...</span>
                  </div>
                )}
              </div>

              {/* Verification Feedback Screens */}
              {verificationResult.status !== "idle" && (
                <div className={`cyber-card rounded-xl p-6 border relative overflow-hidden transition-all duration-300 ${
                  verificationResult.status === "authentic" 
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : verificationResult.status === "tampered"
                    ? "border-red-500/30 bg-red-500/[0.02]"
                    : "border-zinc-800 bg-zinc-900/20"
                }`}>
                  
                  {/* Scan line effect for visual flair */}
                  {verificationResult.status === "authentic" && <div className="scan-line" />}
                  {verificationResult.status === "tampered" && <div className="scan-line-danger" />}

                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0">
                      {verificationResult.status === "authentic" && (
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="h-7 w-7" />
                        </div>
                      )}
                      {verificationResult.status === "tampered" && (
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl flex items-center justify-center animate-bounce">
                          <AlertTriangle className="h-7 w-7" />
                        </div>
                      )}
                      {verificationResult.status === "not_found" && (
                        <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-xl flex items-center justify-center">
                          <HelpCircle className="h-7 w-7" />
                        </div>
                      )}
                    </div>

                    <div className="flex-grow space-y-4">
                      <div>
                        {verificationResult.status === "authentic" && (
                          <>
                            <h4 className="text-lg font-bold text-emerald-400">CRYPTOGRAPHIC INTEGRITY CONFIRMED</h4>
                            <p className="text-xs text-zinc-400 mt-1">This evidence matches block record #{verificationResult.matchedBlock?.index} precisely. Integrity verified. No tampering detected.</p>
                          </>
                        )}
                        {verificationResult.status === "tampered" && (
                          <>
                            <h4 className="text-lg font-bold text-red-500 animate-pulse">WARNING: FILE TAMPERING DETECTED</h4>
                            <p className="text-xs text-zinc-400 mt-1">File name mismatch detected. The hash calculated from the uploaded file does not match the immutable ledger block fingerprint.</p>
                          </>
                        )}
                        {verificationResult.status === "not_found" && (
                          <>
                            <h4 className="text-lg font-bold text-zinc-300">BLOCK RECORD NOT FOUND</h4>
                            <p className="text-xs text-zinc-400 mt-1">This cryptographic hash is not registered on the current blockchain ledger. File is untracked.</p>
                          </>
                        )}
                      </div>

                      {/* Details of discrepancy */}
                      <div className="bg-[#050914] p-4 rounded-lg border border-zinc-900 space-y-2 font-mono text-xs">
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 border-b border-zinc-900 pb-1 uppercase font-bold tracking-wider">
                          <span>Verification Report</span>
                          <span>{new Date().toISOString().replace("T", " ").substr(0, 19)}</span>
                        </div>
                        <div className="flex gap-2 text-zinc-400">
                          <span className="text-zinc-500 uppercase text-[9px] w-28 flex-shrink-0">Calculated Hash:</span>
                          <span className={`${verificationResult.status === "tampered" ? "text-red-400" : "text-white"} break-all select-all font-bold`}>{verificationResult.calculatedHash}</span>
                        </div>
                        
                        {verificationResult.status === "authentic" && (
                          <div className="flex gap-2 text-zinc-400 border-t border-zinc-900 pt-2 mt-2">
                            <span className="text-zinc-500 uppercase text-[9px] w-28 flex-shrink-0">Chained Hash Match:</span>
                            <span className="text-emerald-400 break-all">{verificationResult.matchedBlock?.hash}</span>
                          </div>
                        )}

                        {verificationResult.status === "tampered" && (
                          <div className="flex gap-2 text-zinc-400 border-t border-zinc-900 pt-2 mt-2">
                            <span className="text-zinc-500 uppercase text-[9px] w-28 flex-shrink-0">Ledger Block Hash:</span>
                            <span className="text-emerald-400 break-all select-all">{verificationResult.matchedBlock?.hash}</span>
                          </div>
                        )}
                      </div>

                      {/* Display matched block info if authentic or tampered */}
                      {verificationResult.matchedBlock && (
                        <div className="bg-[#090d1a] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 font-mono grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-zinc-500 text-[9px] block">CASE ID</span>
                            <span className="text-white font-semibold">{verificationResult.matchedBlock.caseId}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px] block">ORIGINAL MINT TIME</span>
                            <span className="text-white">{verificationResult.matchedBlock.timestamp}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px] block">INITIAL CUSTODIAN</span>
                            <span className="text-white">{verificationResult.matchedBlock.investigator}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px] block">UNIT / AGENCY</span>
                            <span className="text-white">{verificationResult.matchedBlock.agency}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INTEGRITY TAMPER LAB */}
          {activeTab === "simulation" && (
            <div className="cyber-card rounded-xl p-6 md:p-8 space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-400 animate-pulse" /> Interactive Cryptographic Integrity Simulation Lab
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Witness how mathematical hashing works. Choose a text file scenario below, modify its character logs directly, and see how the ledger immediately flags the change.
                </p>
              </div>

              {/* Scenario selector tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSimScenario("confession");
                    setSimText("CASE: 2026-089A\nTIMELINE: 18th August 2026\nSUSPECT: Vikram Malbotra\nDECLARATION: I, Vikram Malhotra, voluntarily submit that I was present in the server room at 10:14 PM. However, I did not install the cyber payload. The network log of my keycard entry is correct but the security vault door was already unlatched when I reached.");
                  }}
                  className={`px-3 py-2 rounded-lg font-mono text-xs border transition-all ${
                    simScenario === "confession"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-[#060a15] text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  Scenario A: Suspect confession.txt
                </button>
                <button
                  onClick={() => {
                    setSimScenario("whatsapp");
                    setSimText("WHATSAPP DECRYPTED CHAT DUMP\n[10:12 PM] Suspect A: Package is ready at the station.\n[10:13 PM] Suspect B: Did you clear the cameras?\n[10:15 PM] Suspect A: Yes, camera 3 is disabled for 10 mins. Run it now.");
                  }}
                  className={`px-3 py-2 rounded-lg font-mono text-xs border transition-all ${
                    simScenario === "whatsapp"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-[#060a15] text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  Scenario B: Chat logs.txt
                </button>
              </div>

              {/* Editing Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-mono text-zinc-400 block font-bold">Editable Evidence File Content</span>
                  <p className="text-[11px] text-zinc-500 italic mb-2">Try changing a letter, adding a comma, or adding details to test the hashing engine.</p>
                  <textarea
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    rows={8}
                    className="w-full bg-[#050914] border border-zinc-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 resize-y"
                  />
                </div>

                {/* Cryptographic outputs side-by-side */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-[#050914] p-3 rounded-lg border border-zinc-900">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Registered Original Ledger Hash</span>
                      <div className="text-emerald-400 font-bold select-all break-all mt-1">{simRegisteredHash}</div>
                    </div>

                    <div className="bg-[#050914] p-3 rounded-lg border border-zinc-900">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Computed Real-Time Hash</span>
                      <div className={`${simStatus === "authentic" ? "text-emerald-400" : "text-red-400"} font-bold select-all break-all mt-1`}>{simCurrentHash}</div>
                    </div>
                  </div>

                  {/* Status Box */}
                  <div className={`p-4 rounded-xl border flex items-center space-x-3 transition-colors ${
                    simStatus === "authentic"
                      ? "bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/[0.02] border-red-500/20 text-red-500"
                  }`}>
                    {simStatus === "authentic" ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <span className="text-xs uppercase font-bold tracking-wider block">Integrity Status: Secure</span>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">Calculated file fingerprint matches block fingerprint perfectly.</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-bounce" />
                        <div>
                          <span className="text-xs uppercase font-bold tracking-wider block">Integrity Status: Tampered</span>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">Alert! Hash modified. Defense lawyers can throw evidence out.</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-[#090d1a] border-t border-zinc-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-500 font-mono">
          BlockEvid Digital Evidence Network Ledger &copy; {new Date().getFullYear()} - Cryptographic Hashing Secured by Web Crypto API.
        </div>
      </footer>
    </div>
  );
}
