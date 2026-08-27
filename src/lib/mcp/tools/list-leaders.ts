import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_leaders",
  title: "Listar lideranças",
  description:
    "Lista lideranças municipais cadastradas (nome, município, nível de influência, alinhamento, apoiadores estimados).",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Busca parcial por nome."),
    municipality: z.string().trim().min(1).optional().describe("Filtra por município (busca parcial)."),
    candidate_id: z.string().uuid().optional().describe("Filtra por candidato."),
    min_influence: z.number().int().min(0).max(10).optional().describe("Nível mínimo de influência."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, municipality, candidate_id, min_influence, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("leaders")
      .select(
        "id,name,municipality,microregion,macroregion_id,influence_level,mobilization_capacity,estimated_supporters,alignment_status,support_status,current_party,candidate_id",
      )
      .is("deleted_at", null)
      .order("influence_level", { ascending: false })
      .limit(limit ?? 50);
    if (search) query = query.ilike("name", `%${search}%`);
    if (municipality) query = query.ilike("municipality", `%${municipality}%`);
    if (candidate_id) query = query.eq("candidate_id", candidate_id);
    if (typeof min_influence === "number") query = query.gte("influence_level", min_influence);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { leaders: data ?? [] },
    };
  },
});
