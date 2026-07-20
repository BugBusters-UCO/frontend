"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage as ChatMessageType } from "@/features/chatbot/ChatbotContext";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
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
        </div>
      </div>
    </div>
  );
}
