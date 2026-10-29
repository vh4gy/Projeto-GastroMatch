/* ==========================================================
   GastroMatch — Área Restrita
   Demonstração sem back-end: autenticação e dados locais via localStorage.
   ========================================================== */

const ROLES = {
  admin: { label: 'Administrador', email: 'admin@gastromatch.com.br' },
  chef: { label: 'Chef / Criador', email: 'chef@gastromatch.com.br' },
  restaurante: { label: 'Restaurante / Criador', email: 'restaurante@gastromatch.com.br' }
};

const restricciones = [
  { id: 'vegano', nome: 'Vegano' },
  { id: 'sem-gluten', nome: 'Sem glúten' },
  { id: 'sem-lactose', nome: 'Sem lactose' }
];

const tabelas = [
  {
    grupo: 'Gestão de usuários e perfis',
    cor: 'azul',
    itens: [
      { nome: 'usuarios', titulo: 'Usuários', desc: 'Login e dados básicos de clientes, chefs, restaurantes e administradores.', fields: [
        ['id_usuario','INT','pk'], ['nome','VARCHAR(120)',''], ['email','VARCHAR(160)',''], ['senha_criptografada','VARCHAR(255)',''], ['telefone','VARCHAR(30)',''], ['tipo_usuario','ENUM',''], ['data_cadastro','DATE','']
      ] },
      { nome: 'perfis_criadores', titulo: 'Perfis criadores', desc: 'Dados profissionais e validação de chefs e restaurantes.', fields: [
        ['id_perfil','INT','pk'], ['id_usuario','INT','fk → usuarios.id_usuario'], ['biografia','TEXT',''], ['foto_perfil','VARCHAR(255)',''], ['link_portfolio','VARCHAR(255)',''], ['documento_validacao','VARCHAR(255)',''], ['status_validacao','ENUM',''], ['latitude','DECIMAL',''], ['longitude','DECIMAL','']
      ] }
    ]
  },
  {
    grupo: 'Conteúdo gastronômico',
    cor: 'laranja',
    itens: [
      { nome: 'receitas', titulo: 'Receitas', desc: 'Receitas publicadas pelos perfis criadores.', fields: [
        ['id_receita','INT','pk'], ['id_criador','INT','fk → perfis_criadores.id_perfil'], ['titulo','VARCHAR(160)',''], ['descricao_introducao','TEXT',''], ['rendimento','INT',''], ['tempo_preparo_minutos','INT',''], ['nivel_dificuldade','ENUM',''], ['tipo_acesso','ENUM',''], ['preco_conteudo','DECIMAL','']
      ] },
      { nome: 'videoaulas', titulo: 'Videoaulas', desc: 'Aulas em vídeo associadas às receitas.', fields: [
        ['id_aula','INT','pk'], ['id_receita','INT','fk → receitas.id_receita'], ['url_video','VARCHAR(255)',''], ['duracao_segundos','INT','']
      ] },
      { nome: 'restricoes_alimentares', titulo: 'Restrições alimentares', desc: 'Catálogo usado nos filtros alimentares.', fields: [
        ['id_restricao','INT','pk'], ['nome','VARCHAR(80)','']
      ] },
      { nome: 'receitas_restricoes', titulo: 'Receitas × restrições', desc: 'Tabela de associação do relacionamento muitos-para-muitos.', fields: [
        ['id_receita','INT','fk → receitas.id_receita'], ['id_restricao','INT','fk → restricoes_alimentares.id_restricao']
      ] }
    ]
  },
  {
    grupo: 'Kits, pedidos e logística',
    cor: 'verde',
    itens: [
      { nome: 'kits_ingredientes', titulo: 'Kits de ingredientes', desc: 'Kits físicos ligados à receita e ao restaurante/chef responsável.', fields: [
        ['id_kit','INT','pk'], ['id_receita','INT','fk → receitas.id_receita'], ['id_restaurante','INT','fk → perfis_criadores.id_perfil'], ['preco_kit','DECIMAL',''], ['estoque_disponivel','INT','']
      ] },
      { nome: 'raio_entrega_restaurantes', titulo: 'Raio de entrega', desc: 'Cobertura geográfica para venda de kits.', fields: [
        ['id_raio','INT','pk'], ['id_restaurante','INT','fk → perfis_criadores.id_perfil'], ['raio_km_cobertura','DECIMAL','']
      ] },
      { nome: 'pedidos', titulo: 'Pedidos', desc: 'Cabeçalho das compras realizadas pelos clientes.', fields: [
        ['id_pedido','INT','pk'], ['id_cliente','INT','fk → usuarios.id_usuario'], ['data_pedido','DATETIME',''], ['valor_total','DECIMAL',''], ['status_pedido','ENUM','']
      ] },
      { nome: 'itens_pedido', titulo: 'Itens do pedido', desc: 'Itens físicos ou digitais que compõem um pedido.', fields: [
        ['id_item_pedido','INT','pk'], ['id_pedido','INT','fk → pedidos.id_pedido'], ['tipo_item','ENUM',''], ['id_referencia','INT',''], ['quantidade','INT',''], ['preco_unitario','DECIMAL','']
      ] }
    ]
  },
  {
    grupo: 'Comunidade e interação',
    cor: 'roxo',
    itens: [
      { nome: 'avaliacoes_comentarios', titulo: 'Avaliações e comentários', desc: 'Notas, comentários e fotos dos pratos publicados pelos usuários.', fields: [
        ['id_interacao','INT','pk'], ['id_usuario','INT','fk → usuarios.id_usuario'], ['id_receita','INT','fk → receitas.id_receita'], ['nota','INT',''], ['comentario_texto','TEXT',''], ['url_foto_prato','VARCHAR(255)',''], ['data_publicacao','DATETIME','']
      ] },
      { nome: 'duvidas_forum', titulo: 'Fórum de dúvidas', desc: 'Perguntas sobre receitas e respostas dos criadores.', fields: [
        ['id_duvida','INT','pk'], ['id_usuario','INT','fk → usuarios.id_usuario'], ['id_receita','INT','fk → receitas.id_receita'], ['pergunta_texto','TEXT',''], ['resposta_texto','TEXT','']
      ] }
    ]
  }
];

