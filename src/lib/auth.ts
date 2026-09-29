import { timingSafeEqual } from "node:crypto";
export function authorized(request: Request, app: string) {
  let tokens: Record<string, string> = {};
  try { tokens = JSON.parse(process.env.SLOTHSIGNAL_APP_TOKENS ?? "{}"); } catch { return false; }
  const secret = tokens[app];
  const header = request.headers.get("authorization");
  if (typeof secret !== "string" || secret.length < 32 || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7)); const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
