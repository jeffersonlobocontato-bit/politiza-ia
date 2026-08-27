import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listActionsTool from "./tools/list-actions";
import listCandidatesTool from "./tools/list-candidates";
import listLeadersTool from "./tools/list-leaders";
import listPoliticalAssetsTool from "./tools/list-political-assets";
import listStrategicAlertsTool from "./tools/list-strategic-alerts";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gestao-eleitoral",
  title: "Gestão Eleitoral",
  version: "0.1.0",
  instructions:
    "Ferramentas da plataforma de inteligência eleitoral Politiza IA. Permite consultar candidatos, ações de campo, lideranças municipais, ativos políticos e alertas estratégicos. Todos os dados respeitam as permissões do usuário conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listCandidatesTool,
    listActionsTool,
    listLeadersTool,
    listPoliticalAssetsTool,
    listStrategicAlertsTool,
  ],
});
