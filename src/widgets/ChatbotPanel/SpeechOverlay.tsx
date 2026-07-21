"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpeechOverlayProps {
  isListening: boolean;
  transcript: string;
  onStop: () => void;
}

export function SpeechOverlay({ isListening, transcript, onStop }: SpeechOverlayProps) {
  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-surface-container-lowest/80 backdrop-blur-xl"
          onClick={onStop}
        >
          <div className="flex flex-col items-center gap-8 w-full px-8 max-w-md">
            {/* Google Assistant style bouncing dots */}
            <div className="flex items-center gap-3 h-16">
              {[
                "bg-[#4285F4]", // Blue
                "bg-[#EA4335]", // Red
                "bg-[#FBBC05]", // Yellow
                "bg-[#34A853]"  // Green
              ].map((color, i) => (
                <motion.div
                  key={color}
                  className={`w-4 h-4 rounded-full ${color} shadow-lg`}
                  animate={{
                    y: ["0%", "-100%", "0%"],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>

            {/* Live Transcript Display */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full text-center"
            >
              <h3 className="text-xl font-medium text-text-primary mb-4">Listening...</h3>
              <div className="text-lg text-text-secondary min-h-[60px] italic break-words">
                {transcript || "Speak now..."}
              </div>
            </motion.div>
            
            <p className="text-xs text-text-muted mt-8">Tap anywhere to stop</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
