import React, { useEffect, useState } from "react";
import { fetchCipherExplanation } from "@/shared/api/client";
import { Info } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AiExplanationProps {
  jobId: string;
  sectionId: string;
  data: any;
  title?: string;
  className?: string;
}

export function AiExplanation({ jobId, sectionId, data, title = "Simplified Explanation", className = "" }: AiExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // We stringify the data to use it in dependency array safely, 
    // but we pass the raw object to the fetcher
    const payload = data;
    
    fetchCipherExplanation(jobId, sectionId, payload)
      .then(res => {
        if (isMounted) {
          setExplanation(res.explanation);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch simplified explanation:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [jobId, sectionId, JSON.stringify(data)]);

  if (loading) {
    return (
      <div className={`p-5 rounded-xl bg-surface-container/40 border border-border-divider/40 animate-pulse ${className}`}>
        <div className="flex items-center gap-2 mb-3 text-text-muted">
          <Info className="w-4 h-4" />
          <div className="h-4 w-32 bg-surface-container-high rounded"></div>
        </div>
        <div className="space-y-2.5">
          <div className="h-3.5 w-full bg-surface-container-high rounded"></div>
          <div className="h-3.5 w-[90%] bg-surface-container-high rounded"></div>
          <div className="h-3.5 w-[60%] bg-surface-container-high rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !explanation) {
    return null; // Fail silently to not disrupt the UI, falling back to raw data if implemented
  }

  return (
    <div className={`p-5 rounded-xl bg-surface-container-low/40 border border-border-divider/50 ${className}`}>
      <div className="flex items-center gap-2 mb-3 text-text-primary">
        <Info className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold tracking-wide">{title}</h4>
      </div>
      <div className="text-body-sm text-text-secondary leading-relaxed [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-3 [&>ul>li]:mb-1 [&>strong]:font-semibold [&>strong]:text-text-primary">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    </div>
  );
}
