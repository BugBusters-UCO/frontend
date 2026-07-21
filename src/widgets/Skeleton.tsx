import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "xl" | "full" | "none";
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
    lg: "rounded-2xl",
    xl: "rounded-2xl",
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
    <div className="flex items-center justify-between p-3 border rounded-2xl border-border-divider">
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
    <div className="bg-surface-container-lowest p-card-padding rounded-2xl border border-border-divider shadow-sm flex flex-col gap-4">
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
    <div className="grid grid-cols-1 @md:grid-cols-4 gap-element-gap">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-surface-container-lowest p-card-padding rounded-2xl border border-border-divider shadow-sm flex flex-col gap-2">
          <Skeleton width="40%" height={14} />
          <Skeleton width="60%" height={32} />
        </div>
      ))}
    </div>
  );
}

export function ScanConfigSkeleton() {
  return (
    <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-6 flex flex-col h-full relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton width={40} height={40} rounded="xl" />
        <div>
          <Skeleton width={120} height={20} className="mb-1" />
          <Skeleton width={180} height={14} />
        </div>
      </div>

      <div className="space-y-8 flex-1">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton width={18} height={18} rounded="sm" />
            <Skeleton width={60} height={16} />
          </div>
          
          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle p-1 shadow-sm">
             <div className="p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <Skeleton width={28} height={28} rounded="full" />
                    <div>
                      <Skeleton width={100} height={14} className="mb-1" />
                      <Skeleton width={140} height={11} />
                    </div>
                  </div>
                  <Skeleton width={80} height={24} rounded="lg" />
                </div>
                <Skeleton width="100%" height={42} rounded="lg" />
              </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-border-divider flex-1"></div>
            <Skeleton width={20} height={12} />
            <div className="h-px bg-border-divider flex-1"></div>
          </div>

          <div className="border-2 border-dashed border-border-subtle rounded-2xl p-5 bg-surface-container-lowest flex flex-col items-center justify-center">
            <Skeleton width={32} height={32} rounded="full" className="mb-2" />
            <Skeleton width={150} height={16} className="mb-1.5" />
            <Skeleton width={200} height={12} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton width={18} height={18} rounded="sm" />
            <Skeleton width={70} height={16} />
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-4 shadow-sm space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border-divider last:border-0">
                <div>
                  <Skeleton width={120} height={14} className="mb-1" />
                  <Skeleton width={180} height={11} />
                </div>
                <Skeleton width={36} height={20} rounded="full" />
              </div>
            ))}
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Skeleton width={110} height={14} />
              <Skeleton width={16} height={16} rounded="full" />
            </div>
            <Skeleton width="100%" height={42} rounded="lg" />
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-border-divider">
        <Skeleton width="100%" height={48} rounded="xl" />
      </div>
    </div>
  );
}
