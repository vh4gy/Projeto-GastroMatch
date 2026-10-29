/* ==========================================================
   GastroMatch — codigo.js
   Versão de demonstração com modo CHEF:
   - perfil profissional
   - painel "Minhas receitas"
   - cadastro de novas receitas
   - restrições alimentares (receitas_restricoes)
   - videoaulas e kit de ingredientes opcionais
   - persistência local com localStorage

   No back-end real, troque as funções de localStorage por API/SQL.
   ========================================================== */

const receitasBase = [
  {
    id_receita: 2, titulo: 'Poutine', pais: 'ca', img: 'img/poutine.png',
    nota: 4.0, avaliacoes: '67', nivel_dificuldade: 'facil', tempo_preparo_minutos: 20,
    rendimento: 4, tipo_acesso: 'gratuito', preco_conteudo: 0,
    preco_kit: 25.99, estoque_disponivel: 20,
    restricoes: [],
    descricao_introducao: 'Batatas crocantes, queijo e molho gravy em um clássico reconfortante.',
    ingredientes: ['1kg de batatas', 'Óleo para fritar', '300g de queijo coalho em cubos', 'Molho (gravy)'],
    preparo: [
      'Prepare as batatas: corte em palitos e deixe de molho em água por alguns minutos. Depois, seque bem.',
      'Frite as batatas em óleo quente até ficarem douradas e crocantes. Retire e coloque sobre papel-toalha.',
      'Aqueça o molho gravy até ficar bem quente.',
      'Monte: coloque as batatas em um prato, espalhe os pedaços de queijo por cima e despeje o molho quente.',
      'Sirva imediatamente: o calor do molho ajuda a deixar o queijo macio, enquanto as batatas continuam crocantes.'
    ]
  },
  {
    id_receita: 3, titulo: 'Carbonara', pais: 'it', img: 'img/carbonara.png',
    nota: 4.0, avaliacoes: '99+', nivel_dificuldade: 'facil', tempo_preparo_minutos: 20,
    rendimento: 2, tipo_acesso: 'gratuito', preco_conteudo: 0,
    preco_kit: 11.99, estoque_disponivel: 20,
    restricoes: [],
    descricao_introducao: 'Massa cremosa finalizada com gemas, queijo, pimenta e guanciale.',
    ingredientes: ['400g de Espaguete (fresco ou seco)', '150g de Guanciale (ou Pancetta) em cubos', '4 Ovos grandes (gemas separadas)', '100g de Queijo Pecorino Romano ralado', 'Pimenta-preta moída na hora'],
    preparo: [
      'Cozinhe o espaguete em água com pouco sal até a textura desejada.',
      'Em uma tigela, bata as gemas com o queijo ralado e a pimenta.',
      'Frite o guanciale em sua própria gordura até ficar crocante. Reserve a gordura.',
      'Transfira a massa escorrida para a panela do guanciale e desligue o fogo.',
      'Adicione a mistura de ovos e queijo, misturando rapidamente para formar um creme com o calor residual. Adicione água da massa se necessário.'
    ]
  },
  {
    id_receita: 1, titulo: 'Pastel de Queijo com Molho Vinagrete', pais: 'br', img: 'img/pastel.png',
    nota: 4.9, avaliacoes: '85', nivel_dificuldade: 'medio', tempo_preparo_minutos: 45,
    rendimento: 8, tipo_acesso: 'gratuito', preco_conteudo: 0,
    preco_kit: 14.89, estoque_disponivel: 20,
    restricoes: [],
    descricao_introducao: 'Pastel crocante recheado com queijo e servido com vinagrete.',
    ingredientes: ['500g de Massa para Pastel (fresca)', '300g de Queijo Minas Padrão ralado', '100g de Queijo Muçarela ralado', 'Óleo de milho ou girassol para fritar'],
    preparo: [
      'Prepare o vinagrete misturando tomate, cebola e temperos.',
      'Recheie os pastéis com o queijo minas e muçarela e feche as bordas.',
      'Frite em óleo bem quente até dourar.',
      'Sirva com o vinagrete.'
    ]
  },
  {
    id_receita: 4, titulo: 'Tacos', pais: 'mx', img: 'img/tacos.png',
    nota: 4.7, avaliacoes: '52', nivel_dificuldade: 'facil', tempo_preparo_minutos: 25,
    rendimento: 4, tipo_acesso: 'gratuito', preco_conteudo: 0,
    preco_kit: 19.90, estoque_disponivel: 20,
    restricoes: [],
    descricao_introducao: 'Tacos crocantes com carne temperada, vegetais e queijo.',
    ingredientes: ['8 conchas de taco', '400g de carne moída', '1 sachê de tempero para tacos', 'Alface e tomate picados', '100g de queijo cheddar ralado'],
    preparo: [
      'Refogue a carne moída com o tempero até secar.',
      'Aqueça as conchas no forno por 3 minutos.',
      'Recheie com a carne, a alface, o tomate e o queijo.',
      'Sirva na hora.'
    ]
  },
  {
    id_receita: 5, titulo: 'Camarão Empanado', pais: '', img: 'img/camarao.png',
    nota: 4.5, avaliacoes: '38', nivel_dificuldade: 'medio', tempo_preparo_minutos: 30,
    rendimento: 4, tipo_acesso: 'gratuito', preco_conteudo: 0,
    preco_kit: 32.90, estoque_disponivel: 20,
    restricoes: [],
    descricao_introducao: 'Camarões dourados e crocantes, empanados com farinha panko.',
    ingredientes: ['500g de camarão limpo', '2 ovos batidos', '1 xícara de farinha de trigo', '2 xícaras de farinha panko', 'Sal, pimenta e óleo para fritar'],
    preparo: [
      'Tempere os camarões com sal e pimenta.',
      'Passe na farinha de trigo, nos ovos e na farinha panko.',
      'Frite em óleo quente até dourar.',
      'Escorra em papel-toalha e sirva.'
    ]
  }
];

const restricoesDisponiveis = [
  { id: 'vegano', label: 'Vegano' },
  { id: 'sem-gluten', label: 'Sem glúten' },
  { id: 'sem-lactose', label: 'Sem lactose' }
];

/* ---------- dados locais de demonstração ---------- */

const perfilPadrao = {
  id_usuario: 1,
  nome: 'Chef GastroMatch',
  email: 'chef@gastromatch.com.br',
  telefone: '',
  tipo_usuario: 'chef',
  data_cadastro: new Date().toISOString().slice(0, 10),
  foto_perfil: '',
  biografia: 'Chef apaixonado por transformar receitas em experiências simples e saborosas.',
  link_portfolio: 'https://gastromatch.com.br',
  status_validacao: 'aprovado'
};

const perfilVisitante = {
  id_usuario: 0,
  nome: 'Visitante',
  email: '',
  telefone: '',
  tipo_usuario: 'cliente',
  data_cadastro: new Date().toISOString().slice(0, 10),
  foto_perfil: '',
  biografia: '',
  link_portfolio: '',
  status_validacao: ''
};

function carregarPerfil() {
  try {
    const auth = JSON.parse(sessionStorage.getItem('gm_area_auth') || 'null');
    const salvo = JSON.parse(localStorage.getItem('gm_usuario') || 'null');
    if (!auth || !auth.role) return { ...perfilVisitante };
    return { ...perfilVisitante, ...(salvo || {}), id_usuario: Number(salvo?.id_usuario || auth.idUsuario || 0), email: String(salvo?.email || auth.email || ''), tipo_usuario: String(salvo?.tipo_usuario || auth.role || 'cliente'), nome: String(salvo?.nome || auth.nome || 'Usuário GastroMatch') };
  } catch (e) {
    return { ...perfilVisitante };
  }
}

