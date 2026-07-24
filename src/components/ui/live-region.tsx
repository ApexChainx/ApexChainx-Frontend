/** ApexChain Network Operations Intelligence Platform */
"use client";

interface LiveStatusProps {
  status: string;
  label?: string;
  className?: string;
}

export function LiveStatus({ status, label = "Status", className }: LiveStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={className}
    >
      <span className="sr-only">{label}: </span>
      <span aria-hidden="true">{status}</span>
    </div>
  );
}

interface LiveRegionProps {
  children: React.ReactNode;
  assertive?: boolean;
  className?: string;
}

export function LiveRegion({ children, assertive = false, className }: LiveRegionProps) {
  return (
    <div
      role="log"
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="false"
      className={className}
    >
      {children}
    </div>
  );
}

interface AnnouncerProps {
  message: string;
  assertive?: boolean;
}

export function Announcer({ message, assertive = false }: AnnouncerProps) {
  return (
    <div
      role="log"
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
