"use client";

import React, { useState } from "react";
import { useChatbot } from "@/features/chatbot/ChatbotContext";

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
  const { addMessage, appendToLastMessage, pageContext, messages, isTyping, setIsTyping, selectedTopic } = useChatbot();
  const [input, setInput] = useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

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
      addMessage({
        role: "model",
        content: "",
      });

      setIsTyping(false); // Stop typing indicator since we are streaming

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let done = false;
        let buffer = "";

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
                  }
                } catch (e) {
                  console.error("Failed to parse SSE data", e);
                }
              }

              boundary = buffer.indexOf("\n\n");
            }
          }
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

  return (
    <div className="border-t border-border-divider bg-surface p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
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
          type="submit"
          disabled={!input.trim() || isTyping}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  );
}