const relacoes = [
  ['usuarios — perfis_criadores','Um usuário pode ter no máximo um perfil criador; o perfil pertence a um usuário.','Especialização 1 : 0..1; manter id_usuario único em perfis_criadores.'],
  ['perfis_criadores — receitas','Um chef/restaurante pode publicar várias receitas; cada receita pertence a um criador.','1 : N; FK id_criador fica em receitas.'],
  ['receitas — videoaulas','Uma receita pode ter uma ou várias videoaulas; cada aula pertence a uma receita.','1 : N; FK id_receita fica em videoaulas.'],
  ['receitas — restricoes_alimentares','Uma receita pode ter várias restrições e uma restrição pode aparecer em várias receitas.','N : N; criar receitas_restricoes.'],
  ['receitas — kits_ingredientes','Uma receita pode ter kits disponíveis; cada kit aponta para uma receita.','1 : N; FK id_receita fica em kits_ingredientes.'],
  ['perfis_criadores — kits_ingredientes','Um restaurante/criador pode ofertar vários kits.','1 : N; FK id_restaurante fica em kits_ingredientes.'],
  ['perfis_criadores — raio_entrega_restaurantes','Um perfil pode ter uma regra de cobertura; o desenho atual permite mais de uma.','1 : N no modelo atual; UNIQUE em id_restaurante pode representar 1 : 1.'],
  ['usuarios — pedidos','Um cliente pode fazer vários pedidos; cada pedido pertence a um cliente.','1 : N; FK id_cliente fica em pedidos.'],
  ['pedidos — itens_pedido','Um pedido possui um ou vários itens; cada item pertence a um pedido.','1 : N; FK id_pedido fica em itens_pedido.'],
  ['usuarios — avaliacoes_comentarios','Um usuário pode publicar várias avaliações; cada avaliação pertence a um usuário.','1 : N; FK id_usuario.'],
  ['receitas — avaliacoes_comentarios','Uma receita pode receber várias avaliações; cada avaliação aponta para uma receita.','1 : N; FK id_receita.'],
  ['usuarios — duvidas_forum','Um usuário pode enviar várias dúvidas.','1 : N; FK id_usuario.'],
  ['receitas — duvidas_forum','Uma receita pode receber várias dúvidas.','1 : N; FK id_receita.']
];

