"use client";
// The one store every component reads the service from (Zustand, spec §3). `ServiceConnection`
// opens the socket; components read the view and send through `sendToService`.
import { create } from "zustand";
import { applyServerMessage, applySocketState, initialView, type ServiceView } from "./service.ts";
import {
  clientLabel,
  nextMessageId,
  openServiceSocket,
  type ServiceSocket,
  serviceUrl,
} from "./ws.ts";

export const useService = create<ServiceView>(() => initialView);

let socket: ServiceSocket | undefined;
let users = 0;

/** Opens the link to the service for as long as one caller holds it. Returns the release. */
export const holdServiceSocket = () => {
  users += 1;
  if (!socket) {
    socket = openServiceSocket({
      url: serviceUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      label: clientLabel(navigator.userAgent, navigator.maxTouchPoints),
      // `true` replaces the view rather than merging into it: the reducers remove what is no
      // longer known (the tower's state once the link drops), and a merge would keep it.
      onMessage: (message) =>
        useService.setState((view) => applyServerMessage(view, message, Date.now()), true),
      onSocketState: (state) => useService.setState((view) => applySocketState(view, state), true),
    });
  }
  return () => {
    users -= 1;
    if (users === 0) {
      socket?.close();
      socket = undefined;
    }
  };
};

/**
 * Sends a client message with a new id and returns the id, or undefined when the service is not
 * reachable. Nothing is retried; the caller tells the person.
 */
export const sendToService = (type: string, payload: unknown = {}) => {
  const id = nextMessageId();
  return socket?.send(type, payload, id) ? id : undefined;
};
