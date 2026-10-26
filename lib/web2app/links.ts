/**
 * Store and app links for the "download the app" step. The redemption code travels:
 *  - Android: inside the Play install referrer (`w2a_code`), read on first launch by the app
 *    (leo/src/lib/attribution.ts → webRedeem.ts) and redeemed silently. Zero typing.
 *  - iOS (no install referrer): the deep link leo://redeem?code=… ("Já instalei, abrir o app"), or typing the code in
 *    the app (paywall › "Já comprei no site").
 */
export const APP_SCHEME = "leo";
export const ANDROID_PACKAGE = "dev.thirtythreeweb.leo";
export const IOS_APP_ID = "6808867448";

export const formatCode = (code: string) => {
  const c = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return c.length === 11 ? `${c.slice(0, 3)}-${c.slice(3, 7)}-${c.slice(7)}` : code;
};

export function appStoreUrl(): string {
  // ct = campaign token (App Store Connect › App Analytics › Campaigns)
  return `https://apps.apple.com/app/apple-store/id${IOS_APP_ID}?pt=128456926&ct=web2app&mt=8`;
}

export function playStoreUrl(code?: string): string {
  const ref = new URLSearchParams({ utm_source: "web2app", utm_medium: "quiz" });
  if (code) ref.set("w2a_code", code.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&referrer=${encodeURIComponent(ref.toString())}`;
}

export function deepLink(code: string): string {
  return `${APP_SCHEME}://redeem?code=${encodeURIComponent(formatCode(code))}`;
}

/** Page that shows the code + buttons; linked from the e-mail. */
export function activationUrl(origin: string, code: string): string {
  return `${origin}/quiz/ativar?c=${encodeURIComponent(formatCode(code))}`;
}
