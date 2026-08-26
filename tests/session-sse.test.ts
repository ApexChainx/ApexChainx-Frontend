/** ApexChain Frontend Test Suite — session SSE frame parser */
import { describe, expect, it, vi } from "vitest";
import { processFrame } from "@/lib/session-sse";
import type { SessionSseEvent } from "@/lib/session-sse";

function collect(events: SessionSseEvent[]): (e: SessionSseEvent) => void {
  return (e) => events.push(e);
}

describe("processFrame — session_revoked parsing", () => {
  it("parses a single-line session_revoked frame with a known reason", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: { \"reason\": \"admin_logout\" }";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "admin_logout" }]);
  });

  it("parses a password_changed reason", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: { \"reason\": \"password_changed\" }";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "password_changed" }]);
  });

  it("parses a session_expired reason", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: { \"reason\": \"session_expired\" }";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "session_expired" }]);
  });

  it("maps an unknown reason to 'unknown'", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: { \"reason\": \"something_else\" }";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "unknown" }]);
  });

  it("maps a missing reason field to 'unknown'", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: {}";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "unknown" }]);
  });

  it("does not emit for a heartbeat event type", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: heartbeat\ndata: { \"timestamp\": 1234567890 }";
    processFrame(frame, collect(events));
    expect(events).toEqual([]);
  });

  it("ignores an unknown event type", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: mystery\ndata: { \"foo\": 1 }";
    processFrame(frame, collect(events));
    expect(events).toEqual([]);
  });

  it("does not emit when the event: line is missing", () => {
    const events: SessionSseEvent[] = [];
    const frame = "data: { \"reason\": \"admin_logout\" }";
    processFrame(frame, collect(events));
    expect(events).toEqual([]);
  });

  it("does not emit when the data: line is missing", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked";
    processFrame(frame, collect(events));
    expect(events).toEqual([]);
  });

  it("silently drops a malformed JSON payload", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: { not-valid-json";
    expect(() => processFrame(frame, collect(events))).not.toThrow();
    expect(events).toEqual([]);
  });

  it("uses only the last data: line (current truncation behavior)", () => {
    const events: SessionSseEvent[] = [];
    const frame = [
      "event: session_revoked",
      "data: { \"reason\": \"admin_logout\" }",
      "data: { \"reason\": \"password_changed\" }",
    ].join("\n");
    processFrame(frame, collect(events));
    // The parser keeps the last matching line — pinned as current behavior.
    expect(events).toEqual([{ type: "session_revoked", reason: "password_changed" }]);
  });

  it("emits exactly once even when the frame has trailing whitespace lines", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata: { \"reason\": \"admin_logout\" }\n\n";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "admin_logout" }]);
  });

  it("is tolerant of a colon + space prefix on data", () => {
    const events: SessionSseEvent[] = [];
    const frame = "event: session_revoked\ndata:{\"reason\":\"session_expired\"}";
    processFrame(frame, collect(events));
    expect(events).toEqual([{ type: "session_revoked", reason: "session_expired" }]);
  });

  it("calls the handler only for recognized events", () => {
    const onEvent = vi.fn();
    processFrame("event: heartbeat\ndata: {}", onEvent);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
