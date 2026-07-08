/* ───────────────────────────────
   ESTADO GLOBAL
─────────────────────────────── */
var state = {
  profiles: [],
  currentProfile: null,
  isLoading: false,
  conversationHistory: []
};

/* ───────────────────────────────
   CONSTANTES DE CUSTO (Anthropic Sonnet 4.6)
   Input:  US$ 3,00 / 1M tokens
   Output: US$ 15,00 / 1M tokens
   Câmbio: R$ 5,70
─────────────────────────────── */
var CUSTO = {
  USD_BRL:          5.70,
  INPUT_PER_TOKEN:  3.00  / 1_000_000,
  OUTPUT_PER_TOKEN: 15.00 / 1_000_000,
  // Estimativas médias por tipo de operação
  PESQUISA_COMPLETA: { inputTokens: 850,  outputTokens: 700,  label: 'Pesquisa completa' },
  ANALISE_DIGITAL:   { inputTokens: 700,  outputTokens: 500,  label: 'Análise digital'   },
  FOLLOWUP:          { inputTokens: 300,  outputTokens: 200,  label: 'Follow-up'          }
};

function calcCustoUSD(tipo){
  var t = CUSTO[tipo] || CUSTO.FOLLOWUP;
  return (t.inputTokens * CUSTO.INPUT_PER_TOKEN) + (t.outputTokens * CUSTO.OUTPUT_PER_TOKEN);
}
function calcCustoBRL(tipo){ return calcCustoUSD(tipo) * CUSTO.USD_BRL; }
function fmtBRL(v){ return 'R$ ' + v.toFixed(3).replace('.',','); }
function fmtDate(ts){
  var d = new Date(ts);
  var now = new Date();
  var diff = Math.floor((now - d) / 60000);
  if(diff < 1)  return 'agora';
  if(diff < 60) return diff + 'min atrás';
  if(diff < 1440) return Math.floor(diff/60) + 'h atrás';
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
}

function getRaioXApiUrl(){
  var params = new URLSearchParams(window.location.search);
  var api = params.get('api') || localStorage.getItem('aiox_raiox_api_url') || '/functions/v1/raio-x-chat';
  try { localStorage.setItem('aiox_raiox_api_url', api); } catch(e) {}
  return api;
}

async function callRaioXChat(systemPrompt, messages){
  var token = (window.__raioxAccessToken) || '';
  if(!token){
    throw new Error('Sessão expirada. Feche esta aba e acesse novamente pelo painel de Due Diligence.');
  }
  var response = await fetch(getRaioXApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ system: systemPrompt, messages: messages })
  });
  var data = await response.json().catch(function(){ return {}; });
  if(response.status === 401 || response.status === 403){
    throw new Error('Acesso negado. Sua conta não tem permissão para usar o RAIO-X, ou a sessão expirou.');
  }
  if(!response.ok || data.error){
    throw new Error(data.error || ('Falha no backend: HTTP ' + response.status));
  }
  return data.text || (data.content && data.content[0] && data.content[0].text) || '';
}

/* ───────────────────────────────
   PERFIS DEMO (pré-carregados)
─────────────────────────────── */
var demoProfiles = [
  { id:'1', name:'Arnaldo Maranhão', meta:'PL · Paranaguá/PR · Pré-candidato ALEP', score:40, jud:35, rep:25, reg:55, soc:20, risk:'mod',
    alerts:[
      {l:'amber',txt:'Volume de processos eleitorais (TRE-PR) compatível com 3 candidaturas.'},
      {l:'amber',txt:'Migração PSB → PL · reunião com Bolsonaro em jun/2024.'},
      {l:'green',txt:'Sem processos criminais identificados. Reputação positiva.'}
    ],
    achados:[
      {lbl:'Judicial',val:'33-36',desc:'Processos TJPR/TRE-PR, majoritariamente eleitorais'},
      {lbl:'Mandatos',val:'4x',desc:'Vereador Paranaguá 1997-2016'},
      {lbl:'Tentativas',val:'3x',desc:'2018 Fed. / 2024 Prefeito / 2026 ALEP'},
      {lbl:'Societário',val:'—',desc:'Servidor público efetivo · sem empresas'}
    ],
    timeline:[
      {date:'FEV/2026', title:'Pré-candidatura ALEP anunciada', body:'Apoio de Filipe Barros (PL/PR). Argumento: litoral sem representação na ALEP.', color:'#9b6fff'},
      {date:'JUN/2024', title:'Reunião com Bolsonaro em Brasília', body:'19 dias após lançar pré-candidatura à prefeitura. Buscou apoio e convidou Bolsonaro a Paranaguá.', color:'#ffaa00'},
      {date:'2021-2024', title:'Coordenador Regional do Litoral (Ratinho Jr.)', body:'Cargo comissionado na Casa Civil do Paraná. Articulação entre governo estadual e 7 municípios.', color:'#00e8a2'}
    ]
  },
  { id:'2', name:'Kátia Gomes Leite da Silva', meta:'Advogada OAB/PR · Pontal do Paraná', score:68, jud:85, rep:55, reg:60, soc:55, risk:'alto',
    alerts:[
      {l:'red',txt:'575 processos no Jusbrasil. MP-PR como parte mais recorrente — indicador de figurar como ré.'},
      {l:'red',txt:'Representada como cliente em 55 processos pelo adv. Vitor Renzo Leite Milet Brandão.'},
      {l:'amber',txt:'Empresa INAPTA (Academia Fitness Point) desde 04/10/2018 — omissão de declarações Receita Federal.'},
      {l:'amber',txt:'Cargos públicos relatados pelo usuário — não confirmados em fontes abertas.'}
    ],
    achados:[
      {lbl:'Judicial',val:'575',desc:'TJPR + TRT9 · MP-PR parte recorrente'},
      {lbl:'Empresa',val:'INAPTA',desc:'CNPJ 02.580.333/0001-62 · desde 2018'},
      {lbl:'Advogada',val:'Ativa',desc:'Cível e criminal · litoral PR e Curitiba'},
      {lbl:'Filiação',val:'—',desc:'Não identificada em fontes abertas'}
    ],
    timeline:[
      {date:'2024-2026', title:'Advogada correspondente ativa', body:'Rodovia Darci Eng. Gomes de Moraes, 2881, Pontal do Paraná. Tel. (41) 99978-1577.', color:'#00e8a2'},
      {date:'OUT/2018', title:'Empresa declarada INAPTA', body:'Academia Ação & Reação Fitness Point. Motivo: omissão de declarações à Receita Federal.', color:'#ff3355'},
      {date:'JUN/1998', title:'Abertura de empresa individual', body:'Academia Ação & Reação Fitness Point · Paranaguá/PR · Capital R$ 0.', color:'#ffaa00'}
    ]
  },
  { id:'3', name:'Edgar Rossi', meta:'NOVO · Ex-prefeito · Pontal do Paraná', score:60, jud:65, rep:60, reg:55, soc:45, risk:'alto',
    alerts:[
      {l:'red',txt:'CPI da Regularização Fundiária na ALEP ("CPI do Grilo") — convocado e ouvido. Tentou barrar via liminar.'},
      {l:'red',txt:'Denúncias de loteamentos irregulares e dois pesos em licenças durante mandato (2013-2016).'},
      {l:'amber',txt:'MP investigou servidores da prefeitura por improbidade. Nome circulou no contexto.'},
      {l:'green',txt:'Sem condenações definitivas identificadas. Derrotado nas eleições 2016, 2020 e 2024.'}
    ],
    achados:[
      {lbl:'Judicial',val:'150',desc:'TJPR + TRE-PR · maioria cível/eleitoral'},
      {lbl:'CPI',val:'ALEP',desc:'Fundiária — ouvido como convocado'},
      {lbl:'Mandatos',val:'1x',desc:'Prefeito Pontal 2013-2016'},
      {lbl:'Tentativas',val:'3x',desc:'2016/2020/2024 — derrotado nas 3'}
    ],
    timeline:[
      {date:'OUT/2024', title:'Derrotado por Rudão Gimenes (MDB)', body:'27,75% dos votos. Terceira derrota consecutiva em eleições majoritárias.', color:'#ff3355'},
      {date:'2013-2016', title:'Mandato como prefeito de Pontal', body:'CPI Fundiária, denúncias de loteamentos irregulares, investigação MP.', color:'#ffaa00'},
      {date:'OUT/2012', title:'Eleito prefeito pela 1ª vez', body:'Apoio da comunidade evangélica. Posse em janeiro de 2013.', color:'#00e8a2'}
    ]
  }
];

