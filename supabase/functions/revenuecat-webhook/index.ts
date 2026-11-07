// POST /revenuecat-webhook
// Preparado para cuando se activen los pagos: RevenueCat avisa aquí cada compra,
// renovación o cancelación y actualizamos el plan del usuario.
// En RevenueCat el "App User ID" debe ser el id de Supabase (ver src/lib/purchases.ts).
// Configurar en RevenueCat → Integrations → Webhooks con el header
//   Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
// Desplegar con: supabase functions deploy revenuecat-webhook --no-verify-jwt
import { adminClient, json } from "../_shared/http.ts";

const GRANT = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE"]);
const REVOKE = new Set(["EXPIRATION"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const payload = await req.json().catch(() => null) as {
    event?: { type?: string; app_user_id?: string; expiration_at_ms?: number | null; entitlement_ids?: string[] };
  } | null;
  const event = payload?.event;
  if (!event?.type || !event.app_user_id || !UUID.test(event.app_user_id)) {
    // Eventos de prueba o usuarios anónimos: confirmar para que RevenueCat no reintente
    return json({ ignored: true });
  }
  if (event.entitlement_ids && !event.entitlement_ids.includes("pro")) return json({ ignored: true });

  const admin = adminClient();
  if (GRANT.has(event.type)) {
    const until = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
    await admin.from("profiles").update({ plan: "pro", pro_until: until }).eq("id", event.app_user_id);
  } else if (REVOKE.has(event.type)) {
    await admin.from("profiles").update({ plan: "free", pro_until: null }).eq("id", event.app_user_id);
  }
  // CANCELLATION no quita Pro: el usuario lo conserva hasta que llegue EXPIRATION
  return json({ ok: true });
});