const state = {
  receitas: load('gm_area_receitas', []),
  nextId: 100
};
state.nextId = Math.max(100, ...state.receitas.map(r => Number(r.id_receita) || 0)) + 1;

function load(key, fallback){ try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } }
function save(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {} }
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function currentAuth(){ try { return JSON.parse(sessionStorage.getItem('gm_area_auth')); } catch(e) { return null; } }
async function carregarPerfilSeguranca(){
  const auth = currentAuth();
  const idUsuario = Number(auth?.idUsuario || auth?.id_usuario || 0);
  if (!auth || !auth.role || !idUsuario) return null;

  try {
    const resposta = await fetch(`../api.php?action=perfil&id_usuario=${idUsuario}`, { cache: 'no-store' });
    const payload = await resposta.json().catch(() => ({ success: false }));
    if (!resposta.ok || !payload.success || !payload.data?.user) return null;
    return payload.data.user;
  } catch (erro) {
    console.warn('Perfil do banco indisponível na área restrita.', erro);
    return null;
  }
}
function toast(msg){ const el=document.getElementById('toast'); if(!el) return; el.textContent=msg; el.classList.add('on'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('on'),2500); }
function switchTo(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('ativo'));
  const target=document.getElementById('view-'+view); if(target) target.classList.add('ativo');
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('ativo', b.dataset.view===view));
  const meta={
    inicio:['Visão geral','Resumo da estrutura criada para o projeto.'],
    tabelas:['Tabelas do banco','Campos, chaves e grupos do banco GastroMatch.'],
    relacoes:['Relações / cardinalidades','Como as tabelas se conectam no modelo lógico.'],
    receita:['Cadastrar receita','Formulário de entrada do conteúdo gastronômico do Chef/Criador.']
  };
  document.getElementById('pageTitle').textContent=meta[view][0];
  document.getElementById('pageSubtitle').textContent=meta[view][1];
}

function tableCard(t){
  const rows=t.fields.map(([campo,tipo,kind])=>{
    const classe=kind.startsWith('pk')?'pk-row':kind.startsWith('fk')?'fk-row':'';
    const badge=kind.startsWith('pk')?'PK':kind.startsWith('fk')?'FK':'';
    const detalhe=kind.startsWith('fk')?kind.replace('fk → ','→ '):'';
    return `<div class="db-row ${classe}"><span class="db-field">${esc(campo)} ${badge?`<b class="db-badge ${badge==='PK'?'db-pk':'db-fk'}">${badge}</b>`:''}</span><span class="db-type">${esc(tipo)}</span><span class="db-ref">${esc(detalhe)}</span></div>`;
  }).join('');
  return `<article class="db-card" data-table="${esc(t.nome)}"><div class="db-head"><div><strong>${esc(t.titulo)}</strong><span>${esc(t.nome)}</span></div><button class="copy-table" data-table-name="${esc(t.nome)}" title="Copiar nome da tabela">⧉</button></div><div class="db-desc">${esc(t.desc)}</div><div class="db-grid db-grid-title"><span>Campo</span><span>Tipo</span><span>Referência</span></div>${rows}</article>`;
}

