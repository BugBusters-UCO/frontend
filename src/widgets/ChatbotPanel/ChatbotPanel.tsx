"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatbot } from "@/features/chatbot/ChatbotContext";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function ChatbotPanel() {
  const { isOpen, close, messages, isTyping, pageContext, panelWidth, setPanelWidth, selectedTopic, setSelectedTopic } = useChatbot();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isResizing, setIsResizing] = useState(false);

  // Auto-scroll to bottom when messages change
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidthVw = 100 - (e.clientX / window.innerWidth) * 100;
      const clampedWidth = Math.min(Math.max(newWidthVw, 20), 40);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, setPanelWidth]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.5 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          style={{ width: isOpen ? `${panelWidth}vw` : 'auto' }}
          className="fixed top-16 right-0 bottom-0 z-40 flex flex-col border-l border-border-divider bg-surface-container-lowest shadow-2xl max-sm:!w-full"
        >
          {/* Resize Handle */}
          <div 
            className="absolute top-0 bottom-0 left-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-50 group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-12 bg-border-divider group-hover:bg-primary rounded-full transition-colors" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-divider bg-surface-container-lowest px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(31,111,235,0.2)]">
                <span className="material-symbols-outlined text-sm font-bold">security</span>
              </div>
              <h2 className="font-sans font-bold tracking-wider text-text-primary text-sm">BUGBUSTERS AI</h2>
            </div>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-dim hover:text-text-primary"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Context Indicator Pill */}
          {pageContext && pageContext.page && (
            <div className="flex flex-col bg-surface-container-lowest border-b border-border-divider">
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-1.5 rounded-full bg-surface-dim px-3 py-1 border border-border-divider text-xs text-text-secondary shadow-inner">
                  <span className="material-symbols-outlined text-[14px] text-primary/70">location_on</span>
                  <span>Context: <strong className="text-text-primary">{pageContext.page}</strong></span>
                </div>
              </div>
              
              {/* Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
                <button
                  onClick={() => setSelectedTopic("basic")}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedTopic === "basic" 
                      ? "bg-primary/20 text-primary border-primary/50" 
                      : "bg-surface text-text-secondary border-border-subtle hover:border-border-divider"
                  }`}
                >
                  Basic Info
                </button>
                
                {Object.keys(pageContext)
                  .filter(k => !['page', 'jobId', 'assessmentId', 'status', 'sourceLabel'].includes(k) && pageContext[k])
                  .map(topic => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border capitalize transition-colors ${
                        selectedTopic === topic 
                          ? "bg-primary/20 text-primary border-primary/50" 
                          : "bg-surface text-text-secondary border-border-subtle hover:border-border-divider"
                      }`}
                    >
                      {topic.replace(/([A-Z])/g, ' $1').trim()}
                    </button>
                  ))
                }
                
                <button
                  onClick={() => setSelectedTopic("all")}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedTopic === "all" 
                      ? "bg-primary/20 text-primary border-primary/50" 
                      : "bg-surface text-text-secondary border-border-subtle hover:border-border-divider"
                  }`}
                >
                  All Data
                </button>
              </div>
            </div>
          )}

          {/* Messages List */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 scroll-smooth"
          >
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            
            {isTyping && (
              <div className="flex w-full justify-start mb-4">
                <div className="flex max-w-[85%] gap-3 flex-row">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(31,111,235,0.15)]">
                    <span className="material-symbols-outlined text-sm">security</span>
                  </div>
                  <div className="rounded-2xl px-4 py-3 text-sm bg-surface-container text-text-primary rounded-tl-none border border-border-subtle">
                    <div className="flex gap-1 items-center h-5">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <ChatInput />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
