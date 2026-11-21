/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useEffect, useRef, type ReactNode } from "react";

type AriaLive = "off" | "polite" | "assertive";

export interface LiveRegionAnnouncerProps {
  /** Message announced to assistive technologies. */
  message: string;
  /** Politeness setting for announcements. Defaults to "polite". */
  politeness?: AriaLive | undefined;
  /** Whether the region should be treated as atomic. Defaults to true. */
  atomic?: boolean | undefined;
  /** Optional visible label for sighted users. */
  children?: ReactNode;
  className?: string | undefined;
}

export function getAriaLiveProps(politeness: AriaLive = "polite", atomic = true) {
  return {
    role: politeness === "assertive" ? ("alert" as const) : ("status" as const),
    "aria-live": politeness,
    "aria-atomic": atomic,
  };
}

/** Announces dynamic SLA operation updates to screen readers. */
export function LiveRegionAnnouncer({
  message,
  politeness = "polite",
  atomic = true,
  children,
  className,
}: LiveRegionAnnouncerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = message;
    }
  }, [message, politeness]);

  return (
    <div className={className}>
      {children}
      <div
        ref={ref}
        {...getAriaLiveProps(politeness, atomic)}
        className="sr-only"
      >
        {message}
      </div>
    </div>
  );
}

export interface SkipToOperationsContentProps {
  /** Target element id to skip to. Defaults to "sla-operations-content". */
  targetId?: string | undefined;
  /** Link label. Defaults to "Skip to operations content". */
  label?: string | undefined;
  className?: string | undefined;
}

/** Keyboard-accessible skip link for jumping to SLA operations content. */
export function SkipToOperationsContent({
  targetId = "sla-operations-content",
  label = "Skip to operations content",
  className,
}: SkipToOperationsContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={
        className ??
        "sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-gray-900 focus:shadow"
      }
    >
      {label}
    </a>
  );
}

export default LiveRegionAnnouncer;
