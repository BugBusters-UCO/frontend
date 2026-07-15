import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";

interface TrendAreaChartProps {
  trendData?: {
    date: string;
    findingsCount: number;
  }[];
}

export function TrendAreaChart({ trendData }: TrendAreaChartProps) {
  const { resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === "dark";
  const primaryColor = "#3b82f6"; // blue-500
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  const data = trendData?.map(d => ({
    name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    findings: d.findingsCount
  })) || [];

  if (data.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center text-text-muted text-sm font-medium">
        Loading trend data...
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border-subtle p-3 rounded-xl shadow-lg backdrop-blur-md">
          <p className="text-sm font-bold text-text-primary mb-1">{label}</p>
          <p className="text-xl font-medium" style={{ color: primaryColor }}>
            {payload[0].value} Findings
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorFindings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke={textColor} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke={textColor} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="findings" 
            stroke={primaryColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorFindings)" 
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