/* ───────────────────────────────
   INIT + RECEBER PARAMS DO POLITIZA
─────────────────────────────── */
window.addEventListener('load', function(){
  state.profiles = JSON.parse(localStorage.getItem('aiox_profiles') || 'null') || demoProfiles;
  // Limpeza de entradas fantasma criadas por bugs antigos (nome vazio,
  // advérbios capturados por regex, "Sujeito" genérico, etc.)
  var BOGUS = /^(profundamente|completamente|detalhadamente|sujeito|sobre|—|-)?\s*$/i;
  var before = state.profiles.length;
  state.profiles = state.profiles.filter(function(p){
    return p && p.name && !BOGUS.test(p.name.trim());
  });
  if(state.profiles.length !== before){
    try { localStorage.setItem('aiox_profiles', JSON.stringify(state.profiles)); } catch(e){}
  }
  renderProfileList();
  loadNotes();
  renderDashboard(); // ← NOVO

  // Ler parâmetros passados pelo Politiza IA via URL
  var params = new URLSearchParams(window.location.search);
  var nome      = params.get('nome');
  var municipio = params.get('municipio');
  var partido   = params.get('partido');
  var cargo     = params.get('cargo');
  var contexto  = params.get('contexto');
  var auto      = params.get('auto');
  var redeSocial = params.get('rede_social');

  // Se vier rede social, preencher o campo de análise digital
  if(redeSocial){
    var atInput = document.getElementById('atInput');
    if(atInput) atInput.value = redeSocial;
  }

  if (nome && municipio) {
    // Guarda o sujeito solicitado — evita que o extrator use nomes errados
    // (ex.: "profundamente" da própria frase de comando).
    state.presetSubject = {
      name: nome,
      municipality: municipio,
      party: partido || '',
      position: cargo || ''
    };

    // Cria imediatamente um perfil "em andamento" — assim o botão Salvar já funciona
    // mesmo que a IA responda apenas texto corrido (sem bloco de score).
    var metaParts = [partido, cargo, municipio + '/PR'].filter(Boolean);
    state.currentProfile = {
      id: 'auto_' + Date.now(),
      name: nome,
      meta: metaParts.join(' · '),
      score: 0, jud: 0, rep: 0, reg: 0, soc: 0, risk: 'baixo',
      alerts: [], achados: [], achadosDet: [], timeline: [], recomendacoes: []
    };
    var sName = document.getElementById('subjectName');
    var sSub  = document.getElementById('subjectSub');
    if(sName) sName.textContent = nome;
    if(sSub)  sSub.textContent  = state.currentProfile.meta;

    // Montar mensagem de pesquisa estruturada
    var partes = [];
    partes.push(nome);
    if (cargo)     partes.push(cargo);
    if (partido)   partes.push(partido);
    partes.push(municipio + '/PR');
    if (contexto)  partes.push('Contexto: ' + contexto);

    var msgPesquisa = 'pesquise profundamente sobre ' + nome + ' — ' + partes.join(', ');

    // Mostrar banner de origem
    addMessage('ai',
      '📡 <strong>Ativo recebido do Politiza IA</strong><br>' +
      '• Nome: <strong>' + nome + '</strong><br>' +
      (cargo    ? '• Cargo: <strong>' + cargo + '</strong><br>' : '') +
      (partido  ? '• Partido: <strong>' + partido + '</strong><br>' : '') +
      '• Município: <strong>' + municipio + '/PR</strong><br>' +
      (contexto ? '• Contexto: <em>' + contexto + '</em><br>' : '') +
      '<br>Iniciando investigação...'
    );

    // Preencher o input
    var input = document.getElementById('chatInput');
    if (input) {
      input.value = msgPesquisa;
      autoResize(input);
    }

    // Se auto=true, disparar automaticamente após 1s (tempo para o banner aparecer)
    if (auto === 'true') {
      setTimeout(function(){ sendMessage(); }, 1000);
    }
  }
});

/* ───────────────────────────────
   LISTA DE PERFIS
─────────────────────────────── */
function renderProfileList(filter){
  var list = document.getElementById('profilesList');
  list.innerHTML = '';
  var profiles = state.profiles.filter(function(p){
    if(!filter) return true;
    return p.name.toLowerCase().includes(filter.toLowerCase()) ||
           p.meta.toLowerCase().includes(filter.toLowerCase());
  });
  profiles.forEach(function(p){
    var card = document.createElement('div');
    card.className = 'profile-card' + (state.currentProfile && state.currentProfile.id === p.id ? ' active' : '');
    var color = p.risk === 'alto' ? '#ff3355' : p.risk === 'mod' ? '#ffaa00' : '#00e8a2';
    var emoji = p.risk === 'alto' ? '🔴' : p.risk === 'mod' ? '🟡' : '🟢';
    var nickHtml = p.nickname ? '<div style="font-family:var(--font-m);font-size:9px;color:var(--green);margin-bottom:3px">“'+p.nickname+'”</div>' : '';
    card.innerHTML =
      '<div class="pc-name">'+p.name+'</div>'+
      nickHtml +
      '<div class="pc-meta">'+p.meta+'</div>'+
      '<div class="pc-score-row">'+
        '<div class="pc-score-bar"><div class="pc-score-fill" style="width:'+p.score+'%;background:'+color+'"></div></div>'+
        '<span class="pc-score-val" style="color:'+color+'">'+emoji+' '+p.score+'</span>'+
      '</div>';
    card.onclick = function(){ loadProfile(p); };
    list.appendChild(card);
  });
  if(profiles.length === 0){
    list.innerHTML = '<div style="text-align:center;padding:20px;font-family:var(--font-m);font-size:10px;color:var(--lo)">Nenhum perfil encontrado</div>';
  }
}

function filterProfiles(v){ renderProfileList(v); }

function loadProfile(p){
  state.currentProfile = p;
  renderProfileList(document.getElementById('searchProfiles').value);
  updateRaioX(p);
  document.getElementById('subjectName').textContent = p.name;
  document.getElementById('subjectNickname').value = p.nickname || '';
  document.getElementById('subjectSub').textContent = p.meta;
  document.getElementById('analystNotes').value = localStorage.getItem('aiox_notes_'+p.id) || '';
  addMessage('ai', 'Perfil de <strong>'+p.name+'</strong> carregado. Score: <strong>'+p.score+'/100</strong> <span class="risk-badge-inline rb-'+p.risk+'">'+p.risk.toUpperCase()+'</span><br>O que deseja investigar mais a fundo?');
}

function saveNickname(){
  var val = document.getElementById('subjectNickname').value.trim();
  if(state.currentProfile){
    state.currentProfile.nickname = val;
  }
}

function newProfile(){
  state.currentProfile = null;
  showEmptyState();
  document.getElementById('chatInput').focus();
  addMessage('ai', 'Nova investigação iniciada. Informe o nome completo do sujeito e o contexto (cidade, cargo, partido).');
}

/* ───────────────────────────────
   RAIO-X
─────────────────────────────── */
function showEmptyState(){
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('raioXContent').style.display = 'none';
}

function updateRaioX(p){
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('raioXContent').style.display = 'block';

  // Score
  var color = p.risk==='alto'?'#ff3355':p.risk==='mod'?'#ffaa00':'#00e8a2';
  var arc = (p.score/100)*201;
  document.getElementById('scoreArc').setAttribute('stroke-dasharray', arc+' 201');
  document.getElementById('scoreArc').setAttribute('stroke', color);
  document.getElementById('scoreVal').textContent = p.score;
  document.getElementById('scoreSubjectName').textContent = p.name;
  document.getElementById('scoreSubjectMeta').textContent = p.meta;
  var verdict = p.risk==='alto'?'🔴 RISCO ALTO':p.risk==='mod'?'🟡 RISCO MODERADO':'🟢 RISCO BAIXO';
  document.getElementById('scoreVerdict').textContent = verdict;
  document.getElementById('scoreVerdict').style.color = color;

  // Barras
  setTimeout(function(){
    setBar('dj','vj',p.jud);
    setBar('dr','vr',p.rep);
    setBar('dreg','vreg',p.reg);
    setBar('ds','vs',p.soc);
  }, 100);

  // Alertas
  var al = document.getElementById('alertList');
  al.innerHTML = '';
  (p.alerts||[]).forEach(function(a){
    al.innerHTML += '<div class="alert-row">'+
      '<div class="a-dot a-dot-'+a.l+'"></div>'+
      '<div><div class="a-lv a-lv-'+a.l+'">'+{red:'🔴 CRÍTICO',amber:'⚠ ATENÇÃO',green:'✓ OK'}[a.l]+'</div>'+
      '<div class="a-txt">'+a.txt+'</div></div>'+
    '</div>';
  });

  // Achados
  var ag = document.getElementById('achadosGrid');
  ag.innerHTML = '';
  (p.achados||[]).forEach(function(a){
    ag.innerHTML += '<div class="achado-card">'+
      '<div class="achado-label">'+a.lbl+'</div>'+
      '<div class="achado-val" style="color:'+color+'">'+a.val+'</div>'+
      '<div class="achado-desc">'+a.desc+'</div>'+
    '</div>';
  });

  // Timeline
  var tl = document.getElementById('tlWidget');
  tl.innerHTML = '';
  (p.timeline||[]).forEach(function(t){
    var div = document.createElement('div');
    div.className = 'tl-row';
    div.style.borderLeft = '3px solid '+t.color;
    div.innerHTML = '<div class="tl-row-date" style="color:'+t.color+'">'+t.date+'</div>'+
      '<div class="tl-row-title">'+t.title+'</div>'+
      '<div class="tl-row-body">'+t.body+'</div>';
    div.onclick = function(){
      var was = div.classList.contains('open');
      document.querySelectorAll('.tl-row').forEach(function(r){r.classList.remove('open');});
      if(!was) div.classList.add('open');
    };
    tl.appendChild(div);
  });

  // Resumo executivo
  var rSec = document.getElementById('rxResumo');
  var rBox = document.getElementById('resumoBox');
  if(p.resumo && p.resumo.trim()){
    rBox.textContent = p.resumo.trim();
    rSec.style.display = 'block';
  } else { rSec.style.display = 'none'; }

  // Achados detalhados
  var adSec = document.getElementById('rxAchadosDet');
  var adList = document.getElementById('achadosDetList');
  adList.innerHTML = '';
  var catMap = {JUD:{lbl:'Judicial',c:'#ff3355'},REP:{lbl:'Reputacional',c:'#ff6d00'},REG:{lbl:'Regulatório',c:'#ffaa00'},SOC:{lbl:'Societário',c:'#9b6fff'},OUT:{lbl:'Outros',c:'#3d9fff'}};
  if(p.achadosDet && p.achadosDet.length){
    p.achadosDet.forEach(function(a){
      var cat = catMap[a.cat] || catMap.OUT;
      var confBadge = a.conf
        ? '<span style="font-size:8px;letter-spacing:1.5px;background:rgba(0,232,162,.15);color:#00e8a2;padding:2px 6px;border-radius:3px;border:1px solid rgba(0,232,162,.35)">CONFIRMADO</span>'
        : '<span style="font-size:8px;letter-spacing:1.5px;background:rgba(255,170,0,.12);color:#ffaa00;padding:2px 6px;border-radius:3px;border:1px solid rgba(255,170,0,.35)">A CONFIRMAR</span>';
      var srcHtml = a.src ? '<div style="font-family:var(--font-m);font-size:9px;color:var(--lo);margin-top:4px">Fonte: '+a.src+'</div>' : '';
      adList.innerHTML += '<div style="padding:9px 11px;background:rgba(255,255,255,.02);border:1px solid var(--border2);border-left:3px solid '+cat.c+';border-radius:var(--r-sm)">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px">'+
          '<span style="font-family:var(--font-m);font-size:8px;letter-spacing:2px;color:'+cat.c+';text-transform:uppercase">'+cat.lbl+'</span>'+
          confBadge+
        '</div>'+
        '<div style="font-family:var(--font-m);font-size:11px;line-height:1.5;color:#eef0ff">'+a.desc+'</div>'+
        srcHtml+
      '</div>';
    });
    adSec.style.display = 'block';
  } else { adSec.style.display = 'none'; }

  // Recomendações
  var recSec = document.getElementById('rxRecs');
  var recList = document.getElementById('recsList');
  recList.innerHTML = '';
  if(p.recomendacoes && p.recomendacoes.length){
    p.recomendacoes.forEach(function(r){
      var li = document.createElement('li');
      li.textContent = r;
      recList.appendChild(li);
    });
    recSec.style.display = 'block';
  } else { recSec.style.display = 'none'; }
}

