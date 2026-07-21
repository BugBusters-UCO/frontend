"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage as ChatMessageType } from "@/features/chatbot/ChatbotContext";

interface ChatMessageProps {
  message: ChatMessageType;
}

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/__(.*?)__/g, '$1') // bold
    .replace(/_(.*?)_/g, '$1') // italic
    .replace(/`(.*?)`/g, '$1') // inline code
    .replace(/```[\s\S]*?```/g, 'code block omitted') // block code
    .replace(/#(.*?)\n/g, '$1\n') // headings
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/[-*]\s/g, '') // list items
    .replace(/\n/g, ' ') // newlines
    .trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const isMutedRef = useRef(false);

  const playChunk = (text: string) => {
    const textToSpeak = stripMarkdown(text);
    if (!textToSpeak) return;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0; // Normal speed
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      // Small timeout to allow next chunk's onstart to fire if queued
      setTimeout(() => {
        setIsPlaying(window.speechSynthesis.speaking);
      }, 50);
    };
    utterance.onerror = () => setIsPlaying(window.speechSynthesis.speaking);
    window.speechSynthesis.speak(utterance);
  };

  const playTts = () => {
    isMutedRef.current = false;
    if (isPlaying) return;
    playChunk(message.content);
  };

  const stopTts = () => {
    isMutedRef.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const toggleTts = () => {
    if (isPlaying) stopTts();
    else playTts();
  };

  useEffect(() => {
    const handleAutoReadChunk = (e: any) => {
      if (e.detail.id === message.id && !isMutedRef.current) {
        playChunk(e.detail.text);
      }
    };
    window.addEventListener('chatbot-auto-read-chunk', handleAutoReadChunk);
    return () => window.removeEventListener('chatbot-auto-read-chunk', handleAutoReadChunk);
  }, [message.id]);
  if (message.role === "system") {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-surface-container rounded-full px-4 py-1 text-xs text-text-muted border border-border-subtle">
          {message.content}
        </div>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-[85%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Avatar */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-surface-container-high text-text-secondary border border-border-divider" : "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(31,111,235,0.15)]"
        }`}>
          <span className="material-symbols-outlined text-sm">
            {isUser ? "person" : "security"}
          </span>
        </div>

        {/* Bubble(s) */}
        <div className={`text-sm ${
          isUser 
            ? "rounded-2xl px-4 py-3 shadow-sm bg-surface-dim text-text-primary rounded-tr-none border border-border-divider" 
            : "w-full"
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-text-primary flex flex-col gap-2
              prose-p:bg-primary/5 prose-p:px-4 prose-p:py-3 prose-p:rounded-2xl prose-p:rounded-tl-none prose-p:border prose-p:border-primary/20 prose-p:shadow-sm prose-p:leading-relaxed prose-p:my-0
              prose-ul:bg-primary/5 prose-ul:px-8 prose-ul:py-3 prose-ul:rounded-2xl prose-ul:rounded-tl-none prose-ul:border prose-ul:border-primary/20 prose-ul:shadow-sm prose-ul:my-0
              prose-ol:bg-primary/5 prose-ol:px-8 prose-ol:py-3 prose-ol:rounded-2xl prose-ol:rounded-tl-none prose-ol:border prose-ol:border-primary/20 prose-ol:shadow-sm prose-ol:my-0
              prose-pre:bg-surface-dim prose-pre:px-4 prose-pre:py-3 prose-pre:rounded-2xl prose-pre:rounded-tl-none prose-pre:border prose-pre:border-border-divider prose-pre:shadow-sm prose-pre:my-0
              prose-headings:bg-primary/10 prose-headings:px-4 prose-headings:py-2 prose-headings:rounded-2xl prose-headings:rounded-tl-none prose-headings:border prose-headings:border-primary/20 prose-headings:shadow-sm prose-headings:my-0 prose-headings:font-semibold
            ">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          {!isUser && (
            <div className="flex justify-start gap-1 mt-1 pl-2">
              <button 
                onClick={() => navigator.clipboard.writeText(message.content)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary"
                title="Copy response"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
              <button 
                onClick={toggleTts}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                  isPlaying 
                    ? "bg-primary/20 text-primary" 
                    : "text-text-secondary hover:bg-surface-container hover:text-text-primary"
                }`}
                title={isPlaying ? "Stop reading" : "Read aloud"}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isPlaying ? "stop_circle" : "volume_up"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
