import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full" | "none";
}

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const roundedClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={`bg-surface-container-high animate-pulse ${roundedClass} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonJobRow() {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg border-border-divider">
      <div className="flex flex-col gap-2 w-1/2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </div>
      <Skeleton width={64} height={20} rounded="full" />
    </div>
  );
}

export function SkeletonPanel() {
  return (
    <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-4">
      <Skeleton width="30%" height={24} />
      <div className="flex flex-col gap-2">
        <Skeleton width="100%" height={16} />
        <Skeleton width="90%" height={16} />
        <Skeleton width="95%" height={16} />
      </div>
    </div>
  );
}

export function SkeletonMetricsRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-element-gap">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
          <Skeleton width="40%" height={14} />
          <Skeleton width="60%" height={32} />
        </div>
      ))}
    </div>
  );
}