function renderInicio(auth){
  const tableCount=tabelas.reduce((n,g)=>n+g.itens.length,0);
  const fkCount=tabelas.reduce((n,g)=>n+g.itens.reduce((m,t)=>m+t.fields.filter(f=>f[2].startsWith('fk')).length,0),0);
  const receitaLocal=state.receitas.length;
  const role=ROLES[auth.role]?.label || 'Administrador';
  document.getElementById('view-inicio').innerHTML=`
    <div class="welcome"><div><span class="kicker">perfil atual</span><h2>${esc(role)}</h2><p>${esc(auth.email)} • acesso autorizado nesta sessão.</p></div><div class="status-pill"><span></span> Sessão ativa</div></div>
    <div class="stats-grid">
      <div class="stat-card"><span>Tabelas</span><strong>${tableCount}</strong><small>do modelo lógico</small></div>
      <div class="stat-card"><span>Chaves estrangeiras</span><strong>${fkCount}</strong><small>ligações entre tabelas</small></div>
      <div class="stat-card"><span>Relacionamentos</span><strong>${relacoes.length}</strong><small>cardinalidades documentadas</small></div>
      <div class="stat-card"><span>Receitas cadastradas</span><strong>${receitaLocal}</strong><small>salvas nesta demonstração</small></div>
    </div>
    <div class="section-card intro-model"><div class="section-head"><div><span class="kicker">estrutura por domínio</span><h3>Como o banco foi organizado</h3></div><button class="outline-btn" data-view-jump="tabelas">Ver tabelas</button></div>
      <div class="domain-grid">
        <div class="domain"><b>01</b><h4>Usuários e perfis</h4><p>Conta base + perfil profissional para chefes e restaurantes.</p><span>usuarios • perfis_criadores</span></div>
        <div class="domain"><b>02</b><h4>Conteúdo gastronômico</h4><p>Receitas, videoaulas e classificação por restrições alimentares.</p><span>receitas • videoaulas • restricoes</span></div>
        <div class="domain"><b>03</b><h4>Kits e compras</h4><p>Kit de ingredientes, cobertura local, pedidos e itens.</p><span>kits • raio • pedidos</span></div>
        <div class="domain"><b>04</b><h4>Comunidade</h4><p>Avaliações, fotos e perguntas enviadas aos criadores.</p><span>avaliacoes • duvidas</span></div>
      </div>
    </div>
    <div class="section-card source-box"><div class="section-head"><div><span class="kicker">ponto importante</span><h3>Restrições alimentares</h3></div><span class="mini-label">N : N</span></div><p>Uma receita pode ser marcada como <b>Vegana</b>, <b>Sem glúten</b> e/ou <b>Sem lactose</b>. No banco, a seleção deve ser registrada em <code>receitas_restricoes</code>, evitando repetir colunas dentro de <code>receitas</code>.</p></div>`;
}

function renderTabelas(){
  const html=tabelas.map(g=>`<section class="db-group"><div class="group-title"><div><span class="group-index">${String(tabelas.indexOf(g)+1).padStart(2,'0')}</span><div><h2>${esc(g.grupo)}</h2><p>Campos e referências do domínio.</p></div></div><span class="group-count">${g.itens.length} tabelas</span></div><div class="db-cards">${g.itens.map(tableCard).join('')}</div></section>`).join('');
  document.getElementById('view-tabelas').innerHTML=`<div class="legend-bar"><span class="legend-table">Tabela</span><span class="legend-pk">Chave primária</span><span class="legend-fk">Chave estrangeira</span><span class="legend-normal">Campo comum</span></div>${html}`;
}

function renderRelacoes(){
  const rows=relacoes.map(r=>`<div class="relation-row"><div><span class="relation-link">${esc(r[0])}</span></div><div>${esc(r[1])}</div><div>${esc(r[2])}</div></div>`).join('');
  document.getElementById('view-relacoes').innerHTML=`<div class="section-card"><div class="section-head"><div><span class="kicker">cardinalidades</span><h3>Leitura para o BR Modelo</h3><p>Interpretação aplicada às tabelas do GastroMatch.</p></div></div><div class="relation-table"><div class="relation-head"><div>Ligação</div><div>Leitura</div><div>No BR Modelo, na hora de gerar o lógico</div></div>${rows}</div></div>
  <div class="two-note-grid"><div class="note-card"><b>PK — chave primária</b><span>Identifica unicamente um registro dentro da tabela.</span></div><div class="note-card"><b>FK — chave estrangeira</b><span>Aponta para a chave de outra tabela e materializa a relação.</span></div></div>`;
}

