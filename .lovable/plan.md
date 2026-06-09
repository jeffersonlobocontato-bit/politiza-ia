# App Mobile da Plataforma — Estratégia PWA

Ainda **não temos** um app criado. Hoje só existe `manifest.webmanifest` apontando para `/campo`, mas sem ícones próprios, sem fluxo de instalação guiado e sem distinção de perfil. Vou transformar a plataforma em **PWA instalável** (Add to Home Screen), sem app nativo nem App Store, atendendo aos dois usos solicitados com **um único código** e **dois perfis de entrada**.

## Por que PWA e não nativo
- Mesma base React já existente — zero duplicação de código.
- Instala no celular (iPhone/Android) como app, com ícone próprio e tela cheia.
- Atualizações automáticas (não depende de loja).
- Não precisa de Xcode/Android Studio nem publicação em loja.
- Limitação aceita: sem push notifications nativas e sem modo offline pesado (não foi pedido).

## Dois "apps" — um só código, dois perfis

### App 1 — Plataforma Geral (Admins, Gestores, Coordenadores)
- Acesso a tudo: Sala de Guerra, Mapa, Tracking, Chapas, Pesquisas, Configurações.
- Layout responsivo já existente; ajustaremos pontos críticos de mobile no header e sidebar.
- Após login → vai para `/` (Sala de Guerra).

### App 2 — App de Campo (Lideranças)
- Mesmo PWA, mas usuário com papel `lideranca_campo` (ou equivalente restrito) entra direto em `/campo`.
- Sidebar/menus completos ficam **ocultos** para esse perfil — vê apenas:
  - Registrar Ação de Campo (`/campo/acao`)
  - Cadastrar Liderança / Ativo Político (`/campo/liderancas`)
  - Meu Dashboard (`/campo/dashboard`)
- Header simplificado (sem sinos de alerta global, sem trocador de candidato).

## Implementação técnica

### 1. Manifest e ícones
- Atualizar `public/manifest.webmanifest`: `start_url: "/"`, `scope: "/"`, nome "Politiza IA", cores do tema atual (Navy #1A2A45).
- Gerar ícones PWA (192, 512, maskable, apple-touch-icon) em `src/assets/pwa/`.
- Adicionar tags `<link rel="apple-touch-icon">` e `<meta name="apple-mobile-web-app-*">` no `index.html`.

### 2. Roteamento por papel após login
- Em `AuthContext` / `ProtectedRoute`, detectar se o usuário tem papel restrito de campo.
- `Login.tsx` → após sucesso:
  - `lideranca_campo` → `navigate("/campo")`
  - demais → `navigate("/")`
- Criar guarda extra: usuários `lideranca_campo` tentando acessar rotas fora de `/campo/*` são redirecionados para `/campo`.

### 3. Layout mobile-first para o perfil Campo
- Novo wrapper `CampoLayout` (sem `AppSidebar`), com header enxuto:
  - Nome do usuário + botão Sair (já existe no `AppLayout`, replicar minimal).
  - Bottom-nav fixa com 3 ícones: Ação · Lideranças · Dashboard.
- Aplicar somente nas rotas `/campo/*` quando o usuário for `lideranca_campo`.

### 4. Tela "Instalar app"
- Pequeno componente `InstallPrompt` que:
  - No Android/Chrome: captura `beforeinstallprompt` e mostra botão "Instalar app".
  - No iOS Safari: mostra instrução "Compartilhar → Adicionar à Tela de Início".
- Aparece como banner discreto no `/campo` (lideranças) e no `/` (gestores) na primeira visita mobile.

### 5. Papel novo no RBAC (se ainda não existir)
- Verificar se já existe papel para liderança que cadastra apenas no campo. Se não, adicionar `lideranca_campo` na enum `app_role` via migration e ajustar policies relevantes (apenas leitura/escrita do que ela mesma cria em `actions`, `political_assets`, `field_leaders`).

## O que **NÃO** vamos fazer agora
- Service worker / modo offline (não foi pedido — evita complexidade e cache stale no preview).
- App nativo Capacitor / publicação em App Store ou Play Store.
- Push notifications.
- App separado em outro repositório.

## Arquivos a tocar
- `public/manifest.webmanifest` (atualizar)
- `index.html` (meta tags PWA + ícones)
- `src/assets/pwa/*` (ícones gerados)
- `src/pages/Login.tsx` (redirect por papel)
- `src/components/auth/ProtectedRoute.tsx` (guarda de papel restrito)
- `src/components/layout/CampoLayout.tsx` (novo, mobile)
- `src/components/layout/InstallPrompt.tsx` (novo)
- `src/App.tsx` (envolver rotas `/campo/*` com `CampoLayout` quando perfil for liderança)
- Migration (se necessário) para papel `lideranca_campo`

Quer que eu siga por esse caminho? Se sim, me confirme o nome do papel/role que as lideranças de campo devem ter (ou se posso usar `lideranca_campo`).
