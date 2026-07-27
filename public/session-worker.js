/**
 * ApexChain — Session Sync Shared Worker
 *
 * Replaces BroadcastChannel for cross-tab session synchronisation.
 * Maintains a registry of connected ports (one per tab) and relays
 * session messages to all peers. More reliable than BroadcastChannel
 * because the worker lives independently of any single tab's lifecycle.
 *
 * Message protocol (mirrors the old BroadcastChannel format):
 *   { type: "logout" }
 *   { type: "authenticated"; user: SessionUser }
 *
 * No tokens are stored in the worker — it acts purely as an event bus.
 */

const ports = new Set();

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = (event) => {
    const message = event.data;

    // Broadcast to every other connected tab
    for (const peer of ports) {
      if (peer !== port) {
        peer.postMessage(message);
      }
    }
  };

  port.onclose = () => {
    ports.delete(port);
  };
};