function renderReceita(auth){
  const canCreate=auth.role!=='admin' ? true : true;
  const prev=state.receitas.slice(-5).reverse();
  const prevHtml=prev.length?`<div class="recent-box"><div class="section-head"><div><span class="kicker">últimos registros locais</span><h3>Receitas adicionadas</h3></div></div><div class="recent-list">${prev.map(r=>`<div class="recent-item"><div><b>${esc(r.titulo)}</b><small>${esc(r.tipo_acesso==='exclusivo_pago'?`Exclusiva • R$ ${Number(r.preco_conteudo||0).toFixed(2).replace('.',',')}`:'Gratuita')} • ${esc(r.tempo_preparo_minutos)} min</small></div><span>${(r.restricoes||[]).map(x=>esc(restricciones.find(y=>y.id===x)?.nome||x)).join(' • ') || 'Sem restrições'}</span></div>`).join('')}</div></div>`:'<div class="recent-box"><div class="empty-local">Ainda não há receitas novas nesta área.</div></div>';

  document.getElementById('view-receita').innerHTML=`
    <div class="recipe-layout">
      <div class="section-card form-card">
        <div class="section-head"><div><span class="kicker">receitas + receitas_restricoes</span><h3>Nova receita</h3><p>Os campos abaixo correspondem ao cadastro proposto no banco do projeto.</p></div><span class="mini-label">ID automático</span></div>
        <form id="recipeForm" class="recipe-form">
          <div class="form-grid">
            <label class="field span-2"><span>Título da receita</span><input name="titulo" maxlength="160" placeholder="Ex.: Risoto de Cogumelos" required></label>
            <label class="field span-2"><span>Descrição introdutória</span><textarea name="descricao_introducao" placeholder="Apresente a receita em poucas linhas."></textarea></label>
            <label class="field"><span>Rendimento (porções)</span><input name="rendimento" type="number" min="1" value="2" required></label>
            <label class="field"><span>Tempo de preparo (minutos)</span><input name="tempo_preparo_minutos" type="number" min="1" value="30" required></label>
            <label class="field"><span>Dificuldade</span><select name="nivel_dificuldade"><option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option></select></label>
            <label class="field"><span>Tipo de acesso</span><select name="tipo_acesso" id="tipoAcesso"><option value="gratuito">Gratuito</option><option value="exclusivo_pago">Exclusivo pago</option></select></label>
            <label class="field" id="precoCampo"><span>Preço do conteúdo</span><input name="preco_conteudo" type="number" min="0" step="0.01" value="0"></label>
            <label class="field span-2"><span>Imagem (URL)</span><input name="img" type="url" placeholder="https://.../minha-receita.png"></label>
          </div>
          <div class="form-subsection"><div class="sub-head"><div><h4>Restrições alimentares</h4><p>Esta parte representa o N : N com <code>restricoes_alimentares</code>.</p></div><span class="required-note">selecione quantas precisar</span></div><div class="check-grid">${restricciones.map(x=>`<label class="check-card"><input type="checkbox" name="restricoes" value="${x.id}"><span><b>${x.nome}</b><small>receitas_restricoes</small></span></label>`).join('')}</div></div>
          <div class="form-grid">
            <label class="field span-2"><span>Ingredientes (um por linha)</span><textarea name="ingredientes" required placeholder="1 xícara de arroz\n200g de cogumelos\n1/2 cebola"></textarea></label>
            <label class="field span-2"><span>Modo de preparo (um passo por linha)</span><textarea name="preparo" required placeholder="Refogue a cebola.\nAdicione o arroz.\nFinalize com os cogumelos."></textarea></label>
          </div>
          <div class="optional-box"><div class="optional-head"><div><b>Videoaula</b><small>tabela videoaulas</small></div><label class="switch"><input type="checkbox" id="temVideo"><span></span></label></div><div id="videoFields" class="conditional-grid" hidden><label class="field"><span>URL do vídeo</span><input name="url_video" type="url" placeholder="https://.../video"></label><label class="field"><span>Duração (segundos)</span><input name="duracao_segundos" type="number" min="1" value="600"></label></div></div>
          <div class="optional-box"><div class="optional-head"><div><b>Kit de ingredientes</b><small>tabela kits_ingredientes</small></div><label class="switch"><input type="checkbox" id="temKit"><span></span></label></div><div id="kitFields" class="conditional-grid" hidden><label class="field"><span>Preço do kit (R$)</span><input name="preco_kit" type="number" min="0" step="0.01" value="0"></label><label class="field"><span>Estoque disponível</span><input name="estoque_disponivel" type="number" min="0" value="0"></label></div></div>
          <div class="form-actions"><button type="reset" class="outline-btn">Limpar</button><button type="submit" class="primary-btn">Salvar receita</button></div>
          <p id="recipeMsg" class="form-msg" aria-live="polite"></p>
        </form>
      </div>
      ${prevHtml}
    </div>`;

  const tipo=document.getElementById('tipoAcesso');
  const preco=document.querySelector('#precoCampo input');
  const syncPreco=()=>{ const exclusive=tipo.value==='exclusivo_pago'; document.getElementById('precoCampo').style.opacity=exclusive?'1':'.55'; preco.disabled=!exclusive; if(!exclusive) preco.value='0'; };
  tipo.addEventListener('change',syncPreco); syncPreco();
  const video=document.getElementById('temVideo'); const videoFields=document.getElementById('videoFields'); video.addEventListener('change',()=>videoFields.hidden=!video.checked);
  const kit=document.getElementById('temKit'); const kitFields=document.getElementById('kitFields'); kit.addEventListener('change',()=>kitFields.hidden=!kit.checked);
  document.getElementById('recipeForm').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget); const obj=Object.fromEntries(fd.entries());
    obj.id_receita=state.nextId++; obj.id_criador=auth.role==='admin'?1:(auth.role==='chef'?2:3); obj.rendimento=Number(obj.rendimento); obj.tempo_preparo_minutos=Number(obj.tempo_preparo_minutos); obj.preco_conteudo=Number(obj.preco_conteudo||0);
    obj.restricoes=fd.getAll('restricoes'); obj.ingredientes=String(obj.ingredientes||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean); obj.preparo=String(obj.preparo||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    obj.videoaula=video.checked?{url_video:obj.url_video||'',duracao_segundos:Number(obj.duracao_segundos||0)}:null;
    obj.kit=kit.checked?{preco_kit:Number(obj.preco_kit||0),estoque_disponivel:Number(obj.estoque_disponivel||0)}:null;
    state.receitas.push(obj); save('gm_area_receitas',state.receitas); renderReceita(auth); toast(`Receita "${obj.titulo}" salva nesta demonstração.`); switchTo('receita');
  });
}

