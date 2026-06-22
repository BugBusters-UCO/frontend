"use client";

import React, { useState, useRef, useEffect } from "react";

export interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-surface-container-lowest border ${
          isOpen ? "border-primary-container ring-1 ring-primary-container" : "border-border-subtle"
        } rounded-lg px-4 py-2.5 text-left text-body-sm flex items-center justify-between transition-all duration-200 outline-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary-container cursor-pointer"
        }`}
      >
        <span className={`truncate ${!selectedOption ? "text-text-muted" : "text-text-primary"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[20px] text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-border-subtle rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 py-1.5">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-body-sm text-text-muted text-center">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-body-sm cursor-pointer transition-colors flex items-center justify-between ${
                  value === option.value
                    ? "bg-primary-container/10 text-primary-container font-medium"
                    : "text-text-primary hover:bg-surface-container-low"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