async function atualizarPerfilDoBanco() {
  try {
    const auth = JSON.parse(sessionStorage.getItem('gm_area_auth') || 'null');
    const idUsuario = Number(auth?.idUsuario || auth?.id_usuario || 0);
    if (!auth || !auth.role || !idUsuario) return null;

    const resposta = await fetch(`api.php?action=perfil&id_usuario=${idUsuario}`, { cache: 'no-store' });
    const payload = await resposta.json().catch(() => ({ success: false, message: 'Falha ao carregar perfil.' }));
    if (!resposta.ok || !payload.success || !payload.data?.user) return null;

    const usuario = payload.data.user;
    const perfilBanco = {
      id_usuario: Number(usuario.id_usuario || idUsuario),
      nome: usuario.nome || auth.nome || 'Usuário GastroMatch',
      email: usuario.email || auth.email || '',
      telefone: usuario.telefone || '',
      tipo_usuario: usuario.tipo_usuario || auth.role,
      data_cadastro: usuario.data_cadastro || new Date().toISOString().slice(0, 10),
      foto_perfil: usuario.foto_perfil || '',
      biografia: usuario.biografia || '',
      link_portfolio: usuario.link_portfolio || '',
      status_validacao: usuario.status_validacao || 'pendente'
    };

    perfilAtual = { ...perfilVisitante, ...perfilBanco };
    salvarPerfilLocal(perfilAtual);
    return perfilAtual;
  } catch (erro) {
    console.warn('Perfil do banco indisponível, usando dados locais.', erro);
    return null;
  }
}

function salvarPerfilLocal(perfil) {
  try {
    localStorage.setItem('gm_usuario', JSON.stringify(perfil));
  } catch (e) {
    console.warn('Não foi possível salvar o perfil no navegador.', e);
  }
}

function carregarReceitas() {
  try {
    const novas = JSON.parse(localStorage.getItem('gm_receitas_criadas')) || [];
    return [...receitasBase.map(r => ({ ...r })), ...novas];
  } catch (e) {
    return receitasBase.map(r => ({ ...r }));
  }
}

function salvarReceitasCriadas() {
  const novas = receitas.filter(r => r.criado_pelo_chef);
  try { localStorage.setItem('gm_receitas_criadas', JSON.stringify(novas)); } catch (e) { console.warn(e); }
}

let perfilAtual = carregarPerfil();
let receitas = carregarReceitas();

function normalizarReceitaAPI(receita) {
  const parseArray = (valor) => {
    if (Array.isArray(valor)) return valor;
    if (!valor) return [];
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (!texto) return [];
      try {
        const json = JSON.parse(texto);
        if (Array.isArray(json)) return json;
      } catch (e) {}
      if (texto.includes('||')) return texto.split('||').map(v => v.trim()).filter(Boolean);
      if (texto.includes(',')) return texto.split(',').map(v => v.trim()).filter(Boolean);
      return [texto];
    }
    return [];
  };

  return {
    ...receita,
    id_receita: Number(receita.id_receita || 0),
    id_criador: Number(receita.id_criador || perfilAtual.id_usuario || 2),
    titulo: receita.titulo || 'Receita',
    nota: Number(receita.nota || 0),
    avaliacoes: String(receita.avaliacoes || '0'),
    rendimento: Number(receita.rendimento || 0),
    tempo_preparo_minutos: Number(receita.tempo_preparo_minutos || 0),
    preco_conteudo: Number(receita.preco_conteudo || 0),
    preco_kit: Number(receita.preco_kit || 0),
    estoque_disponivel: Number(receita.estoque_disponivel || 0),
    restricoes: Array.isArray(receita.restricoes) ? receita.restricoes : parseArray(receita.restricoes),
    ingredientes: parseArray(receita.ingredientes),
    preparo: parseArray(receita.preparo),
    criado_pelo_chef: Boolean(receita.criado_pelo_chef ?? true),
    img: receita.img || 'img/pastel.png',
    tipo_acesso: receita.tipo_acesso || 'gratuito'
  };
}

async function carregarReceitasRemotas() {
  try {
    const resposta = await fetch('api.php?action=receitas', { cache: 'no-store' });
    if (!resposta.ok) return null;
    const payload = await resposta.json();
    if (!payload.success || !Array.isArray(payload.data)) return null;
    return payload.data.map(normalizarReceitaAPI);
  } catch (erro) {
    console.warn('Banco MySQL indisponível; usando dados locais.', erro);
    return null;
  }
}

async function sincronizarReceitasDoBanco() {
  const remotas = await carregarReceitasRemotas();
  if (remotas && remotas.length) {
    receitas = remotas;
    try {
      localStorage.setItem('gm_receitas_criadas', JSON.stringify(receitas.filter(r => r.criado_pelo_chef)));
    } catch (e) {
      console.warn('Não foi possível persistir receitas locais.', e);
    }
  }
}

/* ---------- utilidades ---------- */

const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[ch]));
const brl = v => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
const niveis = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const achar = id => receitas.find(r => r.id_receita == id);
const tipoLabel = t => ({
  cliente: 'Cliente', chef: 'Chef', restaurante: 'Restaurante', admin: 'Administrador'
}[t] || 'Usuário');
const restricaoLabel = id => restricoesDisponiveis.find(r => r.id === id)?.label || id;
const acessoLabel = t => t === 'exclusivo_pago' ? 'Exclusivo pago' : 'Gratuito';

const foto = (r, classe = '') =>
  `<img class="${classe}" src="${esc(r.img)}" alt="${esc(r.titulo)}" loading="lazy" onerror="this.style.opacity=0">`;

const estrelas = n => {
  const valor = Number(n || 0);
  const c = Math.max(0, Math.min(5, Math.round(valor)));
  return `<span class="estrelas" aria-label="${valor.toFixed(1)} de 5">${'★'.repeat(c)}<i>${'★'.repeat(5 - c)}</i></span>`;
};

const avatar = (perfil = perfilAtual, classe = 'avatar') => {
  if (perfil.foto_perfil) {
    return `<img class="${classe}" src="${esc(perfil.foto_perfil)}" alt="Foto de perfil de ${esc(perfil.nome)}">`;
  }
  const iniciais = (perfil.nome || 'Gastro Match')
    .split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return `<div class="${classe} avatar-iniciais" aria-label="Avatar de ${esc(perfil.nome)}">${esc(iniciais)}</div>`;
};

function toast(mensagem) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = mensagem;
  el.classList.add('visivel');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('visivel'), 2600);
}

function emBreve(titulo, texto) {
  return `<section class="pagina vazio"><div class="icone-vazio">🍴</div><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></section>`;
}

function tagsRestricoes(r) {
  const lista = r.restricoes || [];
  if (!lista.length) return '<span class="tag-restricao neutra">Sem restrição informada</span>';
  return lista.map(x => `<span class="tag-restricao">${esc(restricaoLabel(x))}</span>`).join('');
}

/* ---------- carrinho ---------- */

let cesta = [];
try { cesta = JSON.parse(localStorage.getItem('gm_carrinho')) || []; } catch (e) {}

function salvarCesta() {
  try { localStorage.setItem('gm_carrinho', JSON.stringify(cesta)); } catch (e) {}
  const badge = $('#badge');
  if (badge) badge.textContent = cesta.reduce((soma, i) => soma + i.qtd, 0);
}

