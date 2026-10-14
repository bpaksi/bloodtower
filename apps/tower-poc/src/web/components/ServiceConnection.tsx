"use client";

import { useEffect } from "react";
import { holdServiceSocket } from "@/lib/store";

/** Keeps the link to the tower service open while the app is on screen. Renders nothing. */
export function ServiceConnection() {
  useEffect(() => holdServiceSocket(), []);
  return null;
}
