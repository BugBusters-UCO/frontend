"use client";

import { useState } from "react";
import { useAuth } from "@/shared/lib/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ email, password });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to login");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative p-4 md:p-8 overflow-hidden">
      {/* Grid Pattern overlay for tech feel */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA0MEwwIDAgNDAgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] opacity-50 pointer-events-none" />

      {/* Main Split Layout Card */}
      <div className="z-10 w-full max-w-5xl bg-surface/60 backdrop-blur-xl rounded-3xl border border-border-subtle overflow-hidden flex flex-col md:flex-row min-h-[600px] shadow-2xl shadow-black/50">
        
        {/* Left Section - Branding & Illustration */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-surface-container-lowest p-12 border-r border-border-subtle relative overflow-hidden">
          
          {/* Main Illustration Background */}
          <div className="absolute inset-0 pointer-events-none">
            <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Cyber Security Illustration" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/80 to-transparent" />
          </div>

          <div className="relative z-10">
            <div className="w-14 h-14 bg-surface-container-high border border-border-subtle rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
            </div>
            <h1 className="text-4xl font-sans font-bold text-text-primary tracking-tight mb-2">BugBusters</h1>
            <p className="text-text-secondary font-mono text-sm tracking-widest uppercase">Security Command Center</p>
          </div>
          
          <div className="relative z-10 mt-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-border-subtle mb-4">
              <div className="w-2 h-2 rounded-full bg-severity-low animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-text-primary">System Operational</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm mb-8">
              Advanced continuous security monitoring. Safeguard your infrastructure with real-time enterprise-grade vulnerability management.
            </p>
            
            {/* Logos section */}
            <div className="pt-6 border-t border-border-subtle">
              <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-4">In collaboration with</p>
              <div className="flex items-center gap-4">
                <div className="bg-white/95 p-2 rounded-xl flex items-center justify-center h-12 w-12 shadow-sm">
                  <img src="https://www.google.com/s2/favicons?domain=ucobank.com&sz=128" alt="UCO Bank" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="bg-white/95 p-2 rounded-xl flex items-center justify-center h-12 w-12 shadow-sm">
                  <img src="https://www.google.com/s2/favicons?domain=iba.org.in&sz=128" alt="IBA" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="bg-white/95 p-2 rounded-xl flex items-center justify-center h-12 px-3 shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/en/1/1c/IIT_Kharagpur_Logo.svg" alt="IIT KGP" className="h-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-surface/40">
          <div className="max-w-sm w-full mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-text-primary">System Authentication</h2>

            {error && (
              <div className="bg-severity-critical-bg border border-severity-critical/50 text-severity-critical p-4 rounded-xl mb-6 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-[20px] mt-0.5">warning</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="group">
                <label className="block font-sans text-xs tracking-widest uppercase font-bold text-text-muted mb-2 transition-colors group-focus-within:text-primary">
                  Operator ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px] transition-colors group-focus-within:text-primary">
                    badge
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full bg-surface-container-lowest border border-border-subtle rounded-xl pl-11 pr-4 py-3 text-text-primary font-mono text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-all"
                    placeholder="operator@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-sans text-xs tracking-widest uppercase font-bold text-text-muted transition-colors group-focus-within:text-primary">
                    Access Key
                  </label>
                  <a href="#" className="text-xs font-mono text-text-muted hover:text-primary transition-colors">Recover Key</a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px] transition-colors group-focus-within:text-primary">
                    password
                  </span>
                  <input
                    type="password"
                    required
                    className="w-full bg-surface-container-lowest border border-border-subtle rounded-xl pl-11 pr-4 py-3 text-text-primary font-mono text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-all"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`mt-4 w-full bg-primary hover:bg-primary-container text-on-primary font-bold py-3 rounded-xl transition-all duration-300 transform flex justify-center items-center gap-2 group/btn ${
                  isLoading ? "opacity-70 cursor-not-allowed" : "active:scale-[0.98]"
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Authenticating</span>
                  </>
                ) : (
                  <>
                    <span>Initialize Session</span>
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover/btn:translate-x-1">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-border-subtle text-center">
              <p className="text-sm text-text-secondary">
                Unregistered operator?{' '}
                <Link href="/register" className="text-primary hover:text-primary-container font-semibold transition-colors">
                  Request access
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