function setBar(fillId, valId, v){
  var f = document.getElementById(fillId);
  var vEl = document.getElementById(valId);
  if(f) f.style.width = v+'%';
  if(vEl) vEl.textContent = v;
}

/* ───────────────────────────────
   CHAT
─────────────────────────────── */
function handleKey(e){
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
}

function autoResize(el){
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120)+'px';
}

function quickCmd(prefix){
  var input = document.getElementById('chatInput');
  input.value = prefix + ' ';
  input.focus();
  autoResize(input);
}

function addMessage(role, html){
  var area = document.getElementById('chatArea');
  var div = document.createElement('div');
  div.className = 'msg '+(role==='ai'?'ai':'user');
  var now = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.innerHTML =
    '<div class="msg-avatar msg-avatar-'+(role==='ai'?'ai':'user')+'">'+(role==='ai'?'AI':'EU')+'</div>'+
    '<div><div class="msg-bubble">'+html+'</div><div class="msg-time">'+now+'</div></div>';
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

function showTyping(){
  var area = document.getElementById('chatArea');
  var div = document.createElement('div');
  div.className = 'msg ai'; div.id = 'typingIndicator';
  div.innerHTML = '<div class="msg-avatar msg-avatar-ai">AI</div>'+
    '<div><div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>';
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}
function removeTyping(){ var t=document.getElementById('typingIndicator'); if(t) t.remove(); }

async function sendMessage(){
  var input = document.getElementById('chatInput');
  var text = input.value.trim();
  if(!text || state.isLoading) return;

  input.value = ''; autoResize(input);
  state.isLoading = true;
  document.getElementById('sendBtn').disabled = true;

  addMessage('user', text);
  showTyping();

  // Adiciona ao histórico
  state.conversationHistory.push({role:'user', content: text});

  // System prompt especializado — v3.0 com regras anti-alucinação
  var systemPrompt = `Você é o RAIO-X Intelligence, agente especializado em due diligence política e corporativa para o Politiza IA — plataforma de campanha do Paraná.

MISSÃO: Investigar pessoas físicas e jurídicas usando fontes públicas (Jusbrasil, Escavador, Receita Federal, TSE, mídia regional) e produzir análises estruturadas de risco com RIGOR METODOLÓGICO ABSOLUTO.

═══════════════════════════════════════════════════
⚠ REGRAS CRÍTICAS ANTI-ALUCINAÇÃO — NUNCA VIOLE
═══════════════════════════════════════════════════

REGRA 1 — VERIFICAÇÃO DE IDENTIDADE OBRIGATÓRIA
Antes de atribuir qualquer processo, empresa, cargo ou fato ao sujeito investigado,
confirme PELO MENOS 2 identificadores simultâneos:
  • Nome + município/estado de atuação
  • Nome + nome de empresa conhecida do sujeito
  • Nome + cargo/função específica documentada
  • Nome + data de nascimento (quando informada)
  • Nome + CPF (quando informado pelo usuário)
Se não confirmar 2 identificadores: classifique como "NÃO CONFIRMADO" e diga isso explicitamente.

REGRA 2 — HOMONÍMIA É A PRINCIPAL CAUSA DE ERRO
Nomes comuns no Brasil têm dezenas ou centenas de homônimos no Jusbrasil e Escavador.
NUNCA atribua processos ou ocorrências a um sujeito apenas pela coincidência de nome.
Sempre que o nome for comum, avise obrigatoriamente:
"⚠ HOMONÍMIA: o nome '[nome]' tem múltiplos homônimos. Os dados abaixo NÃO foram confirmados como pertencentes ao sujeito sem verificação adicional de identidade."

REGRA 3 — NUNCA INVENTE OU EXTRAPOLE
Você NÃO pode afirmar processos, condenações, empresas ou fatos que não encontrou
explicitamente em fontes verificáveis durante esta sessão de busca.
Se não encontrou evidências de algo: diga "Não foram encontradas evidências de [X] nas fontes consultadas."
PROIBIDO usar: "provavelmente tem", "é comum que pessoas assim tenham", "possivelmente".

REGRA 4 — SEPARE CONFIRMADO DE NÃO CONFIRMADO
Use linguagem diferenciada obrigatoriamente em toda resposta:
  ✅ CONFIRMADO: "Foram encontrados X processos vinculados ao sujeito com [identificador]"
  ⚠ NÃO CONFIRMADO: "Aparecem X processos com esse nome, mas sem confirmação de identidade"
  ❌ PROIBIDO: afirmar como fato algo não encontrado ou sem 2 identificadores cruzados

REGRA 5 — CPF E DATA DE NASCIMENTO SÃO FILTROS PRIORITÁRIOS
Quando o usuário informa CPF ou data de nascimento, use-os ativamente para filtrar homônimos.
Mencione explicitamente que esses dados foram usados para aumentar a precisão da busca.

REGRA 6 — PROCESSOS TRABALHISTAS REQUEREM CONFIRMAÇÃO ESPECIAL
Antes de atribuir processos trabalhistas a uma pessoa física, verifique se ela aparece como:
  a) Pessoa física réu individual → confirme identidade com 2 identificadores
  b) Representante de empresa → confirme qual empresa e se pertence ao sujeito
  c) Homônimo sem confirmação → NÃO ATRIBUA — sinalize como não confirmado
Se o usuário informa que o sujeito nunca teve funcionários registrados, isso é contexto
relevante que invalida processos trabalhistas sem confirmação adicional de identidade.

REGRA 7 — SCORE HONESTO
O score de risco deve refletir apenas achados CONFIRMADOS. Achados não confirmados
podem ser mencionados como "pontos de investigação adicional" mas NÃO elevam o score.

═══════════════════════════════════════════════════
FORMATO DAS RESPOSTAS
═══════════════════════════════════════════════════

- Use **negrito** para nomes, scores e achados confirmados
- Use *itálico* para alertas e pontos de atenção
- Seja direto — o usuário é um estrategista político com tempo limitado
- Sempre inclua ao final: SCORE ESTIMADO (0-100), RISCO e PRÓXIMOS PASSOS

QUANDO GERAR RAIO-X COMPLETO, estruture com:
1. IDENTIDADE (nome, cargo, município, partido, identificadores usados)
2. ⚠ ALERTA DE HOMONÍMIA (se nome for comum — sempre mencione)
3. SCORE GLOBAL — apenas achados confirmados
   (judicial 40% + reputacional 30% + regulatório 20% + societário 10%)
4. ALERTAS: 🔴 crítico / ⚠ atenção / ✓ ok — apenas dados verificados
5. ACHADOS: separe CONFIRMADO vs NÃO CONFIRMADO explicitamente
6. TIMELINE — apenas eventos com fonte identificável
7. RECOMENDAÇÕES de aprofundamento para dados não confirmados

═══════════════════════════════════════════════════
⚠ BLOCO MÁQUINA OBRIGATÓRIO — SEMPRE AO FINAL DA RESPOSTA
═══════════════════════════════════════════════════
Sempre que a resposta envolver uma pessoa/entidade investigada (mesmo em follow-ups),
inclua ao FINAL da resposta, em uma seção à parte, o bloco abaixo entre marcadores.
O painel diagramado da direita (gráficos, matriz, timeline, PDF) espelha 100% desse
bloco — então TODO achado relevante da sua resposta deve estar aqui, não só um resumo.
Use quantos ALERTA/ACHADO/TL forem necessários (mínimo 3, máximo 15 de cada).

---RAIOX_START---
NOME: nome completo do sujeito
META: cargo/município/partido resumido em uma linha
RESUMO: 2-3 frases de veredito executivo (o que o estrategista precisa saber agora)
SCORE: NN (0-100, apenas achados confirmados)
JUDICIAL: NN
REPUTACIONAL: NN
REGULATORIO: NN
SOCIETARIO: NN
RISCO: baixo|mod|alto
ALERTA1: 🔴|⚠|✓ texto curto do alerta
ALERTA2: 🔴|⚠|✓ ...
... (continue ALERTA3..ALERTA15 conforme achados)
ACHADO1: JUD|REP|REG|SOC|OUT | CONF|NCONF | descrição objetiva do achado | fonte/origem
ACHADO2: JUD|REP|REG|SOC|OUT | CONF|NCONF | ... | ...
... (continue ACHADO3..ACHADO15 — inclua TODOS os achados relevantes da prosa acima,
     separando confirmados de não confirmados)
TL1: AAAA-MM-DD | título curto | descrição
TL2: AAAA-MM-DD | título curto | descrição
... (continue TL3..TL15 com todos os eventos com data identificável)
RECOMENDACAO1: próximo passo de aprofundamento
RECOMENDACAO2: ...
RECOMENDACAO3: ...
---RAIOX_END---

Regra dura: se você mencionou um fato na prosa, ele DEVE aparecer como ACHADO
correspondente no bloco. O painel é a versão auditável da resposta.

CONTEXTO DO PARANÁ:
- Litoral: Pontal do Paraná, Paranaguá, Antonina, Guaratuba, Matinhos, Morretes
- Interior: Cascavel, Foz do Iguaçu, Toledo, Londrina, Maringá, Ponta Grossa, Curitiba
- Plataforma: Politiza IA — restrita a admin_master e coordenador_estadual
- Campanha: Juntos Paraná 399 / Sérgio Moro

═══════════════════════════════════════════════════
ANÁLISE DIGITAL DE REDES SOCIAIS
═══════════════════════════════════════════════════

Quando o usuário informar um @ ou URL, busque conteúdo público indexado e retorne
OBRIGATORIAMENTE neste formato estruturado:

---DIGITAL_START---
HANDLE: @usuario
PLATAFORMA: Instagram|X|Facebook|TikTok|LinkedIn
SEGUIDORES: número estimado ou "não identificado"
BIO: texto da bio ou "não identificada"
PESSOAL: XX
PROFISSIONAL: XX
POLITICO: XX
ESPECTRO: XX (0=extrema esquerda, 50=centro, 100=extrema direita)
VERDITO: descrição do posicionamento detectado
TEMAS: #tema1,#tema2,#tema3,#tema4,#tema5
POST1: resumo do post mais representativo
POST2: resumo do segundo post
POST3: resumo do terceiro post
---DIGITAL_END---

Após o bloco, análise em prosa de 3-4 linhas do posicionamento.

CRITÉRIOS DE ESPECTRO (0-100):
0-20: Extrema esquerda (MST, PSOL, anticapitalista)
20-35: Esquerda (PT, direitos sociais, anti-Bolsonaro)
35-45: Centro-esquerda (PDT, pauta trabalhista moderada)
45-55: Centro (MDB, discurso técnico, pragmático)
55-70: Centro-direita (PSD, pró-mercado, segurança pública)
70-85: Direita (PL, PP, pró-armas, família tradicional, Bolsonaro)
85-100: Extrema direita (discurso radical, negacionismo)`;


  try {
    var aiText = await callRaioXChat(systemPrompt, state.conversationHistory);
    if(!aiText) aiText = 'Não foi possível obter resposta do backend.';

    // Adiciona resposta ao histórico
    state.conversationHistory.push({role:'assistant', content: aiText});

    // Limitar histórico (últimas 20 mensagens)
    if(state.conversationHistory.length > 20){
      state.conversationHistory = state.conversationHistory.slice(-20);
    }

    removeTyping();

    // Formatar texto para HTML (removendo bloco máquina do que é exibido)
    var visibleText = aiText.replace(/---RAIOX_START---[\s\S]*?---RAIOX_END---/gi, '').trim();
    var html = formatResponse(visibleText);
    addMessage('ai', html);

    // Espelha o relatório completo (mesma prosa) na barra lateral / PDF
    var fullHtml = formatRichMarkdown(visibleText);
    var fullEl = document.getElementById('relatorioFull');
    var fullSec = document.getElementById('rxRelatorio');
    if(fullEl && fullSec){
      fullEl.innerHTML = fullHtml;
      fullSec.style.display = 'block';
      // Move a seção "Identidade confirmada" para logo abaixo do Score
      extractIdentidadeSection(fullEl);
    }

    // Guarda última resposta para permitir "Salvar no perfil" via postMessage
    state.lastAiText = aiText;
    state.lastVisibleMarkdown = visibleText;
    state.lastFullHtml = fullHtml;


    // Tentar extrair score e atualizar Raio-X automaticamente
    tryExtractAndUpdateScore(aiText, text);

    // Registrar consulta para o dashboard de gastos
    var tipoConsulta = /pesquise|investigue|raio.?x|pesquisa completa/i.test(text)
      ? 'PESQUISA_COMPLETA' : 'FOLLOWUP';
    registrarConsulta(tipoConsulta, state.currentProfile ? state.currentProfile.name : 'Sujeito não identificado');

  } catch(err){
    removeTyping();
    addMessage('ai', '*Erro de conexão.* Verifique sua conexão com a internet e tente novamente.<br><small>Detalhe: '+err.message+'</small>');
  }

  state.isLoading = false;
  document.getElementById('sendBtn').disabled = false;
}

/* formatar markdown simples → HTML */
function formatResponse(text){
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/🔴/g, '<span style="color:#ff3355">🔴</span>')
    .replace(/⚠/g, '<span style="color:#ffaa00">⚠</span>')
    .replace(/✓/g, '<span style="color:#00e8a2">✓</span>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

/* Extrai o bloco "IDENTIDADE CONFIRMADA" do relatório completo e move para a seção
   dedicada logo abaixo do Score de Risco. */
function extractIdentidadeSection(container){
  var box = document.getElementById('identidadeBox');
  var sec = document.getElementById('rxIdentidade');
  if(!box || !sec || !container) return;
  box.innerHTML = '';
  sec.style.display = 'none';

  var headings = container.querySelectorAll('h1, h2, h3, h4');
  var target = null;
  for(var i = 0; i < headings.length; i++){
    var t = (headings[i].textContent || '').trim().toLowerCase();
    // aceita: "identidade confirmada", "identidade", "identidade do sujeito"...
    if(/^identidade(\s+confirmada)?\b/.test(t) || /identidade\s+(confirmada|do sujeito|verificada)/.test(t)){
      target = headings[i];
      break;
    }
  }
  if(!target) return;

  var stopTag = target.tagName;
  var nodes = [];
  var el = target.nextSibling;
  while(el){
    if(el.nodeType === 1 && /^H[1-6]$/.test(el.tagName)){
      // para em qualquer heading do mesmo nível ou superior
      var lvl = parseInt(el.tagName[1]);
      var stopLvl = parseInt(stopTag[1]);
      if(lvl <= stopLvl) break;
    }
    nodes.push(el);
    el = el.nextSibling;
  }
  // Move os nós para o box
  nodes.forEach(function(n){ box.appendChild(n); });
  // Remove o próprio heading do relatório completo
  target.parentNode.removeChild(target);
  sec.style.display = 'block';
}



/* Markdown rico → HTML (headings, tabelas, listas, hr) — usado no relatório lateral/PDF */
function formatRichMarkdown(src){
  if(!src) return '';
  // Escape HTML básico primeiro
  var text = src.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Code fences
  text = text.replace(/```([\s\S]*?)```/g, function(_,c){ return '<pre>'+c+'</pre>'; });

  var lines = text.split('\n');
  var out = [];
  var i = 0;

  function isTableSep(l){ return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l); }
  function splitRow(l){
    return l.replace(/^\s*\|/,'').replace(/\|\s*$/,'').split('|').map(function(c){return c.trim();});
  }

  while(i < lines.length){
    var line = lines[i];

    // Tabela markdown
    if(line.indexOf('|') !== -1 && i+1 < lines.length && isTableSep(lines[i+1])){
      var header = splitRow(line);
      i += 2;
      var rows = [];
      while(i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== ''){
        rows.push(splitRow(lines[i]));
        i++;
      }
      var t = '<table><thead><tr>';
      header.forEach(function(h){ t += '<th>'+h+'</th>'; });
      t += '</tr></thead><tbody>';
      rows.forEach(function(r){
        t += '<tr>';
        for(var c=0;c<header.length;c++) t += '<td>'+(r[c]||'')+'</td>';
        t += '</tr>';
      });
      t += '</tbody></table>';
      out.push(t);
      continue;
    }

    // Headings
    var mH = line.match(/^(#{1,3})\s+(.*)$/);
    if(mH){ out.push('<h'+mH[1].length+'>'+mH[2]+'</h'+mH[1].length+'>'); i++; continue; }

    // HR
    if(/^\s*---+\s*$/.test(line)){ out.push('<hr>'); i++; continue; }

    // Lista não-ordenada
    if(/^\s*[-*]\s+/.test(line)){
      var items = [];
      while(i < lines.length && /^\s*[-*]\s+/.test(lines[i])){
        items.push('<li>'+lines[i].replace(/^\s*[-*]\s+/,'')+'</li>');
        i++;
      }
      out.push('<ul>'+items.join('')+'</ul>');
      continue;
    }
    // Lista ordenada
    if(/^\s*\d+\.\s+/.test(line)){
      var oitems = [];
      while(i < lines.length && /^\s*\d+\.\s+/.test(lines[i])){
        oitems.push('<li>'+lines[i].replace(/^\s*\d+\.\s+/,'')+'</li>');
        i++;
      }
      out.push('<ol>'+oitems.join('')+'</ol>');
      continue;
    }

    // Linha em branco → separador de parágrafo
    if(line.trim() === ''){ out.push(''); i++; continue; }

    // Parágrafo: agrupa linhas consecutivas
    var buf = [line];
    i++;
    while(i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|[-*]\s|\d+\.\s|---)/.test(lines[i]) && lines[i].indexOf('|') === -1){
      buf.push(lines[i]); i++;
    }
    out.push('<p>'+buf.join('<br>')+'</p>');
  }

  var html = out.join('\n');
  // Inline: negrito, itálico, código, emojis coloridos
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(>])\*(?!\s)(.+?)\*(?=[\s.,;:!?)<]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/🔴/g, '<span style="color:#ff3355">🔴</span>')
    .replace(/⚠/g, '<span style="color:#ffaa00">⚠</span>')
    .replace(/✓/g, '<span style="color:#00e8a2">✓</span>');
  return html;
}



