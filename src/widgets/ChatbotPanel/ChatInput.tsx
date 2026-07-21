"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChatbot } from "@/features/chatbot/ChatbotContext";
import { SpeechOverlay } from "./SpeechOverlay";

function deepTruncateArrays(obj: any, limit = 5): any {
  if (Array.isArray(obj)) {
    const truncated = obj.slice(0, limit).map((item: any) => deepTruncateArrays(item, limit));
    if (obj.length > limit) {
      truncated.push({ note: `... ${obj.length - limit} more items omitted for context size limit` });
    }
    return truncated;
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = deepTruncateArrays(obj[key], limit);
    }
    return result;
  }
  return obj;
}

export function ChatInput() {
  const { addMessage, appendToLastMessage, pageContext, messages, isTyping, setIsTyping, selectedTopic, isTtsAutoEnabled } = useChatbot();
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const submitRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInput(currentTranscript);
          transcriptRef.current = currentTranscript;
        };
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        recognition.onend = () => {
          setIsListening(false);
          if (transcriptRef.current.trim()) {
            setTimeout(() => {
              submitRef.current?.();
            }, 50);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleMic = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!input.trim()) setInput(""); // Clear input when starting fresh
      recognitionRef.current?.start();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;
    
    // Clear transcript ref so it doesn't auto-submit stale data next time
    transcriptRef.current = "";

    const userText = input.trim();
    setInput("");
    
    addMessage({
      role: "user",
      content: userText,
    });
    
    setIsTyping(true);

    try {
      // Create payload. Add system instructions dynamically based on page context if not in message list
      const payloadMessages = [...messages, { role: "user", content: userText }];

      let filteredContext: any = null;
      if (pageContext) {
        if (selectedTopic === "all") {
          filteredContext = pageContext;
        } else {
          filteredContext = {};
          const baseKeys = ['page', 'jobId', 'assessmentId', 'status', 'sourceLabel', 'summary', 'findings'];
          
          // Always include base metadata and summary/findings if they exist at top level or inside result
          baseKeys.forEach(k => {
            if (pageContext[k] !== undefined) filteredContext[k] = pageContext[k];
            else if (pageContext.result && pageContext.result[k] !== undefined) filteredContext[k] = pageContext.result[k];
          });
          
          // Include selected topic data if not basic
          if (selectedTopic !== "basic") {
            const topics = selectedTopic.split(',');
            topics.forEach(t => {
              const key = t.trim();
              if (pageContext[key]) {
                filteredContext[key] = pageContext[key];
              } else if (pageContext.result && pageContext.result[key]) {
                filteredContext[key] = pageContext.result[key];
              }
            });
          }
        }
      }

      // Truncate any arrays within the context to prevent token limit errors
      const truncatedContext = filteredContext ? deepTruncateArrays(filteredContext, 5) : null;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages.filter(m => m.role !== 'system'), // filter out local sys notes from api call if desired, or let backend handle
          pageContext: truncatedContext,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to communicate with AI";
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {}
        
        addMessage({
          role: "system",
          content: `Error: ${errorMsg}`,
        });
        setIsTyping(false);
        return;
      }

      // Initialize the model's message
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addMessage({
        id: messageId,
        role: "model",
        content: "",
      });

      setIsTyping(false); // Stop typing indicator since we are streaming

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let done = false;
        let buffer = "";
        let fullResponse = "";
        let ttsBuffer = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              const message = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              if (message.startsWith("data: ")) {
                const dataStr = message.slice(6);
                if (dataStr === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const data = JSON.parse(dataStr);
                  if (data.text) {
                    appendToLastMessage(data.text);
                    fullResponse += data.text;
                    
                    if (isTtsAutoEnabled) {
                      ttsBuffer += data.text;
                      // Split by sentence boundaries (. ? ! followed by space, or newline)
                      const match = ttsBuffer.match(/([.?!])(\s+)|\n/);
                      if (match && match.index !== undefined) {
                        const splitIndex = match.index + match[0].length;
                        const chunk = ttsBuffer.slice(0, splitIndex);
                        ttsBuffer = ttsBuffer.slice(splitIndex);
                        
                        if (chunk.trim()) {
                          window.dispatchEvent(new CustomEvent('chatbot-auto-read-chunk', { 
                            detail: { id: messageId, text: chunk } 
                          }));
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error("Failed to parse SSE data", e);
                }
              }

              boundary = buffer.indexOf("\n\n");
            }
          }
        }

        // Flush any remaining text for TTS
        if (isTtsAutoEnabled && ttsBuffer.trim()) {
          window.dispatchEvent(new CustomEvent('chatbot-auto-read-chunk', { 
            detail: { id: messageId, text: ttsBuffer } 
          }));
        }
      }
    } catch (err) {
      addMessage({
        role: "system",
        content: "Error: Failed to connect to server.",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  submitRef.current = handleSubmit;

  return (
    <>
      <SpeechOverlay 
        isListening={isListening} 
        transcript={input} 
        onStop={() => {
          recognitionRef.current?.stop();
          setIsListening(false);
        }} 
      />
      <div className="border-t border-border-divider bg-surface p-4 z-10 relative">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask BugBusters AI..."
          className="flex-1 max-h-32 min-h-12 resize-none rounded-xl border border-border-subtle bg-surface-container px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          disabled={isTyping}
          rows={1}
        />
        <button
          type="button"
          onClick={toggleMic}
          className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
            isListening 
              ? "bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-500/50" 
              : "bg-surface-container-high text-text-secondary hover:bg-border-subtle"
          }`}
          title="Voice Input"
        >
          {isListening && (
            <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping"></span>
          )}
          <span className={`material-symbols-outlined relative z-10 ${isListening ? 'animate-pulse' : ''}`}>mic</span>
        </button>
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
    </>
  );
}
