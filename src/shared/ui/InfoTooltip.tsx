"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
      setShow(true);
    }
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <div className="inline-flex items-center ml-1.5 align-middle cursor-help">
      <span 
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="material-symbols-outlined text-[16px] text-text-muted hover:text-primary transition-colors"
      >
        info
      </span>
      {mounted && show && createPortal(
        <div 
          className="fixed -translate-x-1/2 -translate-y-full w-48 p-2 bg-slate-800 text-white text-[11px] leading-snug font-normal rounded-md z-[9999] shadow-lg text-center pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>,
        document.body
      )}
    </div>
  );
}