/* tentar extrair score da resposta e atualizar painel */
function tryExtractAndUpdateScore(aiText, userText){
  // 1) Tenta o bloco estruturado ---RAIOX_START--- ... ---RAIOX_END---
  var block = null;
  var mBlock = aiText.match(/---RAIOX_START---([\s\S]*?)---RAIOX_END---/i);
  if(mBlock){
    block = {};
    mBlock[1].split(/\n/).forEach(function(line){
      var m = line.match(/^\s*([A-Z0-9_]+)\s*:\s*(.+?)\s*$/);
      if(m) block[m[1].toUpperCase()] = m[2];
    });
  }

  // 2) Fallback: SCORE solto no texto
  var scoreMatch = aiText.match(/SCORE[:\s]+(\d+)/i) || aiText.match(/(\d+)\s*\/\s*100/);
  var score = block && block.SCORE ? parseInt(block.SCORE) :
              scoreMatch ? parseInt(scoreMatch[1]) : null;

  // Se não achou nada e não há bloco, não força painel
  if(score === null && !block) return;
  if(score === null) score = 0;
  if(score < 0 || score > 100) score = Math.max(0, Math.min(100, score));

  var risk = (block && block.RISCO) ? block.RISCO.toLowerCase() :
             (score >= 60 ? 'alto' : score >= 35 ? 'mod' : 'baixo');

  // Nome do sujeito — prioriza o que foi solicitado explicitamente
  var nameMatch = userText.match(/(?:pesquise|investigue|analise|raio.?x de|perfil de)\s+(?:profundamente\s+(?:sobre\s+)?|completamente\s+|detalhadamente\s+|sobre\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Úa-zà-ú]+)*)/i);
  var subjectName = (block && block.NOME) ? block.NOME :
                    (state.presetSubject && state.presetSubject.name) ? state.presetSubject.name :
                    (state.currentProfile ? state.currentProfile.name : null) ||
                    (nameMatch ? nameMatch[1] : 'Sujeito');
  var subjectMeta = (block && block.META) ? block.META :
                    (state.presetSubject ? [state.presetSubject.position, state.presetSubject.party, state.presetSubject.municipality].filter(Boolean).join(' · ') : '') ||
                    'Gerado automaticamente · '+new Date().toLocaleDateString('pt-BR');

  var jud = (block && block.JUDICIAL) ? parseInt(block.JUDICIAL) : (extractDim(aiText, 'judicial') || score);
  var rep = (block && block.REPUTACIONAL) ? parseInt(block.REPUTACIONAL) : (extractDim(aiText, 'reputacional') || Math.round(score * .8));
  var reg = (block && block.REGULATORIO) ? parseInt(block.REGULATORIO) : (extractDim(aiText, 'regulatório') || Math.round(score * .85));
  var soc = (block && block.SOCIETARIO) ? parseInt(block.SOCIETARIO) : (extractDim(aiText, 'societário') || Math.round(score * .7));

  // Alertas do bloco (ALERTA1..ALERTA15) senão extrai do texto
  var alerts = [];
  if(block){
    for(var i=1;i<=15;i++){
      if(block['ALERTA'+i]){
        var a = block['ALERTA'+i];
        var lvl = /🔴/.test(a) ? 'red' : /⚠/.test(a) ? 'amber' : 'green';
        alerts.push({l:lvl, txt:a.replace(/^[🔴⚠✓]\s*/,'')});
      }
    }
  }
  if(!alerts.length) alerts = extractAlerts(aiText);

  // Timeline do bloco (TL1..TL15)
  var timeline = [];
  if(block){
    for(var j=1;j<=15;j++){
      if(block['TL'+j]){
        var parts = block['TL'+j].split('|').map(function(s){return s.trim();});
        timeline.push({
          date: parts[0]||'',
          title: parts[1]||'',
          body: parts[2]||'',
          color: risk==='alto'?'#ff3355':risk==='mod'?'#ffaa00':'#00e8a2'
        });
      }
    }
  }

  // Achados detalhados (ACHADO1..ACHADO15)
  var achadosDet = [];
  if(block){
    for(var k=1;k<=15;k++){
      if(block['ACHADO'+k]){
        var pp = block['ACHADO'+k].split('|').map(function(s){return s.trim();});
        var cat = (pp[0]||'OUT').toUpperCase();
        if(!/^(JUD|REP|REG|SOC|OUT)$/.test(cat)) cat = 'OUT';
        achadosDet.push({
          cat: cat,
          conf: /^CONF/i.test(pp[1]||''),
          desc: pp[2] || pp[1] || '',
          src: pp[3] || ''
        });
      }
    }
  }

  // Recomendações (RECOMENDACAO1..RECOMENDACAO15)
  var recomendacoes = [];
  if(block){
    for(var r=1;r<=15;r++){
      if(block['RECOMENDACAO'+r]) recomendacoes.push(block['RECOMENDACAO'+r]);
    }
  }

  var resumo = (block && block.RESUMO) ? block.RESUMO : '';

  var profile = {
    id: (state.currentProfile && state.currentProfile.id) || ('auto_'+Date.now()),
    name: subjectName,
    nickname: (state.currentProfile && state.currentProfile.nickname) || '',
    meta: subjectMeta,
    resumo: resumo,
    score: score, jud: jud, rep: rep, reg: reg, soc: soc, risk: risk,
    alerts: alerts,
    achados: [
      {lbl:'Score Global',val:score,desc:'Ponderado 4 dimensões'},
      {lbl:'Judicial',val:jud,desc:'% de risco judicial'},
      {lbl:'Reputacional',val:rep,desc:'% de risco reputacional'},
      {lbl:'Regulatório',val:reg,desc:'% de risco regulatório'}
    ],
    achadosDet: achadosDet,
    timeline: timeline,
    recomendacoes: recomendacoes
  };

  // Preserva foto, digital e nickname anteriores se existirem
  if(state.currentProfile){
    if(state.currentProfile.photo)     profile.photo = state.currentProfile.photo;
    if(state.currentProfile.digital)   profile.digital = state.currentProfile.digital;
    if(state.currentProfile.nickname)  profile.nickname = state.currentProfile.nickname;
  }

  state.currentProfile = profile;
  document.getElementById('subjectName').textContent = subjectName;
  document.getElementById('subjectSub').textContent = profile.meta;
  updateRaioX(profile);
}

