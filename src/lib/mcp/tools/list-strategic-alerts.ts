import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_strategic_alerts",
  title: "Listar alertas estratégicos",
  description:
    "Lista alertas estratégicos da Sala de Crise (risco/oportunidade por território, severidade, recomendação e status).",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filtra por status exato (ex.: aberto, resolvido)."),
    municipality: z.string().trim().min(1).optional().describe("Filtra por município (busca parcial)."),
    min_severity: z.number().int().min(1).max(5).optional().describe("Severidade mínima."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de registros (padrão 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, municipality, min_severity, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("strategic_alerts")
      .select(
        "id,type,title,description,recommendation,severity,score,status,municipality,macroregion_id,risk_index,opportunity_index,created_at",
      )
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit ?? 30);
    if (status) query = query.eq("status", status as never);
    if (municipality) query = query.ilike("municipality", `%${municipality}%`);
    if (typeof min_severity === "number") query = query.gte("severity", min_severity);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
