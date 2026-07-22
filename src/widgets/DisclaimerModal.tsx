import React, { useEffect, useState } from "react";
import { setCookie, getCookie } from "cookies-next";

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has opted out of seeing the disclaimer
    const hideDisclaimer = getCookie("hide_disclaimer");
    if (!hideDisclaimer) {
      // Small delay to ensure smooth rendering before popping up
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDontShowAgain = () => {
    // Save preference for 1 year (365 days)
    setCookie("hide_disclaimer", "true", { maxAge: 60 * 60 * 24 * 365 });
    setIsOpen(false);
  };

  const handleUnderstood = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300">
      <div className="bg-surface transition-colors duration-300 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-border-divider animate-in zoom-in-95 duration-300">
        <div className="p-6 @md:p-8 flex-1 overflow-y-auto max-h-[80vh]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px] text-primary-container">shield_locked</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-1">Data Privacy & Security Disclaimer</h2>
              <p className="text-sm text-text-secondary">Important information regarding how BugBusters handles your data.</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-text-secondary">
            <div className="p-4 bg-surface-container border border-border-subtle rounded-2xl">
              <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">policy</span>
                Our Commitment to Absolute Transparency
              </h3>
              <p className="text-text-secondary leading-relaxed">
                BugBusters operates a highly distributed microservices architecture (Node.js & Python FastAPI) to provide enterprise-grade vulnerability management, cryptographic analysis (TLS/PQC), and asset discovery. We believe in complete transparency regarding how your code and data are handled.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-text-primary mb-4">Exactly how we process your data:</h3>
              <ul className="space-y-5 list-none pl-1">
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-severity-low/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-severity-low text-[18px]">memory</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block mb-1 text-[15px]">Ephemeral Source Code Scanning</strong>
                    <span className="leading-relaxed block">Your source code is cloned strictly into memory within our isolated, purpose-built FastAPI micro-scanners (Dependency, Secret, and Config Scanners). <strong>We never write your raw source code to disk</strong>, and the memory instance is instantly wiped the millisecond the scan completes.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-severity-low/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-severity-low text-[18px]">smart_toy</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block mb-1 text-[15px]">Strict LLM & AI Privacy (Groq Cloud)</strong>
                    <span className="leading-relaxed block">We utilize external LLMs (Groq Cloud) to generate actionable remediation steps. <strong>Your source code is never sent to the AI.</strong> Only anonymized metadata (like CVE IDs, package names, and redacted stack traces) are transmitted. Any discovered secrets are entirely stripped before AI processing.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-severity-low/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-severity-low text-[18px]">lock</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block mb-1 text-[15px]">Secret Hashing & Redaction</strong>
                    <span className="leading-relaxed block">If our Secret Scanner detects hardcoded API keys or credentials, they are immediately hashed (SHA-256) or masked (e.g., <code>ak_***9xq</code>). Raw active secrets are <strong>never stored</strong> in our MongoDB Atlas database or logged to our consoles.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-severity-low/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-severity-low text-[18px]">database</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block mb-1 text-[15px]">Secure Storage & Telemetry</strong>
                    <span className="leading-relaxed block">Extracted risk reports and metadata are securely stored in MongoDB Atlas (encrypted at rest). Volatile session data uses Redis Cloud. Real-time scanning telemetry from local VM Agents is transmitted exclusively over encrypted WebSockets (WSS).</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-surface-container-lowest border border-border-divider rounded-2xl">
              <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-severity-medium">gpp_maybe</span>
                Access & Revocation
              </h3>
              <p className="leading-relaxed">
                Authentication relies on TTL-based OTPs and strictly scoped JWTs routed through our Security Proxy (WAF). You retain absolute control—any connected VM agents or repository access tokens can be instantly revoked from your dashboard, immediately severing all access.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-surface-container-lowest border-t border-border-divider flex flex-col-reverse @sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={handleDontShowAgain}
            className="text-text-secondary hover:text-text-primary font-medium text-sm transition-colors flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">visibility_off</span>
            Don't Show Again
          </button>
          <button 
            onClick={handleUnderstood}
            className="w-full @sm:w-auto bg-primary-container hover:bg-primary-container/90 text-white font-semibold py-2.5 px-8 rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