function comprarKit(id) {
  const r = achar(id);
  if (!r) return;
  const item = cesta.find(i => i.id == id);
  if (item) item.qtd = Math.min(item.qtd + 1, r.estoque_disponivel);
  else cesta.push({ id, qtd: 1 });
  salvarCesta(); toast('Kit adicionado ao carrinho.'); location.hash = '#carrinho';
}

function mudarQtd(id, d) {
  const item = cesta.find(i => i.id == id);
  if (!item) return;
  item.qtd = Math.min(item.qtd + d, achar(id).estoque_disponivel);
  if (item.qtd <= 0) cesta = cesta.filter(i => i !== item);
  salvarCesta(); rota();
}

function remover(id) {
  cesta = cesta.filter(i => i.id != id); salvarCesta(); rota(); toast('Item removido do carrinho.');
}

async function finalizar() {
  if (!cesta.length) {
    toast('Seu carrinho está vazio.');
    return;
  }
  location.hash = '#pagamento';
}

async function confirmarPagamento(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const metodo = form.querySelector('input[name="metodo_pagamento"]:checked')?.value || 'pix';
  const itens = cesta.map(i => {
    return {
      id_receita: i.id,
      quantidade: i.qtd
    };
  }).filter(item => item.id_receita && item.quantidade > 0);

  const pedido = {
    id_cliente: perfilAtual.id_usuario,
    metodo_pagamento: metodo,
    nome_destinatario: form.elements.nome_pagador.value.trim(),
    observacoes: form.elements.observacoes.value.trim(),
    endereco: {
      cep: form.elements.endereco_cep.value,
      logradouro: form.elements.endereco_logradouro.value.trim(),
      numero: form.elements.endereco_numero.value.trim(),
      complemento: form.elements.endereco_complemento.value.trim(),
      bairro: form.elements.endereco_bairro.value.trim(),
      cidade: form.elements.endereco_cidade.value.trim(),
      estado: form.elements.endereco_estado.value.trim()
    },
    cartao_bandeira: form.elements.cartao_bandeira?.value || '',
    cartao_ultimos4: form.elements.cartao_ultimos4?.value || '',
    itens
  };

  try {
    const resposta = await fetch('api.php?action=pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido)
    });

    const payload = await resposta.json().catch(() => ({ success: false, message: 'Não foi possível registrar o pedido no banco.' }));
    if (!resposta.ok || !payload.success) {
      throw new Error(payload.message || 'Não foi possível registrar o pedido no banco.');
    }

    cesta = []; salvarCesta(); toast(`Pedido #${payload.data.id_pedido} registrado no modo demonstração.`); location.hash = '#inicio';
    return;
  } catch (erro) {
    toast(erro.message || 'Não foi possível registrar o pedido. O carrinho foi mantido.');
  }
}

/* ---------- carrossel ---------- */

let pos = 2;
const AUTOPLAY_MS = 5000;

