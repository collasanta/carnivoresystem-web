import { useSyncExternalStore } from "react";

export type Device = "ios" | "android" | "desktop";

/** iPadOS reports a Mac user agent, so a touch "Macintosh" counts as iOS. Also used on the server (no touch info). */
export function deviceFromUa(ua: string, touchPoints = 0): Device {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const noop = () => () => {};

/** null on the server and during hydration (so both renders match); then the visitor's device. */
export function useDevice(): Device | null {
  return useSyncExternalStore(
    noop,
    () => deviceFromUa(navigator.userAgent, navigator.maxTouchPoints),
    () => null,
  );
}
