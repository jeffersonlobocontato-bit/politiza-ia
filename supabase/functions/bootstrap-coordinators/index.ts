// One-time bootstrap: creates auth logins for pending coordinators.
// Protected by CRON_SHARED_SECRET header. Idempotent per email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CANDIDATE_ID = "994166eb-4e08-42e2-8e1f-d88184aad9ec"; // Sergio Moro
const DEFAULT_PASSWORD = "Politiza@2026";

const HIERARCHY_MAP: Record<number, { role: string; label: string }> = {
  3: { role: "coordenador_regional",       label: "Coordenador Regional" },
  4: { role: "coordenador_microrregional", label: "Coordenador Microrregional" },
  5: { role: "coordenador_municipal",      label: "Coordenador Municipal" },
};

// name -> email login (first name @politiza.ia.br)
const TARGETS: Array<{ member_id: string; email: string }> = [
  { member_id: "0d591a15-ce20-4c51-8d84-c7088e45e208", email: "carlos@politiza.ia.br" },
  { member_id: "7385b2d0-5fe4-4881-8a6b-1fdd21f666a3", email: "carrapixo@politiza.ia.br" },
  { member_id: "fd0eba9f-000a-4991-a8e5-1eafe0ed93d1", email: "delegado@politiza.ia.br" },
  { member_id: "7e1fea65-16f7-4d2f-86dd-b5b76ae42b0b", email: "diogenes@politiza.ia.br" },
  { member_id: "8f0e335f-581c-4b4d-8350-63e95d74bdc9", email: "juarez@politiza.ia.br" },
  { member_id: "48b21dab-e267-41d3-8bc9-1ed387d69485", email: "julio@politiza.ia.br" },
  { member_id: "b00d5840-6f79-40a3-90c4-4e3703c5cb72", email: "rodolfo@politiza.ia.br" },
  { member_id: "bd207702-07a1-48c5-9c05-a849d59583b8", email: "rodrigo@politiza.ia.br" },
  { member_id: "52b27fda-2e36-40a4-a1fc-c7619a316c8c", email: "tiago@politiza.ia.br" },
  { member_id: "85deb163-0078-4b89-9560-b670951e9c4d", email: "allax@politiza.ia.br" },
  { member_id: "cf3e0b78-0a85-4172-ba6e-1742b8a379c4", email: "cristiano@politiza.ia.br" },
  { member_id: "59e4bc1b-4680-434b-b9ba-903d93152da9", email: "fenelon@politiza.ia.br" },
  { member_id: "15b9dd9c-c91a-4fa2-a164-dca23988c3de", email: "fernando@politiza.ia.br" },
  { member_id: "4d8ebacf-2097-4333-bdb7-bd8736716dea", email: "gen@politiza.ia.br" },
  { member_id: "05d07237-f027-4091-808b-535eaa1fa580", email: "marinho@politiza.ia.br" },
  { member_id: "9c1926d4-bfe9-4057-9362-9fd7d868682d", email: "miguel@politiza.ia.br" },
  { member_id: "25206d67-7539-468d-a083-2fdfc0e4373f", email: "pio@politiza.ia.br" },
  { member_id: "fbc751ff-ee0c-4d97-b2a4-d19e0938ec46", email: "rogerio@politiza.ia.br" },
  { member_id: "388f3b71-5db6-4fb6-9cbb-13c5bba31a5b", email: "sergiop@politiza.ia.br" },
  { member_id: "40e2dc55-99cc-41c0-afb5-dba6c590f784", email: "tatiana@politiza.ia.br" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("BOOTSTRAP_TOKEN");
  if (!expected || secret !== expected) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const results: any[] = [];

  for (const t of TARGETS) {
    try {
      const { data: cm } = await admin
        .from("campaign_members")
        .select("id, name, phone, hierarchy_level, macroregion_id, microregion, municipality, supervisor_id, user_id")
        .eq("id", t.member_id)
        .maybeSingle();

      if (!cm) { results.push({ email: t.email, status: "member_not_found" }); continue; }
      if (cm.user_id) { results.push({ email: t.email, status: "already_linked", user_id: cm.user_id }); continue; }

      const map = HIERARCHY_MAP[cm.hierarchy_level];
      if (!map) { results.push({ email: t.email, status: "invalid_level" }); continue; }

      // Create or reuse auth user
      let userId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: t.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: cm.name, must_change_password: true },
      });
      if (createErr) {
        // If already exists, look up
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
        const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === t.email.toLowerCase());
        if (!found) { results.push({ email: t.email, status: "create_failed", error: createErr.message }); continue; }
        userId = found.id;
      } else {
        userId = created.user.id;
      }

      // Profile
      await admin.from("profiles").upsert({
        id: userId,
        full_name: cm.name,
        email: t.email,
        phone: cm.phone || null,
      });

      // Role
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({
        user_id: userId,
        role: map.role,
        macroregion_id: cm.macroregion_id,
        microregion: cm.microregion,
        municipality: cm.municipality,
      });

      // Candidate link
      await admin.from("user_candidates").delete().eq("user_id", userId);
      await admin.from("user_candidates").insert({ user_id: userId, candidate_id: CANDIDATE_ID });

      // Link the existing campaign_members row
      await admin.from("campaign_members")
        .update({
          user_id: userId,
          email: t.email,
          role: map.label,
          candidate_id: CANDIDATE_ID,
        })
        .eq("id", cm.id);

      results.push({ email: t.email, status: "ok", user_id: userId, name: cm.name });
    } catch (e) {
      results.push({ email: t.email, status: "exception", error: String(e) });
    }
  }

  return json({ ok: true, results });
});