function deslocamento(i) {
  const n = receitas.length;
  let d = ((i - pos) % n + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

function aplicar(el, d) {
  el.className = 'slide ' + (Math.abs(d) > 2 ? 'dh' : 'd' + Math.abs(d));
  el.style.setProperty('--lado', Math.sign(d));
  el.dataset.d = d;
}

function mover(passo) {
  pos = ((pos + passo) % receitas.length + receitas.length) % receitas.length;
  document.querySelectorAll('.slide').forEach(el => {
    aplicar(el, deslocamento(Number(el.dataset.i)));
  });
}

function abrirSlide(i) {
  const d = deslocamento(i);
  if (d === 0) location.hash = '#receita-' + receitas[i].id_receita;
  else mover(d);
}

/* ---------- cards ---------- */

function cardReceita(r, compacto = false) {
  return `<a class="card-receita${compacto ? ' compacto' : ''}" href="#receita-${r.id_receita}">
    <div class="card-img-wrap">${foto(r)}<span class="tag">${esc(niveis[r.nivel_dificuldade] || 'Sem nível')}</span></div>
    <div class="card-corpo">
      <h3>${esc(r.titulo)}</h3>
      <div class="rating">${estrelas(r.nota)} <span>${Number(r.nota || 0).toFixed(1)} <em>(${esc(r.avaliacoes || 'Nova')})</em></span></div>
      <div class="restricoes-lista">${tagsRestricoes(r)}</div>
      <div class="meta"><span>⏱ ${r.tempo_preparo_minutos || 0} min</span><span>${r.tipo_acesso === 'exclusivo_pago' ? brl(r.preco_conteudo) : 'Gratuita'}</span></div>
    </div>
  </a>`;
}

const telas = {
  inicio() {
    const slides = receitas.slice(0, 7).map((r, i) => {
      const d = deslocamento(i);
      return `<div class="slide ${Math.abs(d) > 2 ? 'dh' : 'd' + Math.abs(d)}" style="--lado:${Math.sign(d)}" data-d="${d}" data-i="${i}" onclick="abrirSlide(${i})">
        ${foto(r)}<div class="slide-legenda"><strong>${esc(r.titulo)}</strong><span>${r.tempo_preparo_minutos} min • ${niveis[r.nivel_dificuldade]}</span></div>
      </div>`;
    }).join('');

    const destaques = [receitas[2], receitas[1], receitas[4]].filter(Boolean).map(r => cardReceita(r)).join('');
    return `<section class="home">
      <div class="hero">
        <div class="hero-texto"><span class="eyebrow">🍳 sua cozinha, do seu jeito</span>
          <h1>Descubra. Aprenda.<br><span>Cozinhe.</span></h1>
          <p>Receitas, videoaulas, chefs e kits de ingredientes em uma experiência gastronômica completa.</p>
          <div class="hero-acoes"><a class="btn" href="#feed">Explorar receitas</a><a class="btn btn-ghost" href="#perfil">Meu perfil</a></div>
          <div class="hero-dados"><span><b>${receitas.length}</b><small>receitas disponíveis</small></span><span><b>4,6★</b><small>média de avaliações</small></span><span><b>3</b><small>filtros alimentares</small></span></div>
        </div>
        <div class="hero-mosaico"><div class="hero-img principal">${foto(receitas[4] || receitas[0])}</div><div class="hero-img topo">${foto(receitas[2] || receitas[0])}</div><div class="hero-img canto">${foto(receitas[0])}</div><span class="selo">feito para<br><strong>quem ama cozinhar</strong></span></div>
      </div>
      <div class="destaques"><div class="secao-titulo"><div><span class="eyebrow">giro da semana</span><h2>Receitas em destaque</h2></div><a href="#feed" class="link-seta">Ver todas →</a></div>
        <div class="carrossel"><button class="seta esq" onclick="mover(-1)" aria-label="Anterior">‹</button>${slides}<button class="seta dir" onclick="mover(1)" aria-label="Próxima">›</button></div>
      </div>
      <section class="secao-lista"><div class="secao-titulo"><div><span class="eyebrow">escolhas da casa</span><h2>Quer começar por aqui?</h2></div></div><div class="grade destaque-grid">${destaques}</div></section>
    </section>`;
  },

  feed() {
    const cards = receitas.map(r => cardReceita(r)).join('');
    return `<section class="pagina pagina-feed"><div class="pagina-cabecalho"><div><span class="eyebrow">descubra novos sabores</span><h2>Feed de receitas</h2><p>Procure por nome, dificuldade, tempo e restrição alimentar.</p></div><div class="feed-indicador">${receitas.length} receitas</div></div>
      <div class="filtros filtros-feed">
        <label class="campo busca"><span>Buscar</span><input id="buscaReceita" type="search" placeholder="Ex.: carbonara, tacos..." oninput="filtrarReceitas()"></label>
        <label class="campo"><span>Dificuldade</span><select id="filtroNivel" onchange="filtrarReceitas()"><option value="">Todas</option><option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option></select></label>
        <label class="campo"><span>Tempo máximo</span><select id="filtroTempo" onchange="filtrarReceitas()"><option value="">Qualquer</option><option value="20">até 20 min</option><option value="30">até 30 min</option><option value="45">até 45 min</option></select></label>
        <label class="campo"><span>Restrição</span><select id="filtroRestricao" onchange="filtrarReceitas()"><option value="">Todas</option>${restricoesDisponiveis.map(r => `<option value="${r.id}">${r.label}</option>`).join('')}</select></label>
      </div>
      <div class="grade" id="gradeReceitas">${cards}</div><div id="semResultado" class="sem-resultado" hidden>Nenhuma receita encontrada com esses filtros.</div>
    </section>`;
  },

  perto() {
    return `<section class="pagina"><div class="pagina-cabecalho"><div><span class="eyebrow">logística local</span><h2>Perto de você</h2><p>Esta tela está preparada para usar latitude/longitude + raio de entrega quando o back-end estiver conectado.</p></div></div>
      <div class="local-box"><div class="local-icone">⌖</div><div><h3>Disponibilidade regional</h3><p>O banco prevê <strong>latitude/longitude</strong> do criador e um <strong>raio_km_cobertura</strong> para validar os kits disponíveis na região do cliente.</p></div></div>
      <div class="grade destaque-grid">${receitas.slice(0, 3).map(r => cardReceita(r, true)).join('')}</div></section>`;
  },

  perfil() {
    perfilAtual = carregarPerfil();
    const criador = ['chef', 'restaurante'].includes(perfilAtual.tipo_usuario);
    return `<section class="pagina perfil-pagina">
      <div class="perfil-capa"><div class="perfil-hero-avatar">${avatar(perfilAtual, 'avatar avatar-grande')}</div><div class="perfil-resumo">
        <span class="pill">${tipoLabel(perfilAtual.tipo_usuario)}</span><h1>${esc(perfilAtual.nome)}</h1><p>${esc(perfilAtual.email)}</p>
        ${criador ? `<div class="status-validacao">● ${esc(perfilAtual.status_validacao || 'pendente')} <small>status de validação</small></div>` : ''}
      </div><div class="perfil-atalhos">${criador ? '<a href="#chef" class="btn">Painel do Chef</a>' : ''}</div></div>
      <div class="perfil-grid"><form class="form-card" id="perfilForm" onsubmit="salvarPerfil(event)">
        <div class="form-topo"><div><span class="eyebrow">dados da conta</span><h2>Editar perfil</h2></div><span class="salvo-info">Salvo neste navegador</span></div>
        <div class="avatar-editor">${avatar(perfilAtual, 'avatar avatar-editor-img')}<div><label class="upload-btn" for="fotoPerfil">Trocar foto</label><input id="fotoPerfil" type="file" accept="image/png,image/jpeg,image/webp" onchange="prepararFoto(this)"><button class="link-btn" type="button" onclick="removerFoto()">Remover foto</button><small>PNG, JPG ou WEBP • a imagem é reduzida automaticamente.</small></div></div>
        <div class="form-grid">
          <label class="campo campo-span"><span>Nome completo</span><input name="nome" type="text" maxlength="80" required value="${esc(perfilAtual.nome)}" placeholder="Nome do chef"></label>
          <label class="campo"><span>E-mail</span><input name="email" type="email" maxlength="120" required value="${esc(perfilAtual.email)}"></label>
          <label class="campo"><span>Telefone</span><input name="telefone" type="tel" maxlength="20" value="${esc(perfilAtual.telefone)}" placeholder="(11) 99999-9999"></label>
          <label class="campo campo-span"><span>Tipo de usuário</span><input type="text" value="${tipoLabel(perfilAtual.tipo_usuario)}" disabled></label>
        </div>
        ${criador ? `<div class="subseção"><div><span class="eyebrow">perfil profissional</span><h3>Informações do criador</h3></div><div class="form-grid">
          <label class="campo campo-span"><span>Biografia</span><textarea name="biografia" maxlength="500" rows="5" placeholder="Conte um pouco sobre sua cozinha...">${esc(perfilAtual.biografia)}</textarea></label>
          <label class="campo campo-span"><span>Link do portfólio</span><input name="link_portfolio" type="url" maxlength="250" value="${esc(perfilAtual.link_portfolio)}" placeholder="https://..."></label>
          <div class="info-box campo-span"><strong>Validação da plataforma:</strong> ${esc(perfilAtual.status_validacao || 'pendente')}. O status e os documentos de validação são gerenciados pela plataforma.</div>
        </div></div>` : `<div class="info-box">Seu perfil de cliente usa os dados da tabela <strong>usuarios</strong>. Quando a conta for de chef/restaurante, os campos profissionais da tabela <strong>perfis_criadores</strong> aparecem aqui.</div>`}
        <div class="form-acoes"><a class="btn btn-ghost" href="#inicio">Cancelar</a><button class="btn" type="submit">Salvar alterações</button></div>
      </form>
      <aside class="perfil-lateral">${criador ? `<div class="mini-card mini-chef"><span class="eyebrow">modo chef</span><h3>Publicar receitas</h3><p>Cadastre pratos, descreva o preparo e marque as <strong>restrições alimentares</strong> antes de publicar.</p><a href="#novareceita" class="btn">+ Nova receita</a><a href="#chef" class="btn btn-ghost">Ver minhas receitas</a></div>` : `<div class="mini-card mini-chef"><span class="eyebrow">demonstração</span><h3>Testar como Chef</h3><p>Ative o modo de chef para navegar pelas telas de criação de receitas do protótipo.</p><button class="btn" type="button" onclick="ativarModoChef()">Entrar como Chef</button></div>`}
        <div class="mini-card"><span class="eyebrow">sobre a conta</span><h3>Privacidade</h3><p>A senha não é editada por esta tela. No sistema real, ela deve continuar armazenada apenas como hash no servidor.</p></div>
        <div class="mini-card"><span class="eyebrow">estrutura do projeto</span><h3>Campos do banco</h3><div class="campo-lista"><span>✓</span> usuarios</div><div class="campo-lista"><span>✓</span> perfis_criadores</div><div class="campo-lista"><span>✓</span> status_validacao</div><div class="campo-lista"><span>✓</span> foto_perfil</div></div>
      </aside></div></section>`;
  },

  chef() {
    perfilAtual = carregarPerfil();
    if (!['chef', 'restaurante'].includes(perfilAtual.tipo_usuario)) {
      return `<section class="pagina vazio"><div class="icone-vazio">👨‍🍳</div><h2>Painel do Chef</h2><p>Esta área é exclusiva para contas de chef ou restaurante.</p><a class="btn" href="#perfil">Abrir perfil</a></section>`;
    }
    const minhas = receitas.filter(r => r.criado_pelo_chef && r.id_criador === perfilAtual.id_usuario);
    return `<section class="pagina pagina-chef"><div class="chef-banner"><div><span class="eyebrow">área do criador</span><h2>Painel do Chef</h2><p>Gerencie suas receitas, restrições alimentares e conteúdos exclusivos.</p></div><div class="chef-banner-acoes"><a class="btn" href="#novareceita">+ Adicionar receita</a><a class="btn btn-light" href="#perfil">Editar perfil</a></div></div>
      <div class="stats-chef"><div><strong>${minhas.length}</strong><span>receitas criadas</span></div><div><strong>${minhas.reduce((s,r) => s + (r.nota || 0), 0).toFixed(1)}</strong><span>soma das notas</span></div><div><strong>${minhas.filter(r => (r.restricoes || []).length).length}</strong><span>com restrições informadas</span></div></div>
      <div class="secao-titulo"><div><span class="eyebrow">seu catálogo</span><h2>Minhas receitas</h2></div><a href="#novareceita" class="link-seta">Criar nova →</a></div>
      ${minhas.length ? `<div class="grade">${minhas.map(r => `<div class="chef-receita-item">${cardReceita(r)}<div class="chef-item-acoes"><a class="btn btn-ghost" href="#receita-${r.id_receita}">Visualizar</a></div></div>`).join('')}</div>` : `<div class="chef-vazio"><div class="icone-vazio">🥘</div><h3>Você ainda não publicou receitas.</h3><p>Comece adicionando seu primeiro prato e informe também as restrições alimentares.</p><a href="#novareceita" class="btn">Adicionar primeira receita</a></div>`}
    </section>`;
  },

  novareceita() {
    perfilAtual = carregarPerfil();
    if (!['chef', 'restaurante'].includes(perfilAtual.tipo_usuario)) return telas.chef();
    const temp = window.receitaRascunho || {};
    return `<section class="pagina pagina-nova-receita"><div class="pagina-cabecalho"><div><span class="eyebrow">área do criador</span><h2>Adicionar nova receita</h2><p>Preencha os dados da receita e selecione as restrições alimentares correspondentes.</p></div><a href="#chef" class="btn btn-ghost">← Voltar ao painel</a></div>
      <form class="receita-form" id="receitaForm" onsubmit="publicarReceita(event)">
        <div class="form-coluna-principal">
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">1 • apresentação</span><h2>Sobre o prato</h2></div></div>
            <label class="campo"><span>Título da receita</span><input name="titulo" type="text" maxlength="100" required value="${esc(temp.titulo)}" placeholder="Ex.: Risoto de cogumelos"></label>
            <label class="campo"><span>Descrição de introdução</span><textarea name="descricao_introducao" maxlength="500" rows="4" required placeholder="Apresente o prato em poucas linhas...">${esc(temp.descricao_introducao)}</textarea></label>
            <div class="form-grid"><label class="campo"><span>Rendimento (porções)</span><input name="rendimento" type="number" min="1" max="100" required value="${esc(temp.rendimento || 2)}"></label><label class="campo"><span>Tempo de preparo (minutos)</span><input name="tempo_preparo_minutos" type="number" min="1" max="1440" required value="${esc(temp.tempo_preparo_minutos || 30)}"></label></div>
            <div class="form-grid"><label class="campo"><span>Nível de dificuldade</span><select name="nivel_dificuldade"><option value="facil" ${temp.nivel_dificuldade === 'facil' || !temp.nivel_dificuldade ? 'selected' : ''}>Fácil</option><option value="medio" ${temp.nivel_dificuldade === 'medio' ? 'selected' : ''}>Médio</option><option value="dificil" ${temp.nivel_dificuldade === 'dificil' ? 'selected' : ''}>Difícil</option></select></label><label class="campo"><span>Tipo de acesso</span><select id="tipoAcesso" name="tipo_acesso" onchange="alternarPrecoConteudo()"><option value="gratuito" ${temp.tipo_acesso === 'exclusivo_pago' ? '' : 'selected'}>Gratuito</option><option value="exclusivo_pago" ${temp.tipo_acesso === 'exclusivo_pago' ? 'selected' : ''}>Exclusivo pago</option></select></label></div>
            <div class="form-grid"><label class="campo campo-span" id="campoPrecoConteudo"><span>Preço do conteúdo (R$)</span><input id="precoConteudo" name="preco_conteudo" type="number" min="0" step="0.01" value="${esc(temp.preco_conteudo || 0)}" placeholder="0,00"></label></div>
          </div>
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">2 • conteúdo</span><h2>Ingredientes e preparo</h2></div></div>
            <label class="campo"><span>Ingredientes (um por linha)</span><textarea name="ingredientes" rows="8" required placeholder="500g de arroz\n200g de cogumelos\n...">${esc((temp.ingredientes || []).join('\n'))}</textarea></label>
            <label class="campo"><span>Modo de preparo (uma etapa por linha)</span><textarea name="preparo" rows="9" required placeholder="Refogue os ingredientes...\nAdicione o caldo...\nFinalize...">${esc((temp.preparo || []).join('\n'))}</textarea></label>
          </div>
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">3 • restrições</span><h2>Restrições alimentares</h2><p class="form-ajuda">As opções marcadas serão gravadas no relacionamento <strong>receitas_restricoes</strong>.</p></div></div>
            <div class="restricoes-grid">${restricoesDisponiveis.map(r => `<label class="check-card"><input type="checkbox" name="restricoes" value="${r.id}" ${temp.restricoes?.includes(r.id) ? 'checked' : ''}><span><b>${esc(r.label)}</b><small>Marque apenas se a receita atender à restrição.</small></span></label>`).join('')}</div>
          </div>
        </div>
        <aside class="form-coluna-lateral">
          <div class="form-card upload-receita"><span class="eyebrow">foto</span><h3>Imagem da receita</h3><div id="previewReceita" class="preview-receita">${temp.img ? `<img src="${esc(temp.img)}" alt="Prévia">` : '<span>🍽️<small>Escolha uma foto bonita do prato.</small></span>'}</div><label class="upload-btn largo" for="fotoReceita">Escolher imagem</label><input id="fotoReceita" type="file" accept="image/png,image/jpeg,image/webp" onchange="prepararFotoReceita(this)"></div>
          <div class="form-card"><span class="eyebrow">videoaula</span><h3>Conteúdo em vídeo</h3><label class="campo"><span>URL do vídeo</span><input name="url_video" type="url" value="${esc(temp.url_video)}" placeholder="https://... "></label><label class="campo"><span>Duração (segundos)</span><input name="duracao_segundos" type="number" min="0" value="${esc(temp.duracao_segundos || 0)}"></label><div class="info-box">Esses campos correspondem à tabela <strong>videoaulas</strong>.</div></div>
          <div class="form-card"><span class="eyebrow">kit de ingredientes</span><h3>Oferecer kit?</h3><label class="switch-linha"><input id="oferecerKit" name="oferecer_kit" type="checkbox" onchange="alternarKit()" ${temp.oferecer_kit ? 'checked' : ''}><span>Disponibilizar kit para compra</span></label><div id="dadosKit" class="dados-kit" ${temp.oferecer_kit ? '' : 'hidden'}><label class="campo"><span>Preço do kit (R$)</span><input name="preco_kit" type="number" min="0" step="0.01" value="${esc(temp.preco_kit || 0)}"></label><label class="campo"><span>Estoque disponível</span><input name="estoque_disponivel" type="number" min="0" value="${esc(temp.estoque_disponivel || 0)}"></label><div class="info-box">Ligação com <strong>kits_ingredientes</strong> e, futuramente, <strong>raio_entrega_restaurantes</strong>.</div></div></div>
          <div class="form-card publicar-box"><button class="btn btn-publicar" type="submit">Publicar receita</button><button class="btn btn-ghost" type="button" onclick="salvarRascunho()">Salvar rascunho</button><small>Simulação local: depois, o back-end poderá enviar tudo para as tabelas do banco.</small></div>
        </aside>
      </form></section>`;
  },

  carrinho() {
    if (!cesta.length) return `<section class="pagina vazio"><div class="icone-vazio">🛒</div><h2>Seu carrinho está vazio</h2><p>Escolha uma receita e compre o kit de ingredientes.</p><br><a class="btn" href="#feed">Ver receitas</a></section>`;
    let total = 0;
    const linhas = cesta.map(i => { const r = achar(i.id); if (!r) return ''; total += r.preco_kit * i.qtd; return `<div class="item-carrinho">${foto(r)}<div class="item-nome"><strong>Kit ${esc(r.titulo)}</strong><small>${brl(r.preco_kit)} por unidade</small></div><div class="qtd"><button onclick="mudarQtd(${i.id},-1)">−</button><span>${i.qtd}</span><button onclick="mudarQtd(${i.id},1)">+</button></div><strong class="subtotal">${brl(r.preco_kit * i.qtd)}</strong><button class="x" onclick="remover(${i.id})">✕</button></div>`; }).join('');
    return `<section class="pagina pagina-carrinho"><div class="pagina-cabecalho"><div><span class="eyebrow">seu pedido</span><h2>Meu carrinho</h2></div></div><div class="carrinho-layout"><div>${linhas}</div><aside class="resumo-pedido"><span class="eyebrow">resumo</span><div class="linha-resumo"><span>Itens</span><strong>${cesta.reduce((s,i)=>s+i.qtd,0)}</strong></div><div class="linha-resumo total-final"><span>Total</span><strong>${brl(total)}</strong></div><button class="btn" onclick="finalizar()">Finalizar compra</button><small>Pedido em modo de demonstração.</small></aside></div></section>`;
  },

  pagamento() {
    if (!cesta.length) {
      return `<section class="pagina vazio"><div class="icone-vazio">💳</div><h2>Pagamento</h2><p>Seu carrinho está vazio. Selecione um kit antes de finalizar.</p><br><a class="btn" href="#feed">Ver receitas</a></section>`;
    }

    const total = cesta.reduce((soma, item) => {
      const r = achar(item.id);
      return soma + (r ? r.preco_kit * item.qtd : 0);
    }, 0);

    return `<section class="pagina pagina-pagamento">
      <div class="pagina-cabecalho"><div><span class="eyebrow">finalize sua compra</span><h2>Pagamento</h2></div><a href="#carrinho" class="btn btn-ghost">← Voltar ao carrinho</a></div>
      <div class="pagamento-layout">
        <form class="form-card pagamento-card" id="pagamentoForm" onsubmit="confirmarPagamento(event)">
          <div class="pagamento-opcoes">
            <label class="payment-option"><input type="radio" name="metodo_pagamento" value="pix" checked><span>PIX</span></label>
            <label class="payment-option"><input type="radio" name="metodo_pagamento" value="cartao"><span>Cartão</span></label>
            <label class="payment-option"><input type="radio" name="metodo_pagamento" value="boleto"><span>Boleto</span></label>
            <label class="payment-option"><input type="radio" name="metodo_pagamento" value="transferencia"><span>Transferência</span></label>
          </div>

          <div class="form-grid">
            <label class="campo campo-span"><span>Nome do pagador</span><input name="nome_pagador" type="text" value="${esc(perfilAtual.nome || 'Cliente GastroMatch')}" required></label>
            <label class="campo"><span>CEP</span><input name="endereco_cep" type="text" inputmode="numeric" maxlength="9" placeholder="00000-000" required></label>
            <label class="campo"><span>Estado (UF)</span><input name="endereco_estado" type="text" maxlength="2" placeholder="SP" required></label>
            <label class="campo campo-span"><span>Logradouro</span><input name="endereco_logradouro" type="text" maxlength="150" placeholder="Rua ou avenida" required></label>
            <label class="campo"><span>Número</span><input name="endereco_numero" type="text" maxlength="20" required></label>
            <label class="campo"><span>Complemento (opcional)</span><input name="endereco_complemento" type="text" maxlength="100"></label>
            <label class="campo"><span>Bairro</span><input name="endereco_bairro" type="text" maxlength="100" required></label>
            <label class="campo"><span>Cidade</span><input name="endereco_cidade" type="text" maxlength="100" required></label>
            <label class="campo campo-span"><span>Observações do pedido (opcional)</span><textarea name="observacoes" rows="3" maxlength="2000" placeholder="Instruções para entrega ou preparo"></textarea></label>
          </div>

          <div class="payment-extra">
            <div class="payment-box pix-box">
              <strong>PIX</strong>
              <p>Chave: gastromatch@pix.com.br</p>
              <small>Pagamento instantâneo e confirmado em minutos.</small>
            </div>
            <div class="payment-box cartao-box" hidden>
              <strong>Cartão de demonstração</strong>
              <div class="form-grid">
                <label class="campo"><span>Bandeira</span>
                  <select name="cartao_bandeira">
                    <option value="">Selecione</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="elo">Elo</option>
                    <option value="amex">American Express</option>
                    <option value="hipercard">Hipercard</option>
                    <option value="outro">Outra</option>
                  </select>
                </label>
                <label class="campo"><span>Últimos 4 dígitos (fictícios)</span><input name="cartao_ultimos4" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="1234"></label>
              </div>
              <small>Protótipo: não informe número completo, validade ou código de segurança. Nenhum dado real de cartão é processado.</small>
            </div>
            <div class="payment-box boleto-box" hidden>
              <strong>Boleto Bancário</strong>
              <p>O boleto será enviado para o e-mail cadastrado e vence em 3 dias úteis.</p>
            </div>
            <div class="payment-box transferencia-box" hidden>
              <strong>Transferência</strong>
              <p>Banco do Brasil • Agência 0001 • Conta 123456-7</p>
            </div>
          </div>

          <div class="form-acoes"><button class="btn" type="submit">Confirmar pagamento</button></div>
        </form>

        <aside class="resumo-pedido">
          <span class="eyebrow">resumo da compra</span>
          <div class="linha-resumo"><span>Itens</span><strong>${cesta.reduce((s, i) => s + i.qtd, 0)}</strong></div>
          <div class="linha-resumo total-final"><span>Total</span><strong>${brl(total)}</strong></div>
          <div class="pedido-itens">
            ${cesta.map(item => {
                const r = achar(item.id);
                return `<div class="pedido-item"><span>${esc(r ? r.titulo : 'Item')}</span><strong>${item.qtd}x</strong></div>`;
            }).join('')}
          </div>
        </aside>
      </div>
    </section>`;
  }
};

/* ---------- filtros ---------- */

function filtrarReceitas() {
  const busca = ($('#buscaReceita')?.value || '').trim().toLowerCase();
  const nivel = $('#filtroNivel')?.value || '';
  const tempo = Number($('#filtroTempo')?.value || 0);
  const restricao = $('#filtroRestricao')?.value || '';
  const cards = document.querySelectorAll('#gradeReceitas .card-receita');
  let encontrados = 0;
  cards.forEach((card, i) => {
    const r = receitas[i];
    const texto = `${r.titulo} ${r.ingredientes.join(' ')} ${r.descricao_introducao || ''}`.toLowerCase();
    const okBusca = !busca || texto.includes(busca);
    const okNivel = !nivel || r.nivel_dificuldade === nivel;
    const okTempo = !tempo || r.tempo_preparo_minutos <= tempo;
    const okRestricao = !restricao || (r.restricoes || []).includes(restricao);
    const mostrar = okBusca && okNivel && okTempo && okRestricao;
    card.hidden = !mostrar; if (mostrar) encontrados++;
  });
  const vazio = $('#semResultado'); if (vazio) vazio.hidden = encontrados !== 0;
}

/* ---------- perfil ---------- */

function prepararFoto(input) {
  const file = input.files?.[0]; if (!file || !file.type.startsWith('image/')) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = () => {
      const limite = 512, escala = Math.min(1, limite / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * escala)), h = Math.max(1, Math.round(img.height * escala));
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      perfilAtual.foto_perfil = canvas.toDataURL('image/jpeg', .82);
      const preview = document.querySelector('.avatar-editor-img');
      if (preview) {
        if (preview.tagName === 'IMG') preview.src = perfilAtual.foto_perfil;
        else { preview.outerHTML = `<img class="avatar avatar-editor-img" src="${esc(perfilAtual.foto_perfil)}" alt="Foto de perfil">`; }
      }
      const hero = document.querySelector('.perfil-hero-avatar');
      if (hero) hero.innerHTML = avatar(perfilAtual, 'avatar avatar-grande');
      atualizarAvatarMini();
      toast('Prévia da foto atualizada. Salve para confirmar.');
    }; img.src = leitor.result;
  }; leitor.readAsDataURL(file);
}

