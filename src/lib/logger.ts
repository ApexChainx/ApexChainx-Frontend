/** ApexChain - Network Operations Intelligence Platform */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  event: string;
  level: LogLevel;
  route?: string;
  userId?: string;
  correlationId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

interface Logger {
  debug(event: string, payload?: Record<string, unknown>): void;
  info(event: string, payload?: Record<string, unknown>): void;
  warn(event: string, payload?: Record<string, unknown>): void;
  error(event: string, payload?: Record<string, unknown>): void;
}

function getRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname;
}

function emit(level: LogLevel, event: string, payload?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_LOGGING_DISABLED === "true") return;

  const entry: LogEvent = {
    event,
    level,
    route: getRoute(),
    ...payload,
  };

  if (process.env.NODE_ENV === "test") return;

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else if (process.env.NODE_ENV === "development") {
    console.log(JSON.stringify(entry));
  }
}

export const logger: Logger = {
  debug: (event, payload) => emit("debug", event, payload),
  info: (event, payload) => emit("info", event, payload),
  warn: (event, payload) => emit("warn", event, payload),
  error: (event, payload) => emit("error", event, payload),
};
