import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_actions",
  title: "Listar ações de campo",
  description:
    "Lista ações de campo da campanha (título, município, status, data planejada/executada, público atingido), com filtros opcionais.",
  inputSchema: {
    candidate_id: z.string().uuid().optional().describe("Filtra por candidato."),
    municipality: z.string().trim().min(1).optional().describe("Filtra por município (busca parcial)."),
    status: z.string().trim().min(1).optional().describe("Filtra por status exato (ex.: planejada, executada)."),
    since: z.string().optional().describe("Data mínima (YYYY-MM-DD) para planned_date."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ candidate_id, municipality, status, since, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("actions")
      .select(
        "id,title,type,category,municipality,macroregion_id,status,priority,planned_date,executed_date,executed_people_count,estimated_impact,impact_score,responsible,candidate_id",
      )
      .is("deleted_at", null)
      .order("planned_date", { ascending: false })
      .limit(limit ?? 50);
    if (candidate_id) query = query.eq("candidate_id", candidate_id);
    if (municipality) query = query.ilike("municipality", `%${municipality}%`);
    if (status) query = query.eq("status", status as never);
    if (since) query = query.gte("planned_date", since);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { actions: data ?? [] },
    };
  },
});
