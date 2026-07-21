"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: number;
}

interface ChatbotContextProps {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp"> & { id?: string }) => void;
  appendToLastMessage: (chunk: string) => void;
  pageContext: any;
  setPageContext: (ctx: any) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  isTtsAutoEnabled: boolean;
  setIsTtsAutoEnabled: (enabled: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextProps | undefined>(undefined);

export const ChatbotProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "model",
      content: "Hello! I'm BugBusters AI. How can I help you understand your security posture today?",
      timestamp: Date.now(),
    }
  ]);
  const [pageContext, setPageContextState] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [panelWidth, setPanelWidth] = useState(30); // 30vw default width
  const [selectedTopic, setSelectedTopic] = useState("basic");
  const [isTtsAutoEnabled, setIsTtsAutoEnabled] = useState(false);

  useEffect(() => {
    if (pageContext) {
      setSelectedTopic(pageContext.summary ? "summary" : "basic");
    }
  }, [pageContext?.page, pageContext?.jobId]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const setPageContext = useCallback((ctx: any) => {
    setPageContextState((prevCtx: any) => {
      return ctx;
    });
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp"> & { id?: string }) => {
    setMessages((prev) => {
      // Keep only last 20 messages to manage token limits (excluding system role instructions which are separate)
      const newMessages = [
        ...prev,
        {
          ...msg,
          id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        }
      ];
      // Keep at most 30 to allow long threads, backend will trim to last 10-15 for the API
      if (newMessages.length > 30) {
        return newMessages.slice(newMessages.length - 30);
      }
      return newMessages;
    });
  }, []);

  const appendToLastMessage = useCallback((chunk: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      newMessages[lastIndex] = {
        ...newMessages[lastIndex],
        content: newMessages[lastIndex].content + chunk
      };
      return newMessages;
    });
  }, []);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        messages,
        addMessage,
        appendToLastMessage,
        pageContext,
        setPageContext,
        isTyping,
        setIsTyping,
        panelWidth,
        setPanelWidth,
        selectedTopic,
        setSelectedTopic,
        isTtsAutoEnabled,
        setIsTtsAutoEnabled,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
};

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
};
