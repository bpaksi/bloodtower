// Every browser connected over /ws, under the id the service gave it, and the one place that sends
// to all of them (D7: every client sees every change, whoever caused it).
import { randomUUID } from "node:crypto";
import type { ServerMessage } from "@dark-tower/tower";
import type { WebSocket } from "ws";

export interface HubClient {
  readonly id: string;
  /** What the client called itself in `hello`; undefined until then. */
  label?: string;
  /** Milliseconds since the epoch. */
  readonly connectedAt: number;
}

export interface ClientHub {
  /** Registers a socket and gives it a new client id. */
  add: (socket: WebSocket) => HubClient;
  remove: (socket: WebSocket) => void;
  /** The client a socket belongs to, while it is registered. */
  get: (socket: WebSocket) => HubClient | undefined;
  /** The clients connected now, oldest first. */
  clients: () => readonly HubClient[];
  /** Sends to every registered client whose socket is open. */
  broadcast: (message: ServerMessage) => void;
  /** Drops every client's connection. */
  closeAll: () => void;
}

export const createClientHub = (now: () => number = Date.now): ClientHub => {
  const sockets = new Map<WebSocket, HubClient>();
  return {
    add: (socket) => {
      const client: HubClient = { id: randomUUID(), connectedAt: now() };
      sockets.set(socket, client);
      return client;
    },
    remove: (socket) => {
      sockets.delete(socket);
    },
    get: (socket) => sockets.get(socket),
    clients: () => [...sockets.values()],
    broadcast: (message) => {
      // Serialised once, whatever the number of clients.
      const data = JSON.stringify(message);
      for (const socket of sockets.keys()) {
        if (socket.readyState === socket.OPEN) socket.send(data);
      }
    },
    closeAll: () => {
      for (const socket of sockets.keys()) socket.terminate();
      sockets.clear();
    },
  };
};