function removerFoto() {
  perfilAtual.foto_perfil = '';
  const input = $('#fotoPerfil'); if (input) input.value = '';
  const preview = document.querySelector('.avatar-editor-img');
  if (preview) {
    const iniciais = (perfilAtual.nome || 'Gastro Match').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();
    preview.outerHTML = `<div class="avatar avatar-editor-img avatar-iniciais">${esc(iniciais)}</div>`;
  }
  const hero = document.querySelector('.perfil-hero-avatar');
  if (hero) hero.innerHTML = avatar(perfilAtual, 'avatar avatar-grande');
  atualizarAvatarMini();
  toast('Foto removida. Clique em salvar para confirmar.');
}

function ativarModoChef() {
  perfilAtual = { ...perfilAtual, tipo_usuario: 'chef', status_validacao: perfilAtual.status_validacao || 'pendente', biografia: perfilAtual.biografia || 'Chef apaixonado por transformar receitas em experiências simples e saborosas.' };
  salvarPerfilLocal(perfilAtual);
  toast('Modo Chef ativado para a demonstração.');
  rota();
}

async function salvarPerfilNoBanco(perfil) {
  const resposta = await fetch('api.php?action=perfil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(perfil)
  });
  const payload = await resposta.json().catch(() => ({ success: false, message: 'Não foi possível salvar o perfil no banco.' }));
  if (!resposta.ok || !payload.success) {
    throw new Error(payload.message || 'Não foi possível salvar o perfil no banco.');
  }
  return payload.data;
}

