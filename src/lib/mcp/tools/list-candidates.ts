import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_candidates",
  title: "Listar candidatos",
  description: "Lista os candidatos aos quais o usuário conectado tem acesso (nome, partido, cargo, ano).",
  inputSchema: {
    only_active: z.boolean().optional().describe("Se verdadeiro, retorna apenas candidatos ativos."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("candidates")
      .select("id,name,party,cargo,state,election_year,is_active")
      .order("name")
      .limit(limit ?? 50);
    if (only_active) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { candidates: data ?? [] },
    };
  },
});
