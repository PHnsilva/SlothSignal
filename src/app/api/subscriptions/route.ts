import { authorized } from "@/lib/auth";
import { subscriptionInput } from "@/lib/contract";
import { db } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = subscriptionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Subscription inválida." }, { status: 400 });
  const { app, subscription } = parsed.data;
  if (!authorized(request, app)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const { error } = await db().from("signal_subscriptions").upsert({ app, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth_key: subscription.keys.auth }, { onConflict: "app,endpoint" });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Falha ao registrar dispositivo." }, { status: 500 }); }
}
export async function DELETE(request: Request) {
  const parsed = subscriptionInput.pick({ app: true }).extend({ endpoint: subscriptionInput.shape.subscription.shape.endpoint }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Endpoint inválido." }, { status: 400 });
  if (!authorized(request, parsed.data.app)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const { error } = await db().from("signal_subscriptions").delete().eq("app", parsed.data.app).eq("endpoint", parsed.data.endpoint);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Falha ao remover dispositivo." }, { status: 500 }); }
}