async function salvarPerfil(event) {
  event.preventDefault(); const dados = new FormData(event.currentTarget);
  perfilAtual = { ...perfilAtual, id_usuario: Number(perfilAtual.id_usuario || 0), nome: String(dados.get('nome')||'').trim(), email: String(dados.get('email')||'').trim(), telefone: String(dados.get('telefone')||'').trim(), biografia: String(dados.get('biografia')||'').trim(), link_portfolio: String(dados.get('link_portfolio')||'').trim() };

  try {
    await salvarPerfilNoBanco(perfilAtual);
    salvarPerfilLocal(perfilAtual);
    atualizarAvatarMini();
    rota();
    toast('Perfil salvo com sucesso.');
  } catch (erro) {
    salvarPerfilLocal(perfilAtual);
    atualizarAvatarMini();
    rota();
    toast(erro.message || 'Perfil salvo localmente.');
  }
}

function atualizarAvatarMini() {
  const el = $('#avatarMini'); if (!el) return;
  if (perfilAtual.foto_perfil) { el.innerHTML = `<img src="${esc(perfilAtual.foto_perfil)}" alt="">`; el.classList.add('com-foto'); }
  else { const iniciais = (perfilAtual.nome || 'Gastro Match').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase(); el.textContent = iniciais; el.classList.remove('com-foto'); }
}

