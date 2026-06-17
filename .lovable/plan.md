Plano de ajuste para Ativos Políticos:

1. **Regra registrada para implementação**
   - Todos os nomes cadastrados na base **Proporcional** (`party_slate_candidates`) serão tratados como **candidatos**.
   - Eles também devem aparecer no dashboard de **Ativos Políticos**, junto com ativos nativos, candidatos da base principal e coordenadores da hierarquia.

2. **Ampliar a agregação do hook unificado**
   - Atualizar `useUnifiedPoliticalAssets.ts` para consultar também `party_slate_candidates` com `deleted_at IS NULL`.
   - Não filtrar apenas ativos: considerar todos os nomes cadastrados, conforme solicitado.
   - Normalizar cada registro proporcional como `UnifiedAsset`:
     - `origin`: candidato/proporcional
     - `type`: `candidato`
     - `name`: nome da base Proporcional
     - `position`: cargo + partido
     - `municipality`: cidade
     - `support_status`: status geral/filiação quando disponível
     - `phone`: telefone
     - `observations`: notas
     - `source_route`: `/proporcional`
     - `source_label`: `via Proporcional`
     - `readonly`: `true`

3. **Evitar duplicidade quando houver vínculo com a base principal**
   - Se um registro da base Proporcional tiver `candidate_id` e esse candidato já estiver vindo da tabela principal `candidates`, ele não será duplicado.
   - Se não existir vínculo, o nome proporcional entra normalmente como candidato virtual.

4. **Ajustar o dashboard de Ativos Políticos**
   - Atualizar os filtros/contadores para deixar claro que candidatos incluem:
     - candidatos da base principal;
     - nomes da base Proporcional;
     - candidatos estaduais e federais cadastrados.
   - Os cards da base Proporcional aparecerão bloqueados para edição direta, com botão para abrir o módulo **Proporcional**.

5. **Validar resultado**
   - Conferir que o total de candidatos em Ativos Políticos passa a somar também os registros da base Proporcional.
   - Conferir que coordenadores da hierarquia continuam aparecendo como ativos políticos.