function extractDim(text, dim){
  var re = new RegExp(dim+'[:\\s]+(\\d+)', 'i');
  var m = text.match(re);
  return m ? Math.min(100, parseInt(m[1])) : null;
}

function extractAlerts(text){
  var alerts = [];
  var lines = text.split('\n');
  lines.forEach(function(line){
    if(line.includes('🔴') || line.toLowerCase().includes('crítico')){
      alerts.push({l:'red', txt: line.replace(/🔴|•|\*/g,'').trim().slice(0,120)});
    } else if(line.includes('⚠') || line.toLowerCase().includes('atenção')){
      alerts.push({l:'amber', txt: line.replace(/⚠|•|\*/g,'').trim().slice(0,120)});
    } else if(line.includes('✓') || line.toLowerCase().includes('ok —')){
      alerts.push({l:'green', txt: line.replace(/✓|•|\*/g,'').trim().slice(0,120)});
    }
  });
  return alerts.slice(0,6);
}

/* ───────────────────────────────
   ANÁLISE DIGITAL DE REDES SOCIAIS
─────────────────────────────── */
function focusAtInput(){
  var el = document.getElementById('atInput');
  if(el){
    el.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(function(){ el.focus(); }, 400);
  }
}

async function analyzeDigital(){
  var raw = document.getElementById('atInput').value.trim();
  if(!raw){ alert('Informe um @ ou URL de perfil.'); return; }

  // ─── 1. Parse robusto do input ───
  var parsed = parseSocialInput(raw);
  var display   = parsed.handle;      // ex: @adaolitro
  var platform  = parsed.platform;    // ex: instagram
  var profileUrl= parsed.url;         // ex: https://instagram.com/adaolitro

  var btn = document.getElementById('atScanBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Analisando...';
  document.getElementById('digitalHandle').textContent = display + (platform ? ' · ' + platform : '');
  document.getElementById('digitalResult').style.display = 'none';

  var subjectCtx = state.currentProfile ? state.currentProfile.name : '';

  // ─── 2. Prompt específico para análise digital via web_search ───
  var digitalSystem =
    'Você é um analista de OSINT de redes sociais. Use a ferramenta web_search para investigar ' +
    'presença digital de perfis públicos. NÃO tente acessar Instagram/TikTok diretamente — a API ' +
    'do web_search retorna apenas resultados indexados (Google, sites de notícia, cache, menções). ' +
    'Estratégia obrigatória:\n' +
    '1. Busque: "' + display + '" site:instagram.com OR site:twitter.com OR site:tiktok.com OR site:facebook.com\n' +
    '2. Busque: "' + display + '" ' + (subjectCtx || '') + ' — para achar menções, notícias, biografias\n' +
    '3. Busque o nome do sujeito + rede social + cidade para confirmar identidade\n' +
    '4. Se achar QUALQUER menção indexada (mesmo cache de notícia citando o perfil), classifique o conteúdo com base no que encontrou.\n' +
    '5. Se realmente não encontrar nada indexado, retorne o bloco com SEGUIDORES=0 e VERDITO explicando que a conta é privada ou não indexada — MAS SEMPRE retorne o bloco.\n\n' +
    'Retorne SEMPRE, sem exceção, este bloco (mesmo com campos vazios/estimados):\n' +
    '---DIGITAL_START---\n' +
    'HANDLE: ' + display + '\n' +
    'PLATAFORMA: ' + (platform || 'desconhecida') + '\n' +
    'SEGUIDORES: número aproximado ou 0\n' +
    'BIO: bio pública ou "não encontrada"\n' +
    'PESSOAL: 0-100 (estimativa do % de conteúdo pessoal)\n' +
    'PROFISSIONAL: 0-100\n' +
    'POLITICO: 0-100\n' +
    'ESPECTRO: 0-100 (0=extrema esq, 50=centro, 100=extrema dir)\n' +
    'VERDITO: 1 parágrafo com o que foi encontrado (ou "conta não indexada")\n' +
    'TEMAS: #t1,#t2,#t3\n' +
    'POST1: resumo de menção/post encontrado (ou "n/d")\n' +
    'POST2: idem\nPOST3: idem\n' +
    '---DIGITAL_END---\n\n' +
    'Depois do bloco, escreva 2-3 parágrafos em prosa detalhando as fontes que consultou e o que ' +
    'de fato conseguiu confirmar vs. o que é estimativa. Cite URLs quando possível.';

  var msgDigital = 'Analise o perfil ' + display +
    (profileUrl ? ' (URL: ' + profileUrl + ')' : '') +
    (subjectCtx ? ', pertencente a ' + subjectCtx : '') +
    '. Execute as buscas na ordem descrita no system prompt e retorne obrigatoriamente o bloco DIGITAL_START/DIGITAL_END.';

  addMessage('user', '📡 Analisar perfil: <strong>' + display + '</strong>' + (platform ? ' <em style="color:var(--lo)">('+platform+')</em>' : ''));
  showTyping();

  // Usa histórico curto e isolado — evita que o RAIO-X anterior polua a análise
  var digitalMessages = [{ role: 'user', content: msgDigital }];

  try {
    var aiText = await callRaioXChat(digitalSystem, digitalMessages);

    removeTyping();

    // Extrair bloco estruturado
    var parsedBlock = parseDigitalBlock(aiText);
    if(parsedBlock){
      // garante que handle/plataforma do input prevaleçam
      if(!parsedBlock.handle) parsedBlock.handle = display;
      if(!parsedBlock.plataforma && platform) parsedBlock.plataforma = platform;
      renderDigitalResult(parsedBlock);
      var prose = aiText.replace(/---DIGITAL_START---[\s\S]*?---DIGITAL_END---/,'').trim();
      if(prose) addMessage('ai', formatResponse(prose));
    } else {
      // Sem bloco → mostra card com estado "sem dados" e prosa completa no chat
      renderDigitalEmpty(display, platform);
      addMessage('ai', '⚠ A IA não retornou o bloco estruturado. Resposta bruta abaixo:<br><br>' + formatResponse(aiText));
    }

    registrarConsulta('ANALISE_DIGITAL', display);
  } catch(err){
    removeTyping();
    renderDigitalEmpty(display, platform);
    addMessage('ai', '⚠ Erro ao analisar perfil: ' + err.message);
  }

  btn.disabled = false;
  btn.textContent = '🔍 Analisar';
}

/* Extrai handle, plataforma e URL canônica de qualquer input */
function parseSocialInput(raw){
  var s = raw.trim().replace(/^@+/, '');
  var platform = '';
  var handle = '';
  var url = '';

  // Se veio URL
  if(/^https?:\/\//i.test(raw) || /^www\./i.test(raw) || /\.(com|net|br)\b/i.test(raw)){
    var clean = raw.replace(/^https?:\/\//i, '').replace(/^www\./i,'');
    var host = clean.split('/')[0].toLowerCase();
    var path = clean.substring(host.length).replace(/^\//,'').split('?')[0].split('#')[0];
    var seg  = path.split('/').filter(Boolean);

    if(/instagram\.com/.test(host))       { platform='instagram'; handle = seg[0] || ''; }
    else if(/tiktok\.com/.test(host))      { platform='tiktok';    handle = (seg[0]||'').replace(/^@/,''); }
    else if(/(twitter|x)\.com/.test(host)) { platform='twitter/x'; handle = seg[0] || ''; }
    else if(/facebook\.com/.test(host))    { platform='facebook';  handle = seg[0] || ''; }
    else if(/linkedin\.com/.test(host))    { platform='linkedin';  handle = seg[1] || seg[0] || ''; }
    else if(/youtube\.com/.test(host))     { platform='youtube';   handle = (seg[0]||'').replace(/^@/,''); }
    else if(/threads\.net/.test(host))     { platform='threads';   handle = (seg[0]||'').replace(/^@/,''); }
    else { platform = host.split('.')[0]; handle = seg[0] || ''; }

    url = 'https://' + host + (path ? '/' + path : '');
  } else {
    handle = s;
  }

  handle = (handle || s).replace(/[^\w.\-]/g,'');
  return {
    handle: handle ? '@' + handle : '@' + s,
    platform: platform,
    url: url
  };
}

/* Renderiza o card de análise digital em estado "sem dados" para não deixar vazio */
function renderDigitalEmpty(display, platform){
  var d = {
    handle: display, plataforma: platform || 'desconhecida',
    seguidores: '—', bio: 'Não localizada em fontes públicas indexadas.',
    pessoal: 0, profissional: 0, politico: 0, espectro: 50,
    verdito: 'Conta provavelmente privada ou sem indexação pública. Nada foi confirmado.',
    temas: [], posts: []
  };
  renderDigitalResult(d);
}

function buildSystemPrompt(){
  return getSystemPromptText();
}

function getSystemPromptText(){
  return `Você é o RAIO-X Intelligence, agente de due diligence político com RIGOR METODOLÓGICO ABSOLUTO.\n\n` +
  `REGRAS ANTI-ALUCINAÇÃO OBRIGATÓRIAS:\n` +
  `1. NUNCA atribua processos/empresas/fatos a um sujeito apenas pela coincidência de nome.\n` +
  `2. Confirme SEMPRE pelo menos 2 identificadores (nome+município, nome+empresa, nome+CPF, nome+cargo).\n` +
  `3. Nomes comuns têm centenas de homônimos no Jusbrasil — avise SEMPRE: "⚠ HOMONÍMIA: dados não confirmados sem verificação adicional."\n` +
  `4. Separe explicitamente: ✅ CONFIRMADO vs ⚠ NÃO CONFIRMADO em toda resposta.\n` +
  `5. Se o usuário informa que o sujeito nunca teve funcionários: processos trabalhistas sem confirmação de identidade NÃO devem ser atribuídos.\n` +
  `6. NUNCA invente ou extrapole. Se não encontrou: diga "não encontrado".\n\n` +
  `Contexto: Paraná, campanha Juntos Paraná 399 / Sérgio Moro.`;
}


function parseDigitalBlock(text){
  var match = text.match(/---DIGITAL_START---([\s\S]*?)---DIGITAL_END---/);
  if(!match) return null;
  var block = match[1];
  function field(key){ var m = block.match(new RegExp(key+':\\s*(.+)')); return m ? m[1].trim() : ''; }
  return {
    handle:        field('HANDLE'),
    plataforma:    field('PLATAFORMA'),
    seguidores:    field('SEGUIDORES'),
    bio:           field('BIO'),
    pessoal:       parseInt(field('PESSOAL')) || 0,
    profissional:  parseInt(field('PROFISSIONAL')) || 0,
    politico:      parseInt(field('POLITICO')) || 0,
    espectro:      parseInt(field('ESPECTRO')) || 50,
    verdito:       field('VERDITO'),
    temas:         field('TEMAS').split(',').map(function(t){ return t.trim(); }).filter(Boolean),
    posts:         [field('POST1'), field('POST2'), field('POST3')].filter(Boolean)
  };
}

function renderDigitalResult(d){
  // Mostrar resultado
  var resultEl = document.getElementById('digitalResult');
  resultEl.style.display = 'flex';

  // Barras de tipo de conteúdo
  setTimeout(function(){
    setDigitalBar('ctPessoal',     'pctPessoal',     d.pessoal);
    setDigitalBar('ctProfissional','pctProfissional', d.profissional);
    setDigitalBar('ctPolitico',    'pctPolitico',     d.politico);
  }, 100);

  // Termômetro político (só mostra se % político >= 15)
  var thermoSection = document.getElementById('thermoSection');
  if(d.politico >= 15){
    thermoSection.style.display = 'block';
    setTimeout(function(){
      document.getElementById('thermoNeedle').style.left = d.espectro + '%';
    }, 200);
    var verdito = document.getElementById('thermoVerdict');
    verdito.textContent = d.verdito || espectroLabel(d.espectro);
    verdito.style.color = espectroColor(d.espectro);
  } else {
    thermoSection.style.display = 'none';
  }

  // Temas
  var topicsSection = document.getElementById('topicsSection');
  if(d.temas && d.temas.length){
    topicsSection.style.display = 'block';
    var wrap = document.getElementById('topicsWrap');
    wrap.innerHTML = '';
    d.temas.forEach(function(t){
      var isPolitical = /partido|eleição|voto|governo|político|direita|esquerda|bolsonaro|lula|moro/i.test(t);
      var isPersonal = /familia|viagem|filhos|aniver|amor|amigos/i.test(t);
      var cls = isPolitical ? 'political' : isPersonal ? 'personal' : '';
      wrap.innerHTML += '<span class="topic-tag '+cls+'">'+t+'</span>';
    });
  }

  // Posts
  var postsSection = document.getElementById('postsSection');
  if(d.posts && d.posts.length){
    postsSection.style.display = 'block';
    var postsWrap = document.getElementById('postsWrap');
    postsWrap.innerHTML = '';
    d.posts.forEach(function(p){
      if(!p) return;
      postsWrap.innerHTML += '<div class="post-item">'+formatResponse(p)+'</div>';
    });
  }

  // Handle no header
  if(d.handle) document.getElementById('digitalHandle').textContent = d.handle;

  // Salvar no perfil atual
  if(state.currentProfile){
    state.currentProfile.digital = d;
  }
}

function setDigitalBar(fillId, pctId, val){
  var f = document.getElementById(fillId);
  var p = document.getElementById(pctId);
  if(f) f.style.width = val + '%';
  if(p) p.textContent = val + '%';
}

function espectroLabel(v){
  if(v <= 20) return '🔴 Extrema Esquerda';
  if(v <= 35) return '🟠 Esquerda';
  if(v <= 45) return '🟡 Centro-Esquerda';
  if(v <= 55) return '⚪ Centro';
  if(v <= 70) return '🔵 Centro-Direita';
  if(v <= 85) return '🟣 Direita';
  return '⚫ Extrema Direita';
}
function espectroColor(v){
  if(v <= 20) return '#ff3355';
  if(v <= 35) return '#ff6d00';
  if(v <= 45) return '#ffc107';
  if(v <= 55) return '#8892b8';
  if(v <= 70) return '#3d9fff';
  if(v <= 85) return '#9b6fff';
  return '#4a5278';
}

/* ───────────────────────────────
   SALVAR / PRINT
─────────────────────────────── */
function saveCurrentProfile(){
  if(!state.currentProfile){
    addMessage('ai','⚠ Nenhum perfil ativo para salvar. Inicie uma investigação primeiro.');
    return;
  }
  var exists = state.profiles.findIndex(function(p){ return p.id === state.currentProfile.id; });
  if(exists >= 0) state.profiles[exists] = state.currentProfile;
  else state.profiles.unshift(state.currentProfile);
  localStorage.setItem('aiox_profiles', JSON.stringify(state.profiles));
  renderProfileList();

  // Enviar para a plataforma (Ativos Políticos) se aberto via popup com session_id
  try {
    var qp = new URLSearchParams(window.location.search);
    var sid = qp.get('session_id');
    if(sid && window.opener && !window.opener.closed && state.lastAiText){
      // Monta HTML completo do relatório diagramado (col-right)
      var colRight = document.querySelector('.col-right');
      var reportHtml = '';
      if(colRight){
        reportHtml = '<div class="raiox-report" style="font-family:Inter,system-ui,sans-serif;color:#0f172a;background:#fff;padding:16px">' +
                     colRight.innerHTML +
                     '</div>';
      } else if(state.lastFullHtml){
        reportHtml = state.lastFullHtml;
      }
      window.opener.postMessage({
        type: 'raiox:save',
        session_id: sid,
        html: reportHtml,
        markdown: state.lastVisibleMarkdown || '',
        context_input: qp.get('contexto') || '',
        model: 'raio-x-chat',
        subject: {
          name: state.currentProfile.name,
          municipality: qp.get('municipio') || '',
          party: qp.get('partido') || '',
          position: qp.get('cargo') || ''
        }
      }, '*');
      addMessage('ai','✓ Relatório de <strong>'+state.currentProfile.name+'</strong> enviado para o card do ativo. Confirme no modal de revisão que abriu na plataforma.');
      return;
    }
  } catch(e){ console.warn('[raiox] postMessage falhou', e); }

  addMessage('ai','✓ Perfil de <strong>'+state.currentProfile.name+'</strong> salvo com sucesso.');
}

function printRaioX(){
  // 1. Garantir que o conteúdo do Raio-X está visível
  var emptyState = document.getElementById('emptyState');
  var raioXContent = document.getElementById('raioXContent');
  if(emptyState)   emptyState.style.display   = 'none';
  if(raioXContent) raioXContent.style.display = 'block';

  // 2. Expandir todos os itens da timeline
  document.querySelectorAll('.tl-row').forEach(function(el){
    el.classList.add('open');
  });

  // 3. Mostrar resultado digital se existir
  var digitalResult = document.getElementById('digitalResult');
  if(digitalResult && state.currentProfile && state.currentProfile.digital){
    digitalResult.style.display = 'flex';
  }

  // 4. Remover overflow/height limitantes da col-right e raio-x-body
  var colRight = document.querySelector('.col-right');
  var raioBody = document.getElementById('raioXBody');
  var prevColStyle  = colRight ? colRight.getAttribute('style') || '' : '';
  var prevBodyStyle = raioBody ? raioBody.getAttribute('style') || '' : '';

  if(colRight){
    colRight.style.overflow  = 'visible';
    colRight.style.height    = 'auto';
    colRight.style.maxHeight = 'none';
    colRight.style.position  = 'static';
  }
  if(raioBody){
    raioBody.style.overflow  = 'visible';
    raioBody.style.height    = 'auto';
    raioBody.style.maxHeight = 'none';
  }

  // 5. Aguardar DOM estabilizar → imprimir
  setTimeout(function(){
    window.print();

    // 6. Restaurar estado original após o diálogo fechar
    setTimeout(function(){
      document.querySelectorAll('.tl-row').forEach(function(el){
        el.classList.remove('open');
      });
      if(colRight)  colRight.setAttribute('style', prevColStyle);
      if(raioBody)  raioBody.setAttribute('style', prevBodyStyle);
    }, 1500);
  }, 400);
}

/* ───────────────────────────────
   NOTAS
─────────────────────────────── */
function saveNotes(){
  var notesVal = document.getElementById('analystNotes').value;
  var key = state.currentProfile ? 'aiox_notes_'+state.currentProfile.id : 'aiox_notes_general';
  localStorage.setItem(key, notesVal);
  var s = document.getElementById('notesStatus');

  // Também envia o relatório + notas para a plataforma (card do ativo)
  var sent = false;
  try {
    var qp = new URLSearchParams(window.location.search);
    var sid = qp.get('session_id');
    if(sid && window.opener && !window.opener.closed && state.lastAiText){
      var colRight = document.querySelector('.col-right');
      var reportHtml = '';
      if(colRight){
        reportHtml = '<div class="raiox-report" style="font-family:Inter,system-ui,sans-serif;color:#0f172a;background:#fff;padding:16px">' +
                     colRight.innerHTML + '</div>';
      } else if(state.lastFullHtml){
        reportHtml = state.lastFullHtml;
      }
      window.opener.postMessage({
        type: 'raiox:save',
        session_id: sid,
        html: reportHtml,
        markdown: state.lastVisibleMarkdown || '',
        context_input: qp.get('contexto') || '',
        reviewer_notes: notesVal,
        model: 'raio-x-chat',
        subject: {
          name: (state.currentProfile && state.currentProfile.name) || qp.get('nome') || '',
          municipality: qp.get('municipio') || '',
          party: qp.get('partido') || '',
          position: qp.get('cargo') || ''
        }
      }, '*');
      sent = true;
    }
  } catch(e){ console.warn('[raiox] postMessage falhou', e); }

  s.textContent = sent
    ? '✓ Notas salvas e relatório enviado ao card '+new Date().toLocaleTimeString('pt-BR')
    : '✓ Salvo '+new Date().toLocaleTimeString('pt-BR');
  setTimeout(function(){s.textContent='';},4000);
}
function loadNotes(){
  var key = state.currentProfile ? 'aiox_notes_'+state.currentProfile.id : 'aiox_notes_general';
  var saved = localStorage.getItem(key);
  if(saved) document.getElementById('analystNotes').value = saved;
}

/* ═══════════════════════════════════════════════════
   DASHBOARD DE GASTOS — FUNÇÕES COMPLETAS
═══════════════════════════════════════════════════ */

/* --- REGISTRAR CONSULTA --- */
function registrarConsulta(tipo, sujeito){
  var consultas = JSON.parse(localStorage.getItem('aiox_consultas') || '[]');
  var consulta = {
    id:        Date.now(),
    tipo:      tipo,                          // PESQUISA_COMPLETA | ANALISE_DIGITAL | FOLLOWUP
    sujeito:   sujeito || 'Não identificado',
    custoUSD:  calcCustoUSD(tipo),
    custoBRL:  calcCustoBRL(tipo),
    ts:        new Date().toISOString(),
    usuario:   localStorage.getItem('aiox_usuario') || 'admin',
    synced:    false
  };
  consultas.unshift(consulta);
  // Manter apenas últimas 500 consultas localmente
  if(consultas.length > 500) consultas = consultas.slice(0, 500);
  localStorage.setItem('aiox_consultas', JSON.stringify(consultas));
  // Atualizar dashboard se estiver aberto
  if(document.getElementById('dashPanel').classList.contains('active')){
    renderDashboard();
  }
}

/* --- CARREGAR CONSULTAS --- */
function getConsultas(){
  return JSON.parse(localStorage.getItem('aiox_consultas') || '[]');
}

/* --- RENDERIZAR DASHBOARD --- */
function renderDashboard(){
  var consultas = getConsultas();
  var agora     = new Date();
  var mesAtual  = agora.getMonth();
  var anoAtual  = agora.getFullYear();
  var mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
  var anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  // Totais
  var total      = consultas.length;
  var gastoTotal = consultas.reduce(function(s,c){ return s + (c.custoBRL||0); }, 0);
  var mediaCusto = total > 0 ? gastoTotal / total : 0;

  // Este mês
  var deMes = consultas.filter(function(c){
    var d = new Date(c.ts);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  var gastMes = deMes.reduce(function(s,c){ return s + (c.custoBRL||0); }, 0);

  // Mês anterior
  var deMesAnt = consultas.filter(function(c){
    var d = new Date(c.ts);
    return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior;
  });

  // Perfil mais investigado
  var freq = {};
  consultas.forEach(function(c){
    var k = c.sujeito || 'Desconhecido';
    freq[k] = (freq[k]||0) + 1;
  });
  var topPerfil = Object.keys(freq).sort(function(a,b){return freq[b]-freq[a];})[0] || '—';
  var topFreq   = freq[topPerfil] || 0;

  // Análises digitais
  var nDigital = consultas.filter(function(c){ return c.tipo === 'ANALISE_DIGITAL'; }).length;

  // Distribuição por tipo
  var nFull     = consultas.filter(function(c){ return c.tipo === 'PESQUISA_COMPLETA'; }).length;
  var nFollowup = consultas.filter(function(c){ return c.tipo === 'FOLLOWUP'; }).length;
  var pFull     = total > 0 ? Math.round(nFull/total*100)     : 0;
  var pDigital  = total > 0 ? Math.round(nDigital/total*100)  : 0;
  var pFollowup = total > 0 ? Math.round(nFollowup/total*100) : 0;

  // Trend mês (vs mês anterior)
  var trendMes = deMes.length - deMesAnt.length;
  var trendGasto = gastMes - deMesAnt.reduce(function(s,c){ return s + (c.custoBRL||0); }, 0);

  /* --- BIG NUMBERS --- */
  setText('bnTotal', total);
  setText('bnGasto', fmtBRL(gastoTotal));
  setText('bnMedia', fmtBRL(mediaCusto));
  setText('bnMes',   deMes.length);
  setText('bnMesSub', fmtBRL(gastMes) + ' este mês');

  // Perfil top
  var topEl = document.getElementById('bnTop');
  if(topEl){
    topEl.textContent = topPerfil === '—' ? '—' : topPerfil.split(' ').slice(0,2).join(' ');
    topEl.style.fontSize = topPerfil.length > 15 ? '11px' : '14px';
  }
  setText('bnTopSub', topFreq > 0 ? topFreq + ' consulta' + (topFreq > 1 ? 's' : '') : '—');
  setText('bnDigital', nDigital);

  // Trends
  renderTrend('bnTotalTrend', trendMes, 'vs mês anterior');
  renderTrend('bnGastoTrend', trendGasto, 'vs mês anterior', true);
  renderTrend('bnMesTrend', trendMes, 'vs mês anterior');

  /* --- GRÁFICO 7 DIAS --- */
  renderMiniChart(consultas);

  /* --- DISTRIBUIÇÃO --- */
  setTimeout(function(){
    setDistBar('distFull',     'distFullPct',     pFull);
    setDistBar('distDigital',  'distDigitalPct',  pDigital);
    setDistBar('distFollowup', 'distFollowupPct', pFollowup);
  }, 100);

  /* --- TABELA RECENTES --- */
  renderConsultTable(consultas.slice(0, 20));
}

function setText(id, val){
  var el = document.getElementById(id);
  if(el) el.textContent = val;
}

function renderTrend(id, diff, label, invertColor){
  var el = document.getElementById(id);
  if(!el) return;
  if(diff === 0){ el.innerHTML = '<span class="trend-neu">→ estável ' + label + '</span>'; return; }
  var up = diff > 0;
  // Para gastos, subir é ruim (vermelho); para consultas, subir é neutro
  var cls = invertColor ? (up ? 'trend-up' : 'trend-down') : (up ? 'trend-up' : 'trend-down');
  var arrow = up ? '↑' : '↓';
  var abs = Math.abs(diff);
  el.innerHTML = '<span class="' + cls + '">' + arrow + ' ' + abs + ' ' + label + '</span>';
}

function setDistBar(fillId, pctId, pct){
  var f = document.getElementById(fillId);
  var p = document.getElementById(pctId);
  if(f) f.style.width = pct + '%';
  if(p) p.textContent = pct + '%';
}

function renderMiniChart(consultas){
  var wrap = document.getElementById('miniChartBars');
  if(!wrap) return;
  wrap.innerHTML = '';

  var dias = [];
  for(var i = 6; i >= 0; i--){
    var d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d);
  }

  var counts = dias.map(function(d){
    return consultas.filter(function(c){
      var cd = new Date(c.ts);
      return cd.getDate()     === d.getDate() &&
             cd.getMonth()    === d.getMonth() &&
             cd.getFullYear() === d.getFullYear();
    }).length;
  });

  var maxCount = Math.max.apply(null, counts) || 1;
  var labels = ['D-6','D-5','D-4','D-3','D-2','Ont.','Hoje'];

  dias.forEach(function(d, i){
    var pct = Math.round((counts[i] / maxCount) * 100);
    var isToday = i === 6;
    var col = isToday ? 'var(--green)' : 'rgba(0,232,162,.35)';

    var col_div = document.createElement('div');
    col_div.className = 'mcbar-wrap';
    col_div.innerHTML =
      '<div class="mcbar" style="height:' + Math.max(pct, 3) + '%;background:' + col + '" title="' + counts[i] + ' consulta(s)"></div>' +
      '<div class="mcbar-lbl">' + (isToday ? 'Hoje' : labels[i]) + '</div>';

    // Adicionar valor acima da barra se > 0
    if(counts[i] > 0){
      var vEl = document.createElement('div');
      vEl.style.cssText = 'font-family:var(--font-m);font-size:8px;color:var(--mid);text-align:center;margin-bottom:2px;order:-1';
      vEl.textContent = counts[i];
      col_div.insertBefore(vEl, col_div.firstChild);
    }

    wrap.appendChild(col_div);
  });
}

function renderConsultTable(consultas){
  var tbody = document.getElementById('consultTableBody');
  if(!tbody) return;
  if(consultas.length === 0){
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--lo);font-family:var(--font-m);font-size:10px;padding:16px">Nenhuma consulta registrada ainda</td></tr>';
    return;
  }
  var typeMap = {
    PESQUISA_COMPLETA: '<span class="ct-type-badge ctb-full">🔎 Pesquisa</span>',
    ANALISE_DIGITAL:   '<span class="ct-type-badge ctb-digital">📡 Digital</span>',
    FOLLOWUP:          '<span class="ct-type-badge ctb-followup">💬 Follow-up</span>'
  };
  tbody.innerHTML = consultas.map(function(c){
    var nome = (c.sujeito || '—').split(' ').slice(0,2).join(' ');
    return '<tr>' +
      '<td class="ct-name" title="' + (c.sujeito||'') + '">' + nome + '</td>' +
      '<td>' + (typeMap[c.tipo] || c.tipo) + '</td>' +
      '<td><span class="cost-badge">' + fmtBRL(c.custoBRL||0) + '</span></td>' +
      '<td style="white-space:nowrap;color:var(--lo)">' + fmtDate(c.ts) + '</td>' +
    '</tr>';
  }).join('');
}

/* --- SWITCH TABS --- */
function switchTab(tab){
  var tabRaioX  = document.getElementById('tabRaioX');
  var tabGastos = document.getElementById('tabGastos');
  var raioXBody = document.getElementById('raioXBody');
  var dashPanel = document.getElementById('dashPanel');

  if(tab === 'raiox'){
    tabRaioX.classList.add('active');
    tabGastos.classList.remove('active');
    raioXBody.style.display = 'block';
    dashPanel.classList.remove('active');
    document.getElementById('topbarHint').textContent = 'Digite o nome do sujeito e pressione Enter';
  } else {
    tabGastos.classList.add('active');
    tabRaioX.classList.remove('active');
    raioXBody.style.display = 'none';
    dashPanel.classList.add('active');
    document.getElementById('topbarHint').textContent = 'Dashboard de uso e custos da ferramenta';
    renderDashboard();
  }
}

/* --- SYNC SUPABASE --- */
async function syncToSupabase(){
  var btn = document.getElementById('syncBtn');
  var statusEl = document.getElementById('syncStatus');
  var SUPABASE_URL = localStorage.getItem('aiox_supabase_url') || '';
  var SUPABASE_KEY = localStorage.getItem('aiox_supabase_key') || '';

  if(!SUPABASE_URL || !SUPABASE_KEY){
    statusEl.textContent = '⚠ Configure SUPABASE_URL e SUPABASE_KEY no localStorage para sincronizar.';
    statusEl.style.color = 'var(--amber)';
    return;
  }

  btn.classList.add('syncing');
  btn.textContent = '⟳ Sincronizando...';
  statusEl.textContent = 'Enviando consultas para o Supabase...';
  statusEl.style.color = 'var(--lo)';

  var consultas = getConsultas().filter(function(c){ return !c.synced; });
  if(consultas.length === 0){
    btn.classList.remove('syncing');
    btn.textContent = '⟳ Sync';
    statusEl.textContent = '✓ Tudo sincronizado · nenhuma consulta pendente';
    statusEl.style.color = 'var(--green)';
    return;
  }

  try {
    var payload = consultas.map(function(c){
      return {
        consulta_id:  c.id,
        tipo:         c.tipo,
        sujeito:      c.sujeito,
        custo_usd:    c.custoUSD,
        custo_brl:    c.custoBRL,
        usuario:      c.usuario,
        criado_em:    c.ts
      };
    });

    var res = await fetch(SUPABASE_URL + '/rest/v1/raiox_consultas', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if(res.ok || res.status === 201){
      // Marcar como sincronizadas
      var todas = getConsultas();
      var ids = consultas.map(function(c){ return c.id; });
      todas.forEach(function(c){ if(ids.indexOf(c.id) >= 0) c.synced = true; });
      localStorage.setItem('aiox_consultas', JSON.stringify(todas));
      statusEl.textContent = '✓ ' + consultas.length + ' consulta(s) sincronizada(s) com o Supabase';
      statusEl.style.color = 'var(--green)';
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch(err){
    statusEl.textContent = '⚠ Erro ao sincronizar: ' + err.message;
    statusEl.style.color = 'var(--red)';
  }

  btn.classList.remove('syncing');
  btn.textContent = '⟳ Sync';
}

/* ───────────────────────────────
   FOTO DO SUJEITO
─────────────────────────────── */
function loadPhoto(input){
  if(!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var img = document.getElementById('photoImg');
    img.src = e.target.result;
    img.onload = function(){
      img.classList.add('loaded');
      document.querySelector('.photo-ph').style.display='none';
      document.getElementById('removePhotoBtn').style.display='block';
      if(state.currentProfile)
        localStorage.setItem('aiox_photo_'+state.currentProfile.id, e.target.result);
    };
  };
  reader.readAsDataURL(input.files[0]);
  input.value='';
}
function removePhoto(){
  var img = document.getElementById('photoImg');
  img.src=''; img.classList.remove('loaded');
  document.querySelector('.photo-ph').style.display='';
  document.getElementById('removePhotoBtn').style.display='none';
  if(state.currentProfile) localStorage.removeItem('aiox_photo_'+state.currentProfile.id);
}

/* ═══════════════════════════════════════════════════
   FIM
═══════════════════════════════════════════════════ */
