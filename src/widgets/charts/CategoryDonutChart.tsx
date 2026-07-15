import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "next-themes";

interface CategoryDonutChartProps {
  scanCounts?: {
    dependency: number;
    config: number;
    secret: number;
    cipher: number;
  };
}

export function CategoryDonutChart({ scanCounts }: CategoryDonutChartProps) {
  const { resolvedTheme } = useTheme();

  const data = [
    { name: "Dependency", value: scanCounts?.dependency || 0, color: "#3b82f6" }, // blue-500
    { name: "Config", value: scanCounts?.config || 0, color: "#8b5cf6" }, // purple-500
    { name: "Secret", value: scanCounts?.secret || 0, color: "#f97316" }, // orange-500
    { name: "Cipher", value: scanCounts?.cipher || 0, color: "#10b981" }, // emerald-500
  ].filter(item => item.value > 0);

  // If no data, render empty state
  if (data.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center text-text-muted text-sm font-medium">
        No scan data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border-subtle p-3 rounded-xl shadow-lg backdrop-blur-md">
          <p className="text-sm font-bold text-text-primary mb-1">{payload[0].name} Scans</p>
          <p className="text-xl font-medium" style={{ color: payload[0].payload.color }}>
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-text-primary text-xs font-medium ml-1">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