async function initPainel(){
  const auth=currentAuth();
  if(!auth){ location.href='../login.html'; return; }

  const perfilBanco = await carregarPerfilSeguranca();
  const perfilAtual = perfilBanco || {
    nome: auth.nome || 'Usuário GastroMatch',
    email: auth.email || '',
    tipo_usuario: auth.role || 'admin'
  };

  document.getElementById('roleName').textContent=ROLES[perfilAtual.tipo_usuario]?.label || perfilAtual.nome || 'Administrador';
  document.getElementById('roleEmail').textContent=perfilAtual.email || auth.email || '';
  document.getElementById('roleDot').className='role-'+(perfilAtual.tipo_usuario || auth.role || 'admin');

  renderInicio({ ...auth, role: perfilAtual.tipo_usuario || auth.role, email: perfilAtual.email || auth.email || '', name: perfilAtual.nome || auth.nome || 'Usuário' });
  renderTabelas(); renderRelacoes(); renderReceita({ ...auth, role: perfilAtual.tipo_usuario || auth.role, email: perfilAtual.email || auth.email || '', name: perfilAtual.nome || auth.nome || 'Usuário' });
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchTo(b.dataset.view)));
  document.addEventListener('click', e=>{ const jump=e.target.closest('[data-view-jump]'); if(jump) switchTo(jump.dataset.viewJump); const copy=e.target.closest('[data-table-name]'); if(copy){navigator.clipboard?.writeText(copy.dataset.tableName); toast(`Nome da tabela copiado: ${copy.dataset.tableName}`);} });
  document.getElementById('logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem('gm_area_auth'); location.href='../login.html';});
}

function initLogin(){ location.href='../login.html'; }

if(document.body.classList.contains('login-page')) initLogin();
if(document.body.classList.contains('admin-page')) initPainel();
