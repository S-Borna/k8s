import type { AppState } from "@/types";

const HASH_PREFIX = "#state=";

export function encodeStateForUrl(state: AppState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeStateFromUrl(hash: string): AppState | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const b64url = hash.slice(HASH_PREFIX.length);
    const padded = b64url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as AppState;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: AppState): string {
  return `${window.location.origin}/${HASH_PREFIX}${encodeStateForUrl(state)}`;
}

export const STATE_HASH_PREFIX = HASH_PREFIX;
