import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function SvgIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </SvgIcon>
  );
}

export function RefreshCwIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </SvgIcon>
  );
}

export function RotateCcwIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 2v6h6" />
      <path d="M3 8a9 9 0 1 0 3-5.9" />
    </SvgIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m5 12 5 5L20 7" />
    </SvgIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </SvgIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}

export function MoreHorizontalIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}