/* ---------- cadastro de receita ---------- */

function alternarPrecoConteudo() {
  const select = $('#tipoAcesso'), campo = $('#precoConteudo');
  if (!select || !campo) return;
  const pago = select.value === 'exclusivo_pago';
  campo.disabled = !pago; if (!pago) campo.value = '0';
}

function alternarKit() {
  const check = $('#oferecerKit'), box = $('#dadosKit');
  if (box) box.hidden = !check?.checked;
}

function prepararFotoReceita(input) {
  const file = input.files?.[0]; if (!file || !file.type.startsWith('image/')) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image(); img.onload = () => {
      const limite = 900, escala = Math.min(1, limite / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width*escala)), h = Math.max(1, Math.round(img.height*escala));
      const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
      window.receitaFotoTemporaria = canvas.toDataURL('image/jpeg', .84); const preview = $('#previewReceita');
      if (preview) preview.innerHTML = `<img src="${window.receitaFotoTemporaria}" alt="Prévia da receita">`;
    }; img.src = leitor.result;
  }; leitor.readAsDataURL(file);
}

function coletarFormularioReceita() {
  const form = $('#receitaForm'); if (!form) return null;
  const dados = new FormData(form);
  const restricoes = [...form.querySelectorAll('input[name="restricoes"]:checked')].map(x => x.value);
  const fotoAtual = window.receitaFotoTemporaria || (window.receitaRascunho?.img || '');
  return {
    titulo: String(dados.get('titulo')||'').trim(),
    descricao_introducao: String(dados.get('descricao_introducao')||'').trim(),
    rendimento: Number(dados.get('rendimento')||0),
    tempo_preparo_minutos: Number(dados.get('tempo_preparo_minutos')||0),
    nivel_dificuldade: String(dados.get('nivel_dificuldade')||'facil'),
    tipo_acesso: String(dados.get('tipo_acesso')||'gratuito'),
    preco_conteudo: Number(dados.get('preco_conteudo')||0),
    restricoes,
    ingredientes: String(dados.get('ingredientes')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean),
    preparo: String(dados.get('preparo')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean),
    url_video: String(dados.get('url_video')||'').trim(),
    duracao_segundos: Number(dados.get('duracao_segundos')||0),
    oferecer_kit: Boolean(dados.get('oferecer_kit')),
    preco_kit: Number(dados.get('preco_kit')||0),
    estoque_disponivel: Number(dados.get('estoque_disponivel')||0),
    img: fotoAtual || 'img/pastel.png'
  };
}

function salvarRascunho() {
  const dados = coletarFormularioReceita(); if (!dados) return;
  window.receitaRascunho = dados; window.receitaFotoTemporaria = dados.img;
  toast('Rascunho salvo nesta sessão.');
}

async function publicarReceitaNoBanco(dados) {
  const resposta = await fetch('api.php?action=cadastro_receita', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dados, id_criador: perfilAtual.id_usuario })
  });

  const payload = await resposta.json().catch(() => ({ success: false, message: 'Não foi possível salvar a receita no banco.' }));
  if (!resposta.ok || !payload.success) {
    throw new Error(payload.message || 'Não foi possível salvar a receita no banco.');
  }

  return payload.data;
}

