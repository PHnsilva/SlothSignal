import webPush from "web-push";
import { authorized } from "@/lib/auth";
import { eventInput } from "@/lib/contract";
import { db } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = eventInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Evento inválido." }, { status: 400 });
  const event = parsed.data;
  if (!authorized(request, event.app)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (event.expiresAt && Date.parse(event.expiresAt) < Date.now()) return Response.json({ skipped: "expired" });
  const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return Response.json({ error: "VAPID não configurado." }, { status: 503 });
  try {
    const client = db();
    const inserted = await client.from("signal_events").insert({ app: event.app, event_type: event.event, title: event.title, body: event.body, path: event.path, dedupe_key: event.dedupeKey, expires_at: event.expiresAt ?? null }).select("id").single();
    if (inserted.error?.code === "23505") return Response.json({ duplicate: true });
    if (inserted.error || !inserted.data) throw inserted.error;
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    let sent = 0, failed = 0;
    const ttl = event.expiresAt ? Math.max(0, Math.floor((Date.parse(event.expiresAt) - Date.now()) / 1000)) : 3600;
    for (let offset = 0; ; offset += 100) {
      const { data: devices, error } = await client.from("signal_subscriptions").select("id,endpoint,p256dh,auth_key").eq("app", event.app).range(offset, offset + 99);
      if (error) throw error;
      if (!devices?.length) break;
      const results = await Promise.allSettled(devices.map(async (device) => {
        try {
          await webPush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth_key } }, JSON.stringify({ title: event.title, body: event.body, path: event.path, event: event.event }), { TTL: ttl, urgency: event.priority === "high" ? "high" : "normal" });
          return { ok: true };
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await client.from("signal_subscriptions").delete().eq("id", device.id);
          return { ok: false };
        }
      }));
      for (const result of results) { if (result.status === "fulfilled" && result.value.ok) sent++; else failed++; }
      if (devices.length < 100) break;
    }
    await client.from("signal_events").update({ sent_count: sent, failed_count: failed }).eq("id", inserted.data.id);
    return Response.json({ accepted: true, sent, failed });
  } catch { return Response.json({ error: "Falha ao processar evento." }, { status: 500 }); }
}
