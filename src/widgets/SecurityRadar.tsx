"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";

interface Blip {
  x: number;
  y: number;
  type: "safe" | "threat";
  createdAt: number;
  angle: number;
  distance: number;
}

const staticBackends = [
  { angle: Math.PI / 4, distance: 0.5 },
  { angle: Math.PI, distance: 0.7 },
  { angle: Math.PI * 1.5, distance: 0.3 },
  { angle: Math.PI * 1.8, distance: 0.8 },
  { angle: Math.PI * 0.8, distance: 0.4 },
];

export function SecurityRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [threatActive, setThreatActive] = useState<boolean>(false);
  const [threatMessage, setThreatMessage] = useState<string>("");
  const blipsRef = useRef<Blip[]>([]);
  const rotationRef = useRef<number>(0);
  const threatTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  
  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    // Connect directly to the Security Proxy's real-time stream
    const eventSource = new EventSource("http://127.0.0.1:4000/api/stream");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Radar received event:", data);
        
        if (data.type === 'SAFE_TRAFFIC') {
          // Add a safe green blip for passing traffic
          addBlip("safe");
        } else {
          // It's a block/threat
          addBlip("threat");
          
          // Show Big Alert Banner
          setThreatActive(true);
          setThreatMessage(`THREAT BLOCKED: ${data.type.replace('_', ' ')}`);
          
          if (threatTimerRef.current) clearTimeout(threatTimerRef.current);
          threatTimerRef.current = setTimeout(() => {
            setThreatActive(false);
          }, 4000);
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    return () => {
      eventSource.close();
      if (threatTimerRef.current) clearTimeout(threatTimerRef.current);
    };
  }, []);

  const addBlip = (type: "safe" | "threat") => {
    // Random angle (0 to 360) and distance (0 to 1) from center
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.1 + Math.random() * 0.8; // keep slightly away from edges
    
    blipsRef.current.push({
      x: 0, y: 0, // calculated in render based on canvas size
      angle,
      distance,
      type,
      createdAt: Date.now()
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const isLight = themeRef.current === "light";
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 10; // padding

      // Clear canvas with background
      ctx.fillStyle = isLight ? "#ffffff" : "#0A0A0A";
      ctx.fillRect(0, 0, width, height);

      // Colors
      const gridColor = isLight ? "rgba(34, 197, 94, 0.4)" : "rgba(0, 255, 0, 0.2)";
      const sweepColorStrong = isLight ? "rgba(34, 197, 94, 0.6)" : "rgba(0, 255, 0, 0.8)";
      const sweepColorFaint = isLight ? "rgba(34, 197, 94, 0.1)" : "rgba(0, 255, 0, 0.1)";
      const sweepLineColor = isLight ? "rgba(21, 128, 61, 1)" : "rgba(0, 255, 0, 1)"; // darker green for light mode edge
      const backendPulseBase = isLight ? "rgba(34, 197, 94, " : "rgba(0, 255, 0, ";
      const backendDotColor = isLight ? "rgba(21, 128, 61, 0.9)" : "rgba(50, 255, 50, 0.9)";

      // Draw Grid (Concentric Circles)
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.stroke();

      // Sweeping Radar Line
      rotationRef.current += 0.02; // rotation speed
      const angle = rotationRef.current;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      
      // Sweep gradient
      const sweepGradient = ctx.createConicGradient(0, 0, 0);
      sweepGradient.addColorStop(0, sweepColorStrong);
      sweepGradient.addColorStop(0.1, sweepColorFaint);
      sweepGradient.addColorStop(1, "rgba(0, 255, 0, 0)");
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, 0, Math.PI / 4); // 45 degree slice
      ctx.lineTo(0, 0);
      ctx.fillStyle = sweepGradient;
      ctx.fill();
      
      // Leading edge line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = sweepLineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();

      // Draw 5 Static Backend Servers
      const now = Date.now();
      staticBackends.forEach(backend => {
        const bx = centerX + Math.cos(backend.angle) * (radius * backend.distance);
        const by = centerY + Math.sin(backend.angle) * (radius * backend.distance);
        
        const pulse = Math.abs(Math.sin(now / 300)); // slow pulse
        
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (pulse * 3), 0, Math.PI * 2);
        ctx.fillStyle = `${backendPulseBase}${0.3 + pulse * 0.3})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fillStyle = backendDotColor;
        ctx.fill();
      });

      // Draw Blips
      blipsRef.current = blipsRef.current.filter(blip => {
        const age = now - blip.createdAt;
        const maxAge = blip.type === "threat" ? 18000 : 3000; // threats stay 18 seconds
        
        if (age > maxAge) return false;

        // Calculate absolute position
        const bx = centerX + Math.cos(blip.angle) * (radius * blip.distance);
        const by = centerY + Math.sin(blip.angle) * (radius * blip.distance);

        // Blip style
        const opacity = 1 - (age / maxAge);
        
        if (blip.type === "threat") {
          // Pulsing red effect, increased size
          const pulse = Math.abs(Math.sin(now / 150));
          ctx.beginPath();
          ctx.arc(bx, by, 10 + (pulse * 15), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity * 0.6})`;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(bx, by, 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 50, 50, ${opacity})`;
          ctx.fill();
        } else {
          // Green safe blip
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(50, 255, 50, ${opacity})`;
          ctx.fill();
        }

        return true;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden">
      {/* The Canvas Radar */}
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={400} 
        className="block"
      />

      {/* Flashing Alert Overlay (Full Screen, Simple) */}
      {threatActive && (
        <div className="fixed inset-0 w-screen h-screen flex items-center justify-center z-[9999] pointer-events-none animate-in fade-in duration-200 bg-black/20 backdrop-blur-[3px]">
          <div className="flex flex-col items-center gap-2 transform scale-110">
            <h2 className="text-red-500 font-bold text-4xl @md:text-5xl tracking-wide text-center drop-shadow-md">
              Alert: {threatMessage}
            </h2>
          </div>
        </div>
      )}

      {/* Static HUD Elements */}
      <div className="absolute top-4 left-4 font-mono text-green-700 dark:text-green-500/50 text-[10px] tracking-widest pointer-events-none font-semibold dark:font-normal">
        <div>SYS_SCAN: ACTIVE</div>
        <div>PROT: 0x4F92</div>
        <div className="mt-2 text-green-600 dark:text-green-400/80">{threatActive ? 'STATUS: ENGAGED' : 'STATUS: SCANNING'}</div>
      </div>
      
      <div className="absolute bottom-4 right-4 font-mono text-green-700 dark:text-green-500/50 text-[10px] tracking-widest text-right pointer-events-none font-semibold dark:font-normal">
        <div>Z-TRUST PROXY v1.0</div>
        <div>NET_MONITOR: ONLINE</div>
      </div>
    </div>
  );
}
