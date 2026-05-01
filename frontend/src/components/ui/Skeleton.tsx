interface SkeletonProps {
  className?: string;
  ariaLabel?: string;
}

/** Animated placeholder block. Use to reserve layout while async content loads. */
export function Skeleton({ className = "", ariaLabel = "Loading" }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

/** Stat-card-shaped skeleton (icon block + 2 lines of text). Matches the lifecycle/win-loss cards. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  );
}

/** Full-height chart placeholder. Reserves the same vertical slot the chart will occupy. */
export function SkeletonChart({ height = 350 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <Skeleton className="h-full w-full" ariaLabel="Loading chart" />
    </div>
  );
}

/** Table-row skeleton: N rows × M cells. */
export function SkeletonTableRows({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
