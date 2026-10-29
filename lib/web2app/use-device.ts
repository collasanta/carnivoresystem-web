"use client";

import { useSyncExternalStore } from "react";
import { deviceFromUa, type Device } from "./device";

const noop = () => () => {};

/** null on the server and during hydration (so both renders match); then the visitor's device. */
export function useDevice(): Device | null {
  return useSyncExternalStore(
    noop,
    () => deviceFromUa(navigator.userAgent, navigator.maxTouchPoints),
    () => null,
  );
}
