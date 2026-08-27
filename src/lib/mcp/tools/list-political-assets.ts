import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_political_assets",
  title: "Listar ativos políticos",
  description:
    "Lista ativos políticos (prefeitos, vereadores, apoiadores e demais contatos estratégicos) com município, cargo e alinhamento.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Busca parcial por nome."),
    municipality: z.string().trim().min(1).optional().describe("Filtra por município (busca parcial)."),
    candidate_id: z.string().uuid().optional().describe("Filtra por candidato."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, municipality, candidate_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("political_assets")
      .select(
        "id,name,nickname,type,position,municipality,microregion,macroregion_id,influence_level,alignment_status,support_status,candidate_id",
      )
      .is("deleted_at", null)
      .order("name")
      .limit(limit ?? 50);
    if (search) query = query.ilike("name", `%${search}%`);
    if (municipality) query = query.ilike("municipality", `%${municipality}%`);
    if (candidate_id) query = query.eq("candidate_id", candidate_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { assets: data ?? [] },
    };
  },
});
