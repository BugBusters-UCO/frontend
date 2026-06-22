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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-surface-container-lowest">
      <div className="bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-container to-[#60a5fa]"></div>
        
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-primary-container/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-container text-2xl">shield_person</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center text-text-primary tracking-tight">Welcome back</h1>
        <p className="text-center text-text-secondary mb-8 text-body-sm">Sign in to your BugBusters account</p>

        {error && (
          <div className="bg-error-container/50 border border-[#ffb4ab] text-on-error-container p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="group">
            <label className="block text-sm font-semibold text-text-primary mb-1.5 transition-colors group-focus-within:text-primary-container">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">mail</span>
              <input
                type="email"
                required
                className="w-full bg-surface-container-lowest border border-border-subtle rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="group">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-text-primary transition-colors group-focus-within:text-primary-container">Password</label>
              <a href="#" className="text-xs text-primary-container hover:underline font-medium">Forgot password?</a>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">lock</span>
              <input
                type="password"
                required
                className="w-full bg-surface-container-lowest border border-border-subtle rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary-container text-white font-medium py-2.5 rounded-lg hover:bg-[#195fca] transition-all transform active:scale-[0.98] mt-2 shadow-sm"
          >
            Sign In
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-text-secondary">
          Don't have an account? <Link href="/register" className="text-primary-container font-semibold hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
