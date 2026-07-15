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
        <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[80vh]">
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
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <h3 className="text-base font-bold text-blue-900 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">policy</span>
                Our Commitment to Integrity
              </h3>
              <p className="text-blue-800 leading-relaxed">
                At BugBusters, your project's integrity is our absolute priority. This dashboard provides deep security analysis across your dependencies, configurations, secrets, and architecture. To do this, we need temporary read access to your repositories.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-text-primary mb-3">How we use your data:</h3>
              <ul className="space-y-3 list-none pl-1">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <span><strong>Scanning Only:</strong> Your source code and configurations are pulled exclusively into our isolated, ephemeral scanning containers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <span><strong>No Permanent Storage:</strong> We do not permanently store your source code. Once a scan is completed and facts are extracted (like dependency versions or redacted config keys), the cloned repository is immediately destroyed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <span><strong>Secret Redaction:</strong> Any discovered hardcoded secrets are redacted or hashed before being logged or stored in the database. We will never display raw active secrets in plain text.</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-text-primary mb-2">How safe is it?</h3>
              <p className="leading-relaxed">
                Our infrastructure operates inside a secure sandbox. The token you provide via GitHub OAuth is strictly scoped and encrypted at rest. You can revoke this token from your GitHub settings at any time, instantly severing our access.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-surface-container-lowest border-t border-border-divider flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={handleDontShowAgain}
            className="text-text-secondary hover:text-text-primary font-medium text-sm transition-colors flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">visibility_off</span>
            Don't Show Again
          </button>
          <button 
            onClick={handleUnderstood}
            className="w-full sm:w-auto bg-primary-container hover:bg-primary-container/90 text-white font-semibold py-2.5 px-8 rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