async function publicarReceita(event) {
  event.preventDefault();
  const dados = coletarFormularioReceita();
  if (!dados || !dados.titulo || !dados.ingredientes.length || !dados.preparo.length) { toast('Preencha título, ingredientes e modo de preparo.'); return; }

  try {
    const retorno = await publicarReceitaNoBanco(dados);
    const nova = {
      id_receita: Number(retorno.id_receita || 0),
      ...dados,
      id_criador: perfilAtual.id_usuario,
      nota: 0,
      avaliacoes: '0',
      criado_pelo_chef: true,
      data_publicacao: new Date().toISOString()
    };
    receitas.push(nova);
    salvarReceitasCriadas();
    window.receitaRascunho = null;
    window.receitaFotoTemporaria = '';
    toast('Receita publicada com sucesso!');
    location.hash = '#chef';
    return;
  } catch (erro) {
    const novoId = Math.max(0, ...receitas.map(r => Number(r.id_receita)||0)) + 1;
    const nova = {
      id_receita: novoId,
      ...dados,
      id_criador: perfilAtual.id_usuario,
      nota: 0, avaliacoes: '0',
      criado_pelo_chef: true,
      data_publicacao: new Date().toISOString()
    };
    if (!nova.oferecer_kit) { nova.preco_kit = 0; nova.estoque_disponivel = 0; }
    receitas.push(nova); salvarReceitasCriadas(); window.receitaRascunho = null; window.receitaFotoTemporaria = '';
    toast(erro.message || 'Receita salva localmente.');
    location.hash = '#chef';
  }
}

/* ---------- receita ---------- */

function telaReceita(id) {
  const r = achar(id); if (!r) return emBreve('Receita não encontrada', 'Volte ao início e escolha outra receita.');
  const bandeira = r.pais ? `<img class="bandeira" src="https://flagcdn.com/w80/${esc(r.pais)}.png" alt="" loading="lazy">` : '';
  const kit = r.preco_kit > 0 ? `<aside class="kit"><div><span class="eyebrow">kit em destaque</span><b>Prepare em casa</b></div><span class="preco">${brl(r.preco_kit)}</span><button onclick="comprarKit(${r.id_receita})">Adicionar kit</button><small>Estoque disponível: ${r.estoque_disponivel}</small></aside>` : '';
  const video = r.url_video ? `<div class="bloco-receita video-box"><h3>Videoaula</h3><a href="${esc(r.url_video)}" target="_blank" rel="noopener">▶ Abrir videoaula</a>${r.duracao_segundos ? `<span> • ${Math.floor(r.duracao_segundos/60)}m ${r.duracao_segundos%60}s</span>` : ''}</div>` : '';
  return `<article class="receita"><div class="linha-receita"><a class="chef" href="#chef">← Voltar ao painel</a><a class="voltar" href="#feed" aria-label="Voltar">✕</a></div><div class="corpo-receita">${foto(r,'foto-receita')}<div class="receita-texto"><div class="receita-kicker">${esc(acessoLabel(r.tipo_acesso))} • Receita GastroMatch</div><h1 class="titulo">${esc(r.titulo)}${bandeira}</h1><p class="receita-intro">${esc(r.descricao_introducao || '')}</p><div class="info-receita"><span>${estrelas(r.nota)} <strong>${Number(r.nota || 0).toFixed(1)}</strong> (${esc(r.avaliacoes || '0')} avaliações)</span><span>•</span><span>${niveis[r.nivel_dificuldade]}</span><span>•</span><span>${r.tempo_preparo_minutos} min</span><span>•</span><span>${r.rendimento || '-'} porções</span></div><div class="restricoes-detalhe"><strong>Restrições:</strong>${tagsRestricoes(r)}</div><div class="bloco-receita"><h3>Ingredientes</h3><ul>${r.ingredientes.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div><div class="bloco-receita"><h3>Modo de preparo</h3><ol>${r.preparo.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></div>${video}</div></div>${kit}</article>`;
}

/* ---------- navegação de sessão: Entrar / Sair ---------- */
function atualizarBotaoSessao() {
  const link = document.getElementById('loginNav');
  if (!link) return;
  let auth = null;
  try { auth = JSON.parse(sessionStorage.getItem('gm_area_auth')); } catch (e) {}
  if (auth && auth.role) {
    const labels = { cliente: 'Cliente', chef: 'Chef', admin: 'Administrador' };
    link.textContent = 'Sair';
    link.href = '#sair';
    link.setAttribute('aria-label', 'Sair da conta');
    link.title = `Sessão: ${labels[auth.role] || auth.role}`;
  } else {
    link.textContent = 'Entrar';
    link.href = 'login.html';
    link.removeAttribute('title');
    link.setAttribute('aria-label', 'Entrar na plataforma');
  }
}

function sairDaConta(event) {
  if (event) event.preventDefault();
  sessionStorage.removeItem('gm_area_auth');
  try { localStorage.removeItem('gm_usuario'); } catch (e) {}
  try { localStorage.removeItem('gm_carrinho'); } catch (e) {}
  cesta = [];
  salvarCesta();
  perfilAtual = { ...perfilVisitante };
  atualizarAvatarMini();
  atualizarBotaoSessao();
  toast('Você saiu da sua conta.');
  window.location.hash = '#inicio';
  atualizarBotaoSessao();
}

document.getElementById('loginNav')?.addEventListener('click', function(event) {
  if (this.getAttribute('href') === '#sair') sairDaConta(event);
});
window.addEventListener('pageshow', atualizarBotaoSessao);

/* ---------- roteador ---------- */

function atualizarMetodoPagamento() {
  const selected = document.querySelector('input[name="metodo_pagamento"]:checked')?.value || 'pix';
  document.querySelectorAll('.payment-box').forEach(box => {
    const show = box.classList.contains(`${selected}-box`);
    box.hidden = !show;
    box.querySelectorAll('input, select').forEach(field => {
      field.disabled = !show;
      field.required = show && field.name.startsWith('cartao_');
    });
  });
}

function rota() {
  const [pag, id] = (location.hash.slice(1) || 'inicio').split('-');
  document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('ativo', a.dataset.p === pag));
  $('#app').innerHTML = pag === 'receita' ? telaReceita(id) : (telas[pag] || telas.inicio)();
  perfilAtual = carregarPerfil(); atualizarAvatarMini(); salvarCesta(); atualizarBotaoSessao();
  if (pag === 'novareceita') { alternarPrecoConteudo(); alternarKit(); }
  if (pag === 'pagamento') {
    setTimeout(() => {
      document.querySelectorAll('input[name="metodo_pagamento"]').forEach(input => {
        input.addEventListener('change', atualizarMetodoPagamento);
      });
      atualizarMetodoPagamento();
    }, 0);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', rota);
window.addEventListener('DOMContentLoaded', async () => {
  await atualizarPerfilDoBanco();
  await sincronizarReceitasDoBanco();
  perfilAtual = carregarPerfil();
  atualizarAvatarMini();
  rota();
});
atualizarAvatarMini(); salvarCesta(); atualizarBotaoSessao();

if (AUTOPLAY_MS && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => { const c = $('.carrossel'); if (c && !c.matches(':hover') && !c.contains(document.activeElement)) mover(1); }, AUTOPLAY_MS);
}
