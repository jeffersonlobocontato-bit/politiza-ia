import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface EvidenceIn {
  url: string;
  path: string;
  sha256: string;
  mime: string;
  size: number;
  exif?: Record<string, unknown> | null;
}

interface Payload {
  candidate_id?: string | null;
  category: string;
  title: string;
  denounced_name: string;
  denounced_role?: string | null;
  denounced_party?: string | null;
  narrative: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  municipality?: string | null;
  evidence: EvidenceIn[];
}

async function analyzeImage(url: string): Promise<{ ai_score: number | null; ai_description: string | null }> {
  if (!LOVABLE_API_KEY) return { ai_score: null, ai_description: null };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Analise esta imagem como possível prova de irregularidade eleitoral. Responda em JSON: {\"description\":\"<o que aparece, 1 frase>\",\"manipulation_score\":<0-100 prob. de IA/edição>,\"relevance\":\"baixa|media|alta\"}" },
            { type: "image_url", image_url: { url } },
          ],
        }],
      }),
    });
    if (!res.ok) return { ai_score: null, ai_description: null };
    const data = await res.json();
    const txt = data.choices?.[0]?.message?.content ?? "";
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return { ai_score: null, ai_description: txt.slice(0, 200) };
    const parsed = JSON.parse(m[0]);
    return { ai_score: Number(parsed.manipulation_score) || 0, ai_description: parsed.description ?? null };
  } catch {
    return { ai_score: null, ai_description: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const supaUser = createClient(SUPABASE_URL, SERVICE_ROLE, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supaUser.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as Payload;
    if (!body.category || !body.title || !body.denounced_name || !body.narrative) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Triagem AI das imagens
    const enrichedEvidence = await Promise.all((body.evidence ?? []).map(async (e) => {
      if (e.mime?.startsWith("image/")) {
        const { data: signed } = await admin.storage.from("fiscalize-evidence").createSignedUrl(e.path, 300);
        if (signed?.signedUrl) {
          const ai = await analyzeImage(signed.signedUrl);
          return { ...e, ...ai };
        }
      }
      return e;
    }));

    const avgRisk = enrichedEvidence
      .map((e: any) => e.ai_score).filter((x: any) => typeof x === "number");
    const aiRiskScore = avgRisk.length ? avgRisk.reduce((a: number, b: number) => a + b, 0) / avgRisk.length : null;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    const { data: inserted, error: insErr } = await admin
      .from("fiscalize_reports")
      .insert({
        candidate_id: body.candidate_id ?? null,
        category: body.category,
        title: body.title,
        denounced_name: body.denounced_name,
        denounced_role: body.denounced_role ?? null,
        denounced_party: body.denounced_party ?? null,
        narrative: body.narrative,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        address: body.address ?? null,
        municipality: body.municipality ?? null,
        evidence: enrichedEvidence,
        ai_risk_score: aiRiskScore,
        ai_summary: enrichedEvidence.map((e: any) => e.ai_description).filter(Boolean).join(" | ") || null,
        status: "nova",
        severity: aiRiskScore !== null && aiRiskScore > 60 ? "alta" : "media",
        created_by: userId,
        client_ip: ip,
        user_agent: ua,
      })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ report: inserted }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
