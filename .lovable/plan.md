# Fiscalize — Fluxo "Câmera Primeiro" (modo flagrante)

Inverter a ordem do fluxo atual para priorizar a captura imediata da prova, já que toda denúncia pode ser um flagrante. A ideia é reduzir o tempo entre o "ver a irregularidade" e o "ter a prova preservada" para 1 toque.

## Novo fluxo

```text
[Campo] → [Fiscalize]
  └─ Etapa 1: CÂMERA ABERTA (auto)
        ├─ Captura foto/vídeo/áudio (input capture="environment" disparado no mount)
        ├─ GPS capturado em paralelo, em background
        ├─ Hash SHA-256 + timestamp servidor + upload imutável
        └─ [+ Adicionar outra prova]  |  [Continuar →]
  └─ Etapa 2: Dados da denúncia
        ├─ Categoria* · Título* · Denunciado* · Relato*
        ├─ Local (já pré-preenchido pelo GPS da etapa 1; usuário pode ajustar)
        └─ [Revisar e Enviar →]
  └─ Etapa 3: Confirmar e enviar ao jurídico
```

## Detalhes de comportamento

1. **Câmera em primeiro plano**: ao entrar em `/campo/fiscalize`, dispara automaticamente o input `capture="environment"` (1ª vez apenas — não em remontagens). Se o usuário cancelar a câmera, mostra tela com botão grande "Abrir câmera" e link discreto "Pular e preencher depois".
2. **GPS em background**: assim que a página monta, chama `navigator.geolocation.getCurrentPosition` em paralelo à câmera; quando volta, popula `geo` automaticamente. Usuário não espera.
3. **Salvamento incremental**: cada prova é hashada e enviada ao Storage imediatamente após a captura, sem esperar o resto do formulário. Se o usuário fechar o app, a evidência já está preservada (rascunho de denúncia salvo em IndexedDB com referência à prova).
4. **Rascunho persistente**: se já existir um rascunho com provas anexadas e sem envio (last 24h), ao abrir `/campo/fiscalize` pergunta "Continuar denúncia anterior?" antes de abrir a câmera.
5. **Stepper renomeado**: `1. Provas (Câmera) · 2. Denúncia · 3. Enviar`.
6. **Botão flutuante "+Prova"** visível em todas as etapas, permitindo capturar mais evidências sem perder o que já foi preenchido.
7. **Tempo zero até a câmera**: a página não bloqueia em loading do `useAuth` — usa skeleton mínimo e dispara a câmera assim que `user` está disponível (já está, pois rota é protegida).

## Validações que se mantêm

- Categoria, título, denunciado, relato e local continuam obrigatórios no envio final.
- Provas continuam opcionais para envio, mas o fluxo encoraja captura imediata.
- Cadeia de custódia (SHA-256 + timestamp servidor + IP + UA) e triagem IA inalteradas.

## Arquivos a editar

- `src/pages/CampoFiscalize.tsx` — refatorar para começar em `step: 'evidence'`, auto-disparar câmera no mount, ordem do stepper invertida, GPS em background, botão flutuante "+Prova" persistente.
- (Opcional) extrair `useFiscalizeDraft` para IndexedDB se quisermos persistência local — pode ficar para uma 2ª iteração se você preferir manter este PR enxuto.

## Pergunto antes de implementar

- Rascunho persistente em IndexedDB nesta entrega, ou deixamos para uma iteração seguinte e fazemos só a inversão do fluxo + auto-câmera + GPS em background?
