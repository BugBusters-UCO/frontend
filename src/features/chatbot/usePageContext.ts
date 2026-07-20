"use client";

import { useEffect, useRef } from "react";
import { useChatbot } from "./ChatbotContext";

export function usePageContext(contextData: any) {
  const { setPageContext } = useChatbot();
  const contextDataRef = useRef(contextData);

  useEffect(() => {
    // Only update if the serialized string changes to prevent infinite loops
    if (JSON.stringify(contextDataRef.current) !== JSON.stringify(contextData)) {
      contextDataRef.current = contextData;
      setPageContext(contextData);
    }
  }, [contextData, setPageContext]);

  // Initial set
  useEffect(() => {
    setPageContext(contextDataRef.current);
  }, [setPageContext]);
}
