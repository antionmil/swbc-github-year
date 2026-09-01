"use client";

import { useEffect } from "react";
import { startPulse } from "@/lib/pulseClient";

/** Sits in the root layout so every page counts as a view, including the
 *  shared poster pages that carry most of the traffic. Renders nothing. */
export function Pulse() {
  useEffect(startPulse, []);
  return null;
}
