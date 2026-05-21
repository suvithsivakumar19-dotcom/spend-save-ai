import type { AuditInput } from "./types";

// Encode audit input into a URL-safe string so /audit/$id can re-run the audit
// deterministically without a database. Lightweight base64url(JSON).
export function encodeAuditInput(input: AuditInput): string {
  const json = JSON.stringify(input);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64url");
  }
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeAuditInput(token: string): AuditInput | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof window === "undefined"
        ? Buffer.from(pad, "base64").toString("utf-8")
        : decodeURIComponent(escape(atob(pad)));
    const obj = JSON.parse(json);
    if (!obj || !Array.isArray(obj.subscriptions)) return null;
    return obj as AuditInput;
  } catch {
    return null;
  }
}
