import { describe, expect, it } from "vitest";
import { eventInput } from "./contract";
import { authorized } from "./auth";
describe("event boundary", () => {
  it("rejects off-origin notification destinations", () => {
    const event = { app: "slothmint", event: "earning.paid", title: "Pago", body: "Recebido", path: "//evil.example", dedupeKey: "1" };
    expect(eventInput.safeParse(event).success).toBe(false);
    expect(eventInput.safeParse({ ...event, path: "/earnings" }).success).toBe(true);
  });
  it("requires the configured token", () => {
    process.env.SLOTHSIGNAL_APP_TOKENS = JSON.stringify({ slothmint: "x".repeat(32) });
    expect(authorized(new Request("https://example.com"), "slothmint")).toBe(false);
    expect(authorized(new Request("https://example.com", { headers: { authorization: `Bearer ${"x".repeat(32)}` } }), "slothmint")).toBe(true);
    delete process.env.SLOTHSIGNAL_APP_TOKENS;
  });
});
