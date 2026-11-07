// POST /delete-account
// Borra los archivos del usuario y su cuenta. Apple y Google exigen que se pueda borrar
// la cuenta desde la propia app. Las tablas se borran en cascada desde auth.users.
import { adminClient, corsHeaders, json, requireUser } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ error: "not_authenticated" }, 401);

  // Borrar archivos en tandas de 100
  const bucket = admin.storage.from("documents");
  for (;;) {
    const { data: files, error } = await bucket.list(user.id, { limit: 100 });
    if (error) return json({ error: "storage_error" }, 500);
    if (!files || files.length === 0) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) return json({ error: "storage_error" }, 500);
    if (files.length < 100) break;
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "delete_failed" }, 500);
  return json({ deleted: true });
});
