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

/* ==========================================================
   MAPA — "Perto de você" e rastreio do pedido

   Usa MapLibre GL (biblioteca livre) + mapa do OpenStreetMap + rota do OSRM.
   Não precisa de chave, token nem cadastro.
   Observação: os servidores públicos do OpenStreetMap e do OSRM são gratuitos
   para uso leve (como esta demonstração). Para um site de verdade, o ideal é
   usar um provedor próprio ou contratado.
   ========================================================== */
const MAPA_TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ROTA_API_URL = 'https://router.project-osrm.org/route/v1/driving';
const MAPA_ESTILO = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [MAPA_TILES_URL],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

// Ponto central da demonstração (endereço de entrega do cliente).
// Para usar outra cidade, troque lat/lng (clique com o botão direito no Google Maps para copiar).
const CENTRO_DEMO = { nome: 'Centro de Maravilha (demonstração)', lat: -26.7606, lng: -53.1748 };

const RAIO_ENTREGA_PADRAO_KM = 2.5;
const CHAVE_RAIOS_RESTAURANTES = 'gm_raios_restaurantes_v1';
function carregarRaiosRestaurantes() {
  try { return JSON.parse(localStorage.getItem(CHAVE_RAIOS_RESTAURANTES) || '{}') || {}; }
  catch (_) { return {}; }
}
let raiosRestaurantes = carregarRaiosRestaurantes();
const PREPARO_SIMULACAO_MS = 3500;  // tempo "preparando no restaurante" antes de o entregador sair
const DURACAO_SIMULACAO_MS = 40000; // a viagem simulada dura 40 s na tela

// Restaurantes FICTÍCIOS, posicionados por distância (km) em relação ao centro.
// norte > 0 = ao norte, leste > 0 = a leste. Assim eles acompanham o CENTRO_DEMO.
// ESCALA_DISTANCIA_DEMO aproxima ou afasta todos de uma vez: 1 = cidade grande, 0.6 = cidade de porte médio.
const ESCALA_DISTANCIA_DEMO = 0.6;
const restaurantesProximos = [
  { nome: 'Cozinha do Bairro', norte: 0.33, leste: -0.40 },
  { nome: 'Casa da Massa', norte: -0.37, leste: -1.88 },
  { nome: 'Bairro Gourmet', norte: -1.76, leste: -1.03 },
  { nome: 'Sabor do Centro', norte: -3.24, leste: 0.71 },
  { nome: 'Chef da Rua', norte: -4.54, leste: 1.81 }
];

let mapaPerto = null;
let mapaRastreio = null;

function distanciaKmEntre(lat1, lng1, lat2, lng2) {
  const toRad = value => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function restaurantesDemo() {
  return restaurantesProximos.map(rest => {
    const lat = CENTRO_DEMO.lat + (rest.norte * ESCALA_DISTANCIA_DEMO) / 111.2;
    const lng = CENTRO_DEMO.lng + (rest.leste * ESCALA_DISTANCIA_DEMO) / (111.2 * Math.cos(CENTRO_DEMO.lat * Math.PI / 180));
    const distancia = distanciaKmEntre(CENTRO_DEMO.lat, CENTRO_DEMO.lng, lat, lng);
    const raio = Number(raiosRestaurantes[rest.nome]) || RAIO_ENTREGA_PADRAO_KM;
    return { nome: rest.nome, lat, lng, distancia, tempo: Math.round(8 + distancia * 3.5), raio, disponivel: distancia <= raio };
  }).sort((a, b) => a.distancia - b.distancia);
}

// Restaurante que "atende" o pedido na simulação: o mais distante dentro do raio padrão (rota mais visível).
function restauranteDoPedido() {
  const lista = restaurantesDemo();
  const dentro = lista.filter(r => r.distancia <= RAIO_ENTREGA_PADRAO_KM);
  return (dentro.length ? dentro : lista).slice(-1)[0];
}

function restauranteDaReceita(idReceita) {
  const receita = receitas?.find(item => Number(item.id_receita) === Number(idReceita));
  const indicePorReceita = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  const nomeRestaurante = receita?.restaurante_demo || restaurantesProximos[indicePorReceita[Number(idReceita)]]?.nome;
  const definido = restaurantesProximos.find(rest => rest.nome === nomeRestaurante);
  if (!definido) return null;
  const lat = CENTRO_DEMO.lat + (definido.norte * ESCALA_DISTANCIA_DEMO) / 111.2;
  const lng = CENTRO_DEMO.lng + (definido.leste * ESCALA_DISTANCIA_DEMO) / (111.2 * Math.cos(CENTRO_DEMO.lat * Math.PI / 180));
  const distancia = distanciaKmEntre(CENTRO_DEMO.lat, CENTRO_DEMO.lng, lat, lng);
  const raio = Number(raiosRestaurantes[definido.nome]) || RAIO_ENTREGA_PADRAO_KM;
  return { nome: definido.nome, lat, lng, distancia, raio, disponivel: distancia <= raio };
}

function montarListaRestaurantesPerto() {
  const dentro = restaurantesDemo();
  if (!dentro.length) return '<div class="sem-restaurantes">Nenhum restaurante cadastrado.</div>';
  return dentro.map((rest, index) => `
      <div class="restaurante-card${!rest.disponivel ? ' indisponivel' : ''}" data-nome="${esc(rest.nome)}">
        <div>
          <span class="eyebrow">restaurante</span>
          <h3>${esc(rest.nome)}</h3>
          <small class="restaurante-status">${rest.disponivel ? 'Atende este endereço' : 'Fora do raio • receitas indisponíveis'}</small>
          <label class="raio-restaurante" for="raioRestaurante${index}"><span>Raio próprio</span><strong>${String(rest.raio).replace('.', ',')} km</strong></label>
          <input id="raioRestaurante${index}" class="raio-restaurante-slider" type="range" min="0.5" max="5" step="0.5" value="${rest.raio}" oninput="atualizarRaioRestaurante('${esc(rest.nome)}', this.value)">
        </div>
        <div class="restaurante-meta">
          <span>${rest.tempo} min</span>
          <strong>${rest.distancia.toFixed(1)} km</strong>
        </div>
      </div>
    `).join('');
}

function circuloGeoJSON(lat, lng, raioKm, passos = 72) {
  const coords = [];
  for (let i = 0; i <= passos; i++) {
    const ang = (i / passos) * 2 * Math.PI;
    const dLat = (raioKm * Math.cos(ang)) / 111.2;
    const dLng = (raioKm * Math.sin(ang)) / (111.2 * Math.cos(lat * Math.PI / 180));
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

function estadoMapa() {
  return window.maplibregl ? 'ok' : 'sem-biblioteca';
}

function mostrarMapaIndisponivel(mapEl, titulo) {
  mapEl.innerHTML = `<div class="mapa-vazio"><div><strong>${titulo}</strong><p>Não foi possível carregar o mapa. Confira a conexão com a internet e o script do MapLibre no index.html.</p></div></div>`;
}

function limparMapas() {
  [mapaPerto, mapaRastreio].forEach(estado => {
    if (!estado) return;
    if (estado.raf) cancelAnimationFrame(estado.raf);
    try { if (estado.map) estado.map.remove(); } catch (e) { /* mapa já removido */ }
  });
  mapaPerto = null;
  mapaRastreio = null;
}

function criarMarcador(classe, emoji, titulo) {
  const el = document.createElement('div');
  el.className = `marcador ${classe}`;
  el.textContent = emoji;
  el.title = titulo;
  return el;
}

/* ---------- Perto de você ---------- */
function inicializarMapaPerto() {
  const mapEl = document.getElementById('mapa-perto');
  if (!mapEl) return;
  limparMapas();
  if (estadoMapa() !== 'ok') { mostrarMapaIndisponivel(mapEl, 'Mapa de restaurantes'); return; }

  try {
    const map = new window.maplibregl.Map({
      container: mapEl,
      style: MAPA_ESTILO,
      center: [CENTRO_DEMO.lng, CENTRO_DEMO.lat],
      zoom: 13
    });
    map.addControl(new window.maplibregl.NavigationControl(), 'top-right');

    new window.maplibregl.Marker({ color: '#f28a18' })
      .setLngLat([CENTRO_DEMO.lng, CENTRO_DEMO.lat])
      .setPopup(new window.maplibregl.Popup().setHTML(`<strong>Você</strong><br>${esc(CENTRO_DEMO.nome)}`))
      .addTo(map);

    const estado = { map, pronto: false, marcadores: [], fontesRaio: [] };

    restaurantesDemo().forEach(rest => {
      const el = criarMarcador('marcador-rest', '🍽️', rest.nome);
      el.classList.toggle('fora', !rest.disponivel);
      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([rest.lng, rest.lat])
        .setPopup(new window.maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${esc(rest.nome)}</strong><br>${rest.distancia.toFixed(1)} km • ${rest.tempo} min<br><small>Restaurante fictício (demonstração)</small>`))
        .addTo(map);
      estado.marcadores.push({ el, rest });
    });

    map.on('load', () => {
      restaurantesDemo().forEach((rest, index) => {
        const sourceId = `raio-restaurante-${index}`;
        map.addSource(sourceId, { type: 'geojson', data: circuloGeoJSON(rest.lat, rest.lng, rest.raio) });
        map.addLayer({ id: `${sourceId}-fill`, type: 'fill', source: sourceId, layout: { visibility: 'none' }, paint: { 'fill-color': index % 2 ? '#f28a18' : '#266a46', 'fill-opacity': 0.07 } });
        map.addLayer({ id: `${sourceId}-line`, type: 'line', source: sourceId, layout: { visibility: 'none' }, paint: { 'line-color': index % 2 ? '#f28a18' : '#266a46', 'line-width': 1.5, 'line-dasharray': [2, 2] } });
        const item = estado.marcadores.findIndex(marker => marker.rest.nome === rest.nome);
        estado.marcadores[item]?.el.addEventListener('click', () => {
          restaurantesDemo().forEach((_, i) => {
            const visible = i === index ? 'visible' : 'none';
            map.setLayoutProperty(`raio-restaurante-${i}-fill`, 'visibility', visible);
            map.setLayoutProperty(`raio-restaurante-${i}-line`, 'visibility', visible);
          });
        });
        estado.fontesRaio.push({ sourceId, rest });
      });
      estado.pronto = true;
      atualizarRaioTodosRestaurantes();
    });

    mapaPerto = estado;
    atualizarRaioTodosRestaurantes();
  } catch (error) {
    console.warn('O mapa não inicializou nesta página:', error);
    mapEl.innerHTML = '<div class="mapa-vazio"><div><strong>Mapa de restaurantes</strong><p>Não foi possível iniciar o mapa. Veja o console do navegador (F12).</p></div></div>';
  }
}

function atualizarRaioRestaurante(nome, valor) {
  const raio = Number(valor) || RAIO_ENTREGA_PADRAO_KM;
  raiosRestaurantes[nome] = raio;
  try { localStorage.setItem(CHAVE_RAIOS_RESTAURANTES, JSON.stringify(raiosRestaurantes)); } catch (_) {}
  atualizarRaioTodosRestaurantes();
}

function atualizarRaioTodosRestaurantes() {
  const lista = document.getElementById('listaRestaurantes');
  if (lista) {
    const atualizados = new Map(restaurantesDemo().map(rest => [rest.nome, rest]));
    lista.querySelectorAll('.restaurante-card').forEach(card => {
      const rest = atualizados.get(card.dataset.nome);
      if (!rest) return;
      card.classList.toggle('indisponivel', !rest.disponivel);
      const status = card.querySelector('.restaurante-status');
      const valor = card.querySelector('.raio-restaurante strong');
      if (status) status.textContent = rest.disponivel ? 'Atende este endereço' : 'Fora do raio • receitas indisponíveis';
      if (valor) valor.textContent = `${String(rest.raio).replace('.', ',')} km`;
    });
  }
  const receitasPerto = document.getElementById('receitasPerto');
  if (receitasPerto) receitasPerto.innerHTML = receitas.map(r => cardReceita(r, true, true)).join('');
  if (!mapaPerto) return;

  const porNome = new Map(restaurantesDemo().map(rest => [rest.nome, rest]));
  mapaPerto.marcadores.forEach(({ el, rest }) => {
    const atual = porNome.get(rest.nome) || rest;
    el.classList.toggle('fora', !atual.disponivel);
    const index = mapaPerto.marcadores.findIndex(item => item.rest.nome === rest.nome);
    const sourceId = `raio-restaurante-${index}`;
    mapaPerto.map.getSource(sourceId)?.setData(circuloGeoJSON(atual.lat, atual.lng, atual.raio));
  });
  if (!mapaPerto.pronto) return;
}

/* ---------- Rastreio do pedido (rota simulada) ---------- */
async function buscarRota(origem, destino) {
  const linhaReta = {
    coords: [origem, destino],
    minutos: Math.max(1, Math.round(8 + distanciaKmEntre(origem[1], origem[0], destino[1], destino[0]) * 3.5)),
    real: false
  };
  try {
    const url = `${ROTA_API_URL}/${origem[0]},${origem[1]};${destino[0]},${destino[1]}?overview=full&geometries=geojson`;
    const resposta = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resposta.ok) throw new Error(`Rota: HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const rota = dados.routes && dados.routes[0];
    if (dados.code !== 'Ok' || !rota || !rota.geometry || rota.geometry.coordinates.length < 2) throw new Error('Rota vazia');
    return { coords: rota.geometry.coordinates, minutos: Math.max(1, Math.round(rota.duration / 60)), real: true };
  } catch (error) {
    console.warn('Rota real indisponível, usando linha reta:', error);
    return linhaReta;
  }
}

function prepararTrajeto(coords) {
  const acum = [0];
  for (let i = 1; i < coords.length; i++) {
    acum.push(acum[i - 1] + distanciaKmEntre(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]));
  }
  return { coords, acum, total: acum[acum.length - 1] || 1 };
}

function pontoNoTrajeto(trajeto, progresso) {
  const alvo = trajeto.total * progresso;
  let i = 1;
  while (i < trajeto.acum.length - 1 && trajeto.acum[i] < alvo) i++;
  const seg = (trajeto.acum[i] - trajeto.acum[i - 1]) || 1;
  const f = Math.min(1, Math.max(0, (alvo - trajeto.acum[i - 1]) / seg));
  const a = trajeto.coords[i - 1];
  const b = trajeto.coords[i];
  return { ponto: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], indice: i };
}

/* ---------- Tela "Rastrear pedido" ---------- */
const ICONE_MOTO_SVG = '<svg viewBox="-1 1 48 42" width="30" height="27" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<circle cx="9" cy="35" r="5" fill="none" stroke-width="3"/><circle cx="38" cy="35" r="5" fill="none" stroke-width="3"/>'
  + '<path d="M9 35H17C18 30 21 28 25 28H33L38 35" fill="none" stroke-width="3"/><path d="M33 28L31 14H38" fill="none" stroke-width="3.4"/>'
  + '<rect x="1" y="12" width="15" height="12" rx="3" stroke="none"/><path d="M17 29H30L29 24H17Z" stroke="none"/>'
  + '<circle cx="24" cy="7" r="4.4" stroke="none"/><path d="M24 13L22 25" fill="none" stroke-width="4.2"/><path d="M25 16L32 14.5" fill="none" stroke-width="3"/></svg>';

const PASSOS_RASTREIO = [
  { titulo: 'Pedido confirmado', detalhe: 'O restaurante recebeu o seu pedido' },
  { titulo: 'Preparando no restaurante', detalhe: 'Separando e embalando tudo' },
  { titulo: 'Saiu para entrega', detalhe: 'O entregador retirou o pedido' },
  { titulo: 'A caminho', detalhe: 'Acompanhe o trajeto no mapa' },
  { titulo: 'Entregue', detalhe: 'Bom apetite!' }
];

function classePassoRastreio(i, atual) {
  const ultimo = PASSOS_RASTREIO.length - 1;
  if (i < atual || (atual === ultimo && i === ultimo)) return 'feito';
  return i === atual ? 'atual' : '';
}

function montarPassosRastreio(atual) {
  return PASSOS_RASTREIO.map((passo, i) => `
      <li class="rt-passo ${classePassoRastreio(i, atual)}">
        <span class="rt-bolinha">✓</span>
        <div><strong>${passo.titulo}</strong><small>${passo.detalhe}</small></div>
      </li>`).join('');
}

function atualizarPassosRastreio(atual) {
  document.querySelectorAll('#rtPassos .rt-passo').forEach((li, i) => {
    li.className = `rt-passo ${classePassoRastreio(i, atual)}`.trim();
  });
}

function definirTexto(id, valor) {
  const el = document.getElementById(id);
  if (el && el.textContent !== valor) el.textContent = valor;
}

function formatarKm(km) {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function reiniciarPainelRastreio() {
  const entregue = document.getElementById('rtEntregue');
  if (entregue) entregue.hidden = true;
  const barra = document.getElementById('rtBarra');
  if (barra) barra.style.width = '0%';
  definirTexto('statusRastreio', 'Preparando pedido');
  definirTexto('rtEtaTitulo', 'Chegada em');
  definirTexto('rtHora', 'Calculando a rota...');
  definirTexto('rtDistancia', '—');
  atualizarPassosRastreio(1);
}

function criarMarcadorMoto() {
  const raiz = document.createElement('div');
  raiz.className = 'rt-marker-moto';
  raiz.title = 'Entregador';
  const icone = document.createElement('div');
  icone.className = 'rt-moto-icone';
  icone.innerHTML = ICONE_MOTO_SVG;
  raiz.appendChild(icone);
  return { raiz, icone };
}

/* Pedido carregado do banco (null = ainda carregando). Em modo demonstração, demo = true e nada é salvo. */
let pedidoRastreio = null;

const STATUS_POR_ETAPA = { 1: 'preparando', 2: 'enviado', 4: 'entregue' };

function atualizarBotoesRastreio() {
  const repetir = document.getElementById('rtBtnRepetir');
  const pagar = document.getElementById('rtPagarPix');
  const aguardando = !!(pedidoRastreio && pedidoRastreio.statusPedido === 'pendente');
  if (repetir) {
    repetir.textContent = pedidoRastreio && pedidoRastreio.entregue ? '↻ Resimular entrega' : '↻ Reiniciar simulação';
    repetir.hidden = aguardando;
  }
  if (pagar) {
    const link = aguardando && pedidoRastreio.linkPagamento ? pedidoRastreio.linkPagamento : '';
    pagar.hidden = !link;
    if (link) pagar.href = link;
  }
}

async function carregarPedidoRastreio() {
  try {
    const resposta = await fetch('api.php?action=pedido_rastreio', { credentials: 'same-origin', cache: 'no-store' });
    const payload = await resposta.json().catch(() => null);
    if (resposta.ok && payload && payload.success && payload.data) {
      const dados = payload.data;
      return {
        demo: false,
        id: Number(dados.id_pedido),
        valor: Number(dados.valor_total || 0),
        metodo: dados.metodo_pagamento || '',
        statusPedido: dados.status_pedido,
        entregue: !!dados.entregue,
        persistir: dados.status_pedido === 'confirmado' && !dados.entregue,
        linkPagamento: dados.link_pagamento || '',
        id_receita: Number(dados.id_receita || 0)
      };
    }
    return null;
  } catch (erro) {
    console.warn('Não foi possível carregar o pedido para o rastreio:', erro);
    return null;
  }
}

function aplicarPedidoNaTela(info) {
  const numero = document.getElementById('rtPedidoNumero');
  if (numero) numero.innerHTML = `#${Number(info.id)}${info.demo ? '<small>demonstração</small>' : ''}`;
  definirTexto('rtValor', brl(info.valor));
  definirTexto('rtPagamento', info.metodo === 'pix' ? 'Pix (simulado)' : info.metodo === 'dinheiro' ? 'Dinheiro na entrega' : '—');
  const restaurante = restauranteDaReceita(info.id_receita);
  if (restaurante) {
    definirTexto('rtRestauranteTopo', restaurante.nome);
    definirTexto('rtRestauranteResumo', restaurante.nome);
  }
  const aviso = document.getElementById('rtAviso');
  if (aviso) {
    if (!info.demo) aviso.textContent = 'Simulação demonstrativa: não há entregador real nem GPS. O andamento da entrega fica salvo no seu pedido.';
    else if (info.motivo === 'sem-login') aviso.textContent = 'Simulação demonstrativa. Entre na sua conta para acompanhar e salvar o andamento dos seus pedidos.';
    else aviso.textContent = 'Simulação demonstrativa com um pedido de exemplo. Não há entregador real nem GPS.';
  }
}

async function salvarEtapaEntrega(idPedido, etapa) {
  const status = STATUS_POR_ETAPA[etapa];
  if (!status || !idPedido) return;
  try {
    const resposta = await fetch('api.php?action=pedido_entrega', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_pedido: idPedido, status_entrega: status })
    });
    const payload = await resposta.json();
    if (!resposta.ok || !payload.success) throw new Error(payload.message || 'Não foi possível salvar o andamento.');
    if (payload.data && payload.data.entregue && pedidoRastreio && pedidoRastreio.id === idPedido) {
      pedidoRastreio.entregue = true;
      pedidoRastreio.persistir = false;
      atualizarBotoesRastreio();
    }
  } catch (erro) {
    console.warn('Não foi possível salvar o andamento da entrega:', erro);
  }
}

/* Ao abrir a tela: lê o pedido no banco e decide se simula, mostra "já entregue" ou "aguardando pagamento". */
async function abrirTelaRastreio() {
  const info = await carregarPedidoRastreio();
  const aindaNaTela = document.getElementById('mapa-rastreio') && location.hash.slice(1).split('-')[0] === 'rastreio';
  if (!aindaNaTela) return;
  pedidoRastreio = info;
  if (!info) {
    const numero = document.getElementById('rtPedidoNumero');
    if (numero) numero.textContent = 'Sem pedidos';
    definirTexto('statusRastreio', 'Nenhuma entrega para acompanhar');
    definirTexto('rtValor', '—');
    definirTexto('rtPagamento', '—');
    definirTexto('rtEtaTitulo', 'Sem entrega ativa');
    definirTexto('etaRastreio', '—');
    definirTexto('rtHora', 'Faça um pedido para acompanhar a entrega.');
    definirTexto('rtAviso', 'Você ainda não possui entregas para acompanhar.');
    const mapa = document.getElementById('mapa-rastreio');
    if (mapa) mapa.innerHTML = '<div class="mapa-vazio"><div><strong>Nenhuma entrega</strong><p>Seus pedidos aparecerão aqui quando houver um pedido válido.</p></div></div>';
    const moto = document.querySelector('.marcador-moto');
    if (moto) moto.remove();
    const entregador = document.querySelector('.rt-entregador');
    if (entregador) entregador.hidden = true;
    const legenda = document.querySelector('.rt-legenda');
    if (legenda) legenda.hidden = true;
    const resumoRestaurante = document.getElementById('rtRestauranteResumo')?.closest('.rt-linha');
    if (resumoRestaurante) resumoRestaurante.hidden = true;
    const passos = document.getElementById('rtPassos');
    if (passos) passos.innerHTML = '<li class="rt-passo">Nenhum pedido registrado.</li>';
    const barra = document.getElementById('rtBarra');
    if (barra) barra.style.width = '0%';
    atualizarBotoesRastreio();
    const repetir = document.getElementById('rtBtnRepetir');
    if (repetir) repetir.hidden = true;
    return;
  }
  aplicarPedidoNaTela(info);
  inicializarRastreio();
}

/* Botão "Resimular entrega": só repete a animação, não altera o pedido salvo no banco. */
function resimularRastreio() {
  inicializarRastreio(true);
}

function inicializarRastreio(forcarSimulacao = false) {
  const mapEl = document.getElementById('mapa-rastreio');
  if (!mapEl) return;
  limparMapas();
  reiniciarPainelRastreio();

  if (!pedidoRastreio) return;
  const pedido = pedidoRastreio;
  let modo = 'simular';
  if (pedido.statusPedido === 'pendente') modo = 'espera';
  else if (pedido.entregue && !forcarSimulacao) modo = 'concluido';
  const opcoes = { modo, persistir: modo === 'simular' && !!pedido.persistir, idPedido: pedido.id };
  atualizarBotoesRastreio();

  const restaurante = pedidoRastreio.restaurante || restauranteDaReceita(pedidoRastreio.id_receita) || restauranteDoPedido();
  const origem = [restaurante.lng, restaurante.lat];
  const destino = [CENTRO_DEMO.lng, CENTRO_DEMO.lat];
  const estado = { map: null, raf: 0, passo: -1 };
  mapaRastreio = estado;
  const rotaPromise = buscarRota(origem, destino);

  if (estadoMapa() === 'ok') {
    mapEl.innerHTML = '';
    try {
      const map = new window.maplibregl.Map({ container: mapEl, style: MAPA_ESTILO, center: origem, zoom: 13 });
      map.addControl(new window.maplibregl.NavigationControl(), 'top-right');
      estado.map = map;
    } catch (error) {
      console.warn('O mapa do rastreio não inicializou:', error);
      mostrarMapaIndisponivel(mapEl, 'Mapa do pedido');
    }
  } else {
    mostrarMapaIndisponivel(mapEl, 'Mapa do pedido');
  }

  const mapaPronto = estado.map
    ? Promise.race([new Promise(resolve => estado.map.on('load', resolve)), new Promise(resolve => setTimeout(resolve, 8000))])
    : Promise.resolve();

  Promise.all([rotaPromise, mapaPronto]).then(([rota]) => {
    if (mapaRastreio !== estado) return; // o usuário saiu da página enquanto carregava
    iniciarSimulacaoRastreio(estado, rota, origem, destino, restaurante, opcoes);
  });
}

function iniciarSimulacaoRastreio(estado, rota, origem, destino, restaurante, opcoes) {
  const trajeto = prepararTrajeto(rota.coords);
  const map = estado.map && estado.map.isStyleLoaded() ? estado.map : null;
  let entregador = null;
  let iconeMoto = null;

  if (map) {
    try {
      new window.maplibregl.Marker({ element: criarMarcador('marcador-rest', '🍽️', restaurante.nome) }).setLngLat(origem).addTo(map);
      new window.maplibregl.Marker({ element: criarMarcador('marcador-casa pulsa', '🏠', 'Local de entrega') }).setLngLat(destino).addTo(map);

      const linha = coords => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
      const layout = { 'line-join': 'round', 'line-cap': 'round' };
      map.addSource('rota-pedido', { type: 'geojson', data: linha(rota.coords) });
      map.addLayer({ id: 'rota-contorno', type: 'line', source: 'rota-pedido', layout, paint: { 'line-color': '#ffffff', 'line-width': 11 } });
      map.addLayer({ id: 'rota-pedido', type: 'line', source: 'rota-pedido', layout, paint: { 'line-color': '#bcd3ee', 'line-width': 7 } });
      map.addSource('rota-percorrida', { type: 'geojson', data: linha([rota.coords[0], rota.coords[0]]) });
      map.addLayer({ id: 'rota-percorrida', type: 'line', source: 'rota-percorrida', layout, paint: { 'line-color': '#2b6cb0', 'line-width': 7 } });

      const bounds = new window.maplibregl.LngLatBounds();
      rota.coords.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 80, right: 80 }, duration: 0 });

      const moto = criarMarcadorMoto();
      iconeMoto = moto.icone;
      entregador = new window.maplibregl.Marker({ element: moto.raiz }).setLngLat(rota.coords[0]).addTo(map);
    } catch (error) {
      console.warn('Não foi possível desenhar a rota no mapa:', error);
    }
  }

  definirTexto('etaRastreio', `${rota.minutos} min`);
  definirTexto('rtDistancia', `${formatarKm(trajeto.total)} restantes`);

  // Pedido Pix ainda não pago: mostra a rota parada e orienta a concluir o pagamento.
  if (opcoes.modo === 'espera') {
    definirTexto('statusRastreio', 'Aguardando pagamento');
    definirTexto('rtHora', 'Confirme o Pix para liberar a entrega');
    estado.passo = 0;
    atualizarPassosRastreio(0);
    return;
  }

  const chegada = new Date(Date.now() + rota.minutos * 60000);
  definirTexto('rtHora', `Chegada prevista às ${chegada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);

  let ultimoLng = rota.coords[0][0];

  const desenharFrame = (p, preparando) => {
    const { ponto, indice } = pontoNoTrajeto(trajeto, p);

    if (entregador) {
      entregador.setLngLat(ponto);
      if (Math.abs(ponto[0] - ultimoLng) > 1e-7) {
        iconeMoto.classList.toggle('virado', ponto[0] < ultimoLng); // vira a moto quando ela segue para o oeste
        ultimoLng = ponto[0];
      }
      const percorrida = map.getSource('rota-percorrida');
      if (percorrida) percorrida.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trajeto.coords.slice(0, indice).concat([ponto]) } });
    }

    let status, etapa;
    if (preparando) { status = 'Preparando pedido'; etapa = 1; }
    else if (p >= 1) { status = 'Entregue'; etapa = 4; }
    else if (p < 0.06) { status = 'Saiu para entrega'; etapa = 2; }
    else if (p >= 0.85) { status = 'Chegando ao destino'; etapa = 3; }
    else { status = 'Em rota de entrega'; etapa = 3; }

    definirTexto('statusRastreio', status);
    if (estado.passo !== etapa) {
      estado.passo = etapa;
      atualizarPassosRastreio(etapa);
      if (opcoes.persistir) salvarEtapaEntrega(opcoes.idPedido, etapa);
    }
    const barra = document.getElementById('rtBarra');
    if (barra) barra.style.width = `${(p * 100).toFixed(1)}%`;
    definirTexto('rtEtaTitulo', p >= 1 ? 'Pedido' : 'Chegada em');
    definirTexto('etaRastreio', p >= 1 ? 'Entregue' : `${Math.max(1, Math.ceil(rota.minutos * (1 - p)))} min`);
    definirTexto('rtDistancia', p >= 1 ? 'Chegou ao destino' : `${formatarKm(trajeto.total * (1 - p))} restantes`);

    if (p >= 1) {
      definirTexto('rtHora', 'Entrega concluída');
      definirTexto('rtEntregueDetalhe', opcoes.modo === 'concluido'
        ? 'Este pedido já foi entregue. Use "Resimular entrega" para ver de novo.'
        : 'Bom apetite. Que tal ver mais receitas?');
      const entregue = document.getElementById('rtEntregue');
      if (entregue) entregue.hidden = false;
    }
  };

  // Pedido já entregue: abre direto no estado final, sem reiniciar a animação.
  if (opcoes.modo === 'concluido') {
    desenharFrame(1, false);
    return;
  }

  const inicio = performance.now();
  const passo = agora => {
    if (mapaRastreio !== estado) return;
    const t = agora - inicio;
    const preparando = t < PREPARO_SIMULACAO_MS;
    const p = preparando ? 0 : Math.min(1, (t - PREPARO_SIMULACAO_MS) / DURACAO_SIMULACAO_MS);
    desenharFrame(p, preparando);
    if (p < 1) estado.raf = requestAnimationFrame(passo);
  };
  estado.raf = requestAnimationFrame(passo);
}

function inicializarMapasTela() {
  const pagina = (location.hash.slice(1) || 'inicio').split('-')[0];
  if (pagina === 'perto') inicializarMapaPerto();
  if (pagina === 'rastreio') abrirTelaRastreio();
}

const receitasBase = [
  {
    id_receita: 2, titulo: 'Poutine', pais: 'ca', img: 'img/poutine.png',
    nota: 0, avaliacoes: '0', nivel_dificuldade: 'facil', tempo_preparo_minutos: 20,
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
    nota: 0, avaliacoes: '0', nivel_dificuldade: 'facil', tempo_preparo_minutos: 20,
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
    nota: 0, avaliacoes: '0', nivel_dificuldade: 'medio', tempo_preparo_minutos: 45,
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
    nota: 0, avaliacoes: '0', nivel_dificuldade: 'facil', tempo_preparo_minutos: 25,
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
    nota: 0, avaliacoes: '0', nivel_dificuldade: 'medio', tempo_preparo_minutos: 30,
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
  { id: 'sem-lactose', label: 'Sem lactose' },
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'sem-ovos', label: 'Sem ovos' },
  { id: 'sem-amendoim', label: 'Sem amendoim' },
  { id: 'sem-frutos-do-mar', label: 'Sem frutos do mar' },
  { id: 'baixo-sodio', label: 'Baixo sódio' }
];

const alergenosDisponiveis = [
  { id: 'crustaceos', label: 'Crustáceos (camarão, caranguejo)' },
  { id: 'ovos', label: 'Ovos' },
  { id: 'trigo', label: 'Trigo / glúten' },
  { id: 'leite', label: 'Leite e derivados' },
  { id: 'amendoim', label: 'Amendoim' },
  { id: 'soja', label: 'Soja' },
  { id: 'peixes', label: 'Peixes' },
  { id: 'castanhas', label: 'Castanhas e nozes' }
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
      cnpj: usuario.cnpj || '',
      data_cadastro: usuario.data_cadastro || new Date().toISOString().slice(0, 10),
      foto_perfil: usuario.foto_perfil || '',
      biografia: usuario.biografia || '',
      link_portfolio: usuario.link_portfolio || '',
      status_validacao: usuario.status_validacao || 'pendente',
      verificacao_empresa: usuario.verificacao_empresa || '',
      verificacao_relato: usuario.verificacao_relato || '',
      verificacao_link: usuario.verificacao_link || '',
      verificacao_parecer: usuario.verificacao_parecer || ''
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
const receitasLiberadas = new Set();
const acessosReceitasVerificados = new Set();
const chaveAcessoReceita = id => `${Number(carregarPerfil().id_usuario || 0)}:${Number(id)}`;

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
    alergenos: Array.isArray(receita.alergenos) ? receita.alergenos : parseArray(receita.alergenos),
    ingredientes: parseArray(receita.ingredientes),
    preparo: parseArray(receita.preparo),
    criado_pelo_chef: Boolean(receita.criado_pelo_chef ?? true),
    img: receita.img || 'img/pastel.png',
    tipo_acesso: receita.tipo_acesso || 'gratuito',
    restaurante_demo: receita.restaurante_demo || ''
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
  if (remotas !== null) {
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
  if (!lista.length) return '';
  return lista.map(x => `<span class="tag-restricao">${esc(restricaoLabel(x))}</span>`).join('');
}

function avisoAlergenos(r) {
  const ids = r.alergenos || [];
  if (!ids.length) return '<div class="aviso-alergenos"><strong>Alergênicos:</strong> não informados</div>';
  const labels = ids.map(id => alergenosDisponiveis.find(a => a.id === id)?.label || id);
  return `<div class="aviso-alergenos"><strong>Contém:</strong> ${labels.map(esc).join(', ')}. <small>Confira os ingredientes e possíveis contaminações cruzadas.</small></div>`;
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

const BAIRROS_MARAVILHA = [
  'Centro', 'Floresta', 'Novo Bairro', 'União', 'São José', 'Bela Vista',
  'Padre Antônio', 'Kasper', 'Madalozzo', 'Jardim', 'Frei Damião',
  'Progresso', 'Morada do Sol', 'José de Anchieta', 'Civemara'
];
const ESTADOS_BR = [
  ['AC','Acre','🇧🇷'],['AL','Alagoas','🇧🇷'],['AP','Amapá','🇧🇷'],['AM','Amazonas','🇧🇷'],['BA','Bahia','🇧🇷'],['CE','Ceará','🇧🇷'],['DF','Distrito Federal','🇧🇷'],['ES','Espírito Santo','🇧🇷'],['GO','Goiás','🇧🇷'],['MA','Maranhão','🇧🇷'],['MT','Mato Grosso','🇧🇷'],['MS','Mato Grosso do Sul','🇧🇷'],['MG','Minas Gerais','🇧🇷'],['PA','Pará','🇧🇷'],['PB','Paraíba','🇧🇷'],['PR','Paraná','🇧🇷'],['PE','Pernambuco','🇧🇷'],['PI','Piauí','🇧🇷'],['RJ','Rio de Janeiro','🇧🇷'],['RN','Rio Grande do Norte','🇧🇷'],['RS','Rio Grande do Sul','🇧🇷'],['RO','Rondônia','🇧🇷'],['RR','Roraima','🇧🇷'],['SC','Santa Catarina','🇧🇷'],['SP','São Paulo','🇧🇷'],['SE','Sergipe','🇧🇷'],['TO','Tocantins','🇧🇷']
];

function montarSelectEndereco(campo, rotulo, opcoes, valorAtual = '') {
  if (campo === 'estado') {
    const selecionado = String(valorAtual || '').toUpperCase();
    return `<label class="campo"><span>${rotulo}</span><select name="endereco_estado" data-endereco-select="estado" required><option value="">Selecione o estado</option>${ESTADOS_BR.map(([uf,nome,flag])=>`<option value="${uf}" ${selecionado===uf?'selected':''}>${flag} ${nome} (${uf})</option>`).join('')}</select><input name="endereco_estado_manual" data-endereco-manual="estado" type="text" maxlength="2" placeholder="UF" hidden></label>`;
  }
  const lista = [...new Set((opcoes || []).filter(Boolean))];
  const options = lista.map(valor => `<option value="${esc(valor)}" ${valorAtual.toLowerCase() === valor.toLowerCase() ? 'selected' : ''}>${esc(valor)}</option>`).join('');
  const maxLength = campo === 'logradouro' ? 150 : (campo === 'estado' ? 2 : 100);
  return `<label class="campo"><span>${rotulo}</span><button type="button" class="endereco-manual-btn" data-endereco-manual-btn="${campo}">Colocar manualmente</button><select name="endereco_${campo}" data-endereco-select="${campo}" required><option value="">Selecione uma opção</option><option value="__manual__">Colocar manualmente</option>${options}</select><input name="endereco_${campo}_manual" data-endereco-manual="${campo}" type="text" maxlength="${maxLength}" placeholder="Digite ${rotulo.toLowerCase()}" hidden></label>`;
}

function valorEndereco(form, campo) {
  const select = form.querySelector(`[data-endereco-select="${campo}"]`);
  if (!select) return '';
  if (select.value === '__manual__') return String(form.querySelector(`[data-endereco-manual="${campo}"]`)?.value || '').trim();
  return select.value.trim();
}

function configurarCamposEndereco() {
  const form = document.getElementById('pagamentoForm');
  if (!form) return;
  form.querySelectorAll('[data-endereco-manual-btn]').forEach(botao => {
    botao.addEventListener('click', () => {
      const campo = botao.dataset.enderecoManualBtn;
      const select = form.querySelector(`[data-endereco-select="${campo}"]`);
      select.value = '__manual__';
      select.dispatchEvent(new Event('change'));
    });
  });
  ['estado', 'logradouro', 'bairro', 'cidade'].forEach(campo => {
    const select = form.querySelector(`[data-endereco-select="${campo}"]`);
    const manual = form.querySelector(`[data-endereco-manual="${campo}"]`);
    const atualizar = (focar = false) => {
      const usarManual = select.value === '__manual__';
      manual.hidden = !usarManual;
      manual.required = usarManual;
      select.required = !usarManual;
      if (usarManual && focar) manual.focus();
    };
    select.addEventListener('change', () => atualizar(true));
    atualizar();
  });

  const cepInput = form.elements.endereco_cep;
  const msg = document.getElementById('cepConsultaMsg');
  let timer = null;
  const preencherSelect = (campo, opcoes, valor) => {
    const select = form.querySelector(`[data-endereco-select="${campo}"]`);
    const manual = form.querySelector(`[data-endereco-manual="${campo}"]`);
    const valores = [...new Set((opcoes || []).filter(Boolean))];
    if (campo === 'estado') {
      select.value = String(valor || '').toUpperCase();
      return;
    }
    select.innerHTML = `<option value="">Selecione uma opção</option><option value="__manual__">Colocar manualmente</option>${valores.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
    if (valor && valores.some(item => item.toLowerCase() === valor.toLowerCase())) select.value = valores.find(item => item.toLowerCase() === valor.toLowerCase());
    else select.value = valores.length ? '' : '__manual__';
    manual.value = valor || '';
    select.dispatchEvent(new Event('change'));
  };
  const consultar = async () => {
    const cep = String(cepInput.value || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    msg.textContent = 'Consultando CEP...';
    msg.className = 'campo-ajuda';
    const cacheKey = `gm_cep_${cep}`;
    let dados = null;
    try {
      const cache = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cache && Date.now() - cache.salvoEm < 7 * 24 * 60 * 60 * 1000) dados = cache.dados;
    } catch (_) {}
    try {
      if (!dados) {
        const resposta = await fetch(`api.php?action=consultar_cep&cep=${encodeURIComponent(cep)}`, { cache: 'no-store' });
        const payload = await resposta.json();
        if (!resposta.ok || !payload.success) throw new Error(payload.message || 'Consulta indisponível.');
        dados = payload.data;
        try { localStorage.setItem(cacheKey, JSON.stringify({ salvoEm: Date.now(), dados })); } catch (_) {}
      }
      const cidadeMaravilha = String(dados.cidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'maravilha'
        && String(dados.estado || '').toUpperCase() === 'SC';
      preencherSelect('estado', dados.estado ? [dados.estado] : [], dados.estado || '');
      preencherSelect('cidade', dados.cidade ? [dados.cidade] : [], dados.cidade || '');
      preencherSelect('logradouro', dados.logradouro ? [dados.logradouro] : [], dados.logradouro || '');
      const bairros = dados.bairro ? [dados.bairro] : [];
      preencherSelect('bairro', bairros, dados.bairro || '');
      if (cidadeMaravilha && cep === '89874000') {
        msg.textContent = 'Maravilha/SC identificada. Este CEP é geral e não informa rua ou bairro; preencha esses campos manualmente.';
        msg.className = 'campo-ajuda sucesso';
      } else if (dados.bairro) {
        msg.textContent = 'Endereço localizado. Confira os dados e complete o número.';
        msg.className = 'campo-ajuda sucesso';
      } else {
        msg.textContent = 'Cidade e estado preenchidos. Escolha o bairro ou use “Colocar manualmente”.';
        msg.className = 'campo-ajuda aviso';
      }
    } catch (erro) {
      if (cep === '89874000') {
        preencherSelect('estado', ['SC'], 'SC');
        preencherSelect('cidade', ['Maravilha'], 'Maravilha');
        preencherSelect('logradouro', [], '');
        preencherSelect('bairro', [], '');
        msg.textContent = 'Consulta externa indisponível. Maravilha/SC foi reconhecida pelo CEP geral; preencha rua e bairro manualmente.';
      } else {
        ['estado', 'logradouro', 'bairro', 'cidade'].forEach(campo => preencherSelect(campo, [], ''));
        msg.textContent = `${erro.message || 'Consulta de CEP indisponível.'} Preencha os campos manualmente.`;
      }
      msg.className = 'campo-ajuda aviso';
    }
  };
  cepInput.addEventListener('input', () => {
    cepInput.value = cepInput.value.replace(/[^0-9-]/g, '').slice(0, 9);
    clearTimeout(timer);
    if (cepInput.value.replace(/\D/g, '').length === 8) timer = setTimeout(consultar, 250);
  });
  cepInput.addEventListener('blur', consultar);
}

async function carregarPreferenciaPagamento(form) {
  try {
    const resposta = await fetch('api.php?action=pagamento_preferencia', { credentials: 'same-origin', cache: 'no-store' });
    const payload = await resposta.json();
    const pref = payload?.success ? payload.data : null;
    if (!pref || !form.isConnected) return;
    const endereco = pref.endereco;
    if (endereco) {
      form.elements.endereco_cep.value = `${String(endereco.cep).slice(0,5)}-${String(endereco.cep).slice(5)}`;
      form.elements.endereco_numero.value = endereco.numero || '';
      form.elements.endereco_complemento.value = endereco.complemento || '';
      const estado = form.querySelector('[data-endereco-select="estado"]');
      if (estado) estado.value = String(endereco.estado || '').toUpperCase();
      ['logradouro','bairro','cidade'].forEach(campo => {
        const select = form.querySelector(`[data-endereco-select="${campo}"]`);
        const manual = form.querySelector(`[data-endereco-manual="${campo}"]`);
        const valor = endereco[campo] || '';
        if (select && manual && valor) {
          select.value = '__manual__';
          select.dispatchEvent(new Event('change'));
          manual.value = valor;
        }
      });
    }
    const metodo = form.querySelector(`input[name="metodo_pagamento"][value="${pref.metodo}"]`);
    if (metodo) { metodo.checked = true; atualizarMetodoPagamento(); }
    if (pref.metodo === 'pix') {
      if (pref.banco_pagador && form.elements.pix_banco) form.elements.pix_banco.value = pref.banco_pagador;
      if (pref.titular_pagador && form.elements.pix_titular) form.elements.pix_titular.value = pref.titular_pagador;
      const cpf = form.elements.pix_cpf;
      if (cpf && pref.cpf_final4) {
        cpf.placeholder = `•••.•••.•••-${pref.cpf_final4} (preencha o CPF fictício para esta simulação)`;
        cpf.insertAdjacentHTML('afterend', '<small class="campo-ajuda">Banco e titular preenchidos da sua última simulação. O CPF completo não é salvo; somente os quatro últimos dígitos.</small>');
      }
    }
  } catch (erro) {
    console.info('Preferência de pagamento não disponível:', erro);
  }
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
      logradouro: valorEndereco(form, 'logradouro'),
      numero: form.elements.endereco_numero.value.trim(),
      complemento: form.elements.endereco_complemento.value.trim(),
      bairro: valorEndereco(form, 'bairro'),
      cidade: valorEndereco(form, 'cidade'),
      estado: valorEndereco(form, 'estado')
    },
    pix_banco: form.elements.pix_banco?.value || '',
    pix_titular: form.elements.pix_titular?.value.trim() || '',
    pix_cpf: form.elements.pix_cpf?.value || '',
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

    cesta = []; salvarCesta();
    const pedidoResumo = {
      id_pedido: payload.data.id_pedido,
      status_pedido: 'Em rota de entrega',
      valor_total: payload.data.valor_total || total,
      metodo_pagamento: metodo
    };
    sessionStorage.setItem('gm_ultimo_pedido', JSON.stringify(pedidoResumo));
    if (metodo === 'pix' && payload.data.link_pagamento) {
      toast(`Pedido #${payload.data.id_pedido} criado. Abra a simulação Pix.`);
      window.location.href = payload.data.link_pagamento;
      return;
    }
    toast(`Pedido #${payload.data.id_pedido} registrado. Rastree seu pedido abaixo.`);
    location.hash = '#rastreio';
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
  if (receitas.length < 2) return;
  if (carrosselEmMovimento) {
    filaMovimentoCarrossel = Math.max(-4, Math.min(4, filaMovimentoCarrossel + Math.sign(passo)));
    return;
  }
  pos = ((pos + Math.sign(passo)) % receitas.length + receitas.length) % receitas.length;
  document.querySelectorAll('.slide').forEach(el => {
    aplicar(el, deslocamento(Number(el.dataset.i)));
  });
  carrosselEmMovimento = true;
  window.setTimeout(() => {
    carrosselEmMovimento = false;
    if (filaMovimentoCarrossel) {
      const proximo = Math.sign(filaMovimentoCarrossel);
      filaMovimentoCarrossel -= proximo;
      mover(proximo);
    }
  }, 220);
}

let carrosselEmMovimento = false;
let filaMovimentoCarrossel = 0;

function abrirSlide(i) {
  const d = deslocamento(i);
  if (d === 0) location.hash = '#receita-' + receitas[i].id_receita;
  else mover(d);
}

/* ---------- cards ---------- */

function cardReceita(r, compacto = false, regional = false) {
  const restaurante = restauranteDaReceita(r.id_receita);
  const indisponivel = regional && restaurante && !restaurante.disponivel;
  return `<a class="card-receita${compacto ? ' compacto' : ''}${indisponivel ? ' receita-indisponivel' : ''}" href="${indisponivel ? '#' : `#receita-${r.id_receita}`}" ${indisponivel ? 'aria-disabled="true" onclick="return false"' : ''}>
    <div class="card-img-wrap">${foto(r)}<span class="tag">${esc(niveis[r.nivel_dificuldade] || 'Sem nível')}</span></div>
    <div class="card-corpo">
      <h3>${esc(r.titulo)}</h3>
      <p class="receita-restaurante">🍽 ${esc(restaurante?.nome || 'Restaurante não definido')}${indisponivel ? ' • Indisponível nesta área' : ''}</p>
      <div class="rating">${estrelas(r.nota)} <span>${Number(r.nota || 0).toFixed(1)} <em>(${esc(r.avaliacoes || 'Nova')})</em></span></div>
      ${(r.restricoes || []).length ? `<div class="restricoes-lista">${tagsRestricoes(r)}</div>` : ''}${avisoAlergenos(r)}
      <div class="meta"><span>⏱ ${r.tempo_preparo_minutos || 0} min</span><span>${r.tipo_acesso === 'exclusivo_pago' ? brl(r.preco_conteudo) : 'Gratuita'}</span></div>
    </div>
  </a>`;
}

const telas = {
  inicio() {
    const slides = receitas.slice(0, 7).map((r, i) => {
      const d = deslocamento(i);
      return `<div class="slide ${Math.abs(d) > 2 ? 'dh' : 'd' + Math.abs(d)}" style="--lado:${Math.sign(d)}" data-d="${d}" data-i="${i}" onclick="abrirSlide(${i})">
        ${foto(r)}<div class="slide-legenda"><strong>${esc(r.titulo)}</strong><span>${esc(restauranteDaReceita(r.id_receita)?.nome || 'Restaurante não definido')}</span><span>${r.tempo_preparo_minutos} min • ${niveis[r.nivel_dificuldade]}</span></div>
      </div>`;
    }).join('');

    const destaques = [receitas[2], receitas[1], receitas[4]].filter(Boolean).map(r => cardReceita(r)).join('');
    return `<section class="home">
      <div class="hero">
        <div class="hero-texto"><span class="eyebrow">🍳 sua cozinha, do seu jeito</span>
          <h1>Descubra. Aprenda.<br><span>Cozinhe.</span></h1>
          <p>Receitas, videoaulas, chefs e kits de ingredientes em uma experiência gastronômica completa.</p>
          <div class="hero-acoes"><a class="btn" href="#feed">Explorar receitas</a><a class="btn btn-ghost" href="#perfil">Meu perfil</a></div>
          ${Number(perfilAtual?.id_usuario || 0) === 0 ? '<div class="aviso-visitante"><strong>Você está navegando como visitante.</strong><span>Para comprar kits, desbloquear receitas pagas e salvar pedidos, entre ou crie uma conta.</span><a href="login.html">Entrar ou criar conta</a></div>' : ''}
          <div class="hero-dados"><span><b>${receitas.length}</b><small>receitas disponíveis</small></span><span><b>4,6★</b><small>média de avaliações</small></span><span><b>3</b><small>filtros alimentares</small></span></div>
        </div>
        <div class="hero-mosaico"><div class="hero-img principal">${foto(receitas[4] || receitas[0])}</div><div class="hero-img topo">${foto(receitas[2] || receitas[0])}</div><div class="hero-img canto">${foto(receitas[0])}</div><span class="selo">cozinhe com<br><strong>quem entende</strong></span></div>
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
    const restaurantes = montarListaRestaurantesPerto();
    return `<section class="pagina">
      <div class="pagina-cabecalho"><div><span class="eyebrow">logística local</span><h2>Perto de você</h2><p>Veja quais restaurantes ficam mais próximos da sua localização e simule a rota do pedido.</p></div></div>
      <div class="local-box"><div class="local-icone">⌖</div><div><h3>Disponibilidade regional</h3><p>Nesta demonstração o mapa usa um endereço fixo e restaurantes fictícios. Ajuste o raio de cada restaurante; a preferência fica salva neste navegador e as receitas fora da cobertura aparecem indisponíveis.</p></div></div>
      <div class="mapa-container">
        <div id="mapa-perto" class="mapa-localizacao"></div>
        <div class="mapa-fallback">
          <strong>Restaurantes próximos</strong>
          <div class="lista-restaurantes" id="listaRestaurantes">${restaurantes}</div>
          <p class="aviso-demo-mapa">Restaurantes fictícios, usados apenas para demonstrar o funcionamento do site.</p>
        </div>
      </div>
      <h2>Receitas da região</h2><p class="subtitulo-regiao">Cada restaurante define e mantém seu próprio raio de entrega.</p><div class="grade destaque-grid" id="receitasPerto">${receitas.map(r => cardReceita(r, true, true)).join('')}</div>
    </section>`;
  },

  rastreio() {
    const restPedido = restauranteDoPedido();
    return `<section class="pagina pagina-rastreio">
      <div class="pagina-cabecalho"><div><span class="eyebrow">rastreio do pedido</span><h2>Acompanhe a sua entrega</h2><p>Veja o entregador sair do restaurante e percorrer o caminho até você. Tudo aqui é uma simulação demonstrativa.</p></div><a href="#inicio" class="btn btn-ghost">← Voltar ao início</a></div>
      <div class="rt-layout">
        <div class="rt-mapa-card">
          <div class="rt-mapa-topo">
            <div><span class="eyebrow">pedido</span><h3 id="rtPedidoNumero">Carregando...</h3></div>
            <span class="status-entrega" id="statusRastreio">Carregando pedido...</span>
          </div>
          <div class="rt-mapa-wrap">
            <div id="mapa-rastreio" class="mapa-localizacao mapa-rastreio"></div>
            <div class="rt-entregue" id="rtEntregue" hidden>
              <span class="rt-entregue-icone">✓</span>
              <div><strong>Pedido entregue!</strong><small id="rtEntregueDetalhe">Bom apetite. Que tal ver mais receitas?</small></div>
              <button class="btn" type="button" onclick="location.hash='#feed'">Ver receitas</button>
            </div>
          </div>
          <div class="rt-barra"><div class="rt-barra-fill" id="rtBarra"></div></div>
          <div class="rt-legenda"><span>🍽️ <span id="rtRestauranteTopo">${esc(restPedido.nome)}</span></span><span id="rtDistancia">—</span><span>🏠 Você</span></div>
        </div>
        <aside class="rt-lateral">
          <div class="rt-eta"><span id="rtEtaTitulo">Chegada em</span><strong id="etaRastreio">${restPedido.tempo} min</strong><small id="rtHora">Carregando...</small></div>
          <ol class="rt-passos" id="rtPassos">${montarPassosRastreio(1)}</ol>
          <div class="rt-entregador"><div class="rt-entregador-avatar">LA</div><div><strong>Lucas A.</strong><small>Entregador • ⭐ 4,9</small></div></div>
          <div class="rt-resumo">
            <div class="rt-linha"><span>Restaurante</span><strong id="rtRestauranteResumo">${esc(restPedido.nome)}</strong></div>
            <div class="rt-linha"><span>Valor</span><strong id="rtValor">—</strong></div>
            <div class="rt-linha"><span>Pagamento</span><strong id="rtPagamento">—</strong></div>
            <div class="rt-linha"><span>Local de entrega</span><strong>${esc(CENTRO_DEMO.nome.replace(' (demonstração)', ''))}</strong></div>
          </div>
          <div class="rt-acoes">
            <a class="btn" id="rtPagarPix" href="#" hidden>Ir para o pagamento Pix</a>
            <button class="btn" id="rtBtnRepetir" type="button" onclick="resimularRastreio()">↻ Reiniciar simulação</button>
            <button class="btn btn-ghost" type="button" onclick="location.hash='#perto'">Ver restaurantes próximos</button>
          </div>
          <p class="aviso-demo-mapa" id="rtAviso">Simulação demonstrativa: não há entregador real nem GPS.</p>
        </aside>
      </div>
    </section>`;
  },

  perfil() {
    perfilAtual = carregarPerfil();
    const criador = ['chef', 'restaurante'].includes(perfilAtual.tipo_usuario);
    const statusVerificacao = perfilAtual.status_validacao || 'pendente';
    const statusDescricao = statusVerificacao === 'aprovado' ? 'Aprovado pela equipe' : statusVerificacao === 'reprovado' ? 'Precisa de mais informações' : 'Aguardando análise humana';
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
          <div class="info-box campo-span"><strong>Verificação profissional:</strong> ${esc(statusDescricao)}.${perfilAtual.verificacao_parecer ? `<br><strong>Parecer da equipe:</strong> ${esc(perfilAtual.verificacao_parecer)}` : ''}${perfilAtual.verificacao_relato ? `<br><strong>Relato enviado:</strong> ${esc(perfilAtual.verificacao_relato)}` : ''}${perfilAtual.verificacao_link ? `<br><a href="${esc(perfilAtual.verificacao_link)}" target="_blank" rel="noopener">Abrir evidência enviada</a>` : ''}</div>
        </div></div>` : `<div class="info-box">Seu perfil de cliente usa os dados da tabela <strong>usuarios</strong>. Quando a conta for de chef/restaurante, os campos profissionais da tabela <strong>perfis_criadores</strong> aparecem aqui.</div>`}
        <div class="form-acoes"><a class="btn btn-ghost" href="#inicio">Cancelar</a><button class="btn" type="submit">Salvar alterações</button></div>
      </form>
      ${criador && statusVerificacao === 'reprovado' ? `<form class="form-card reenviar-verificacao" onsubmit="reenviarVerificacao(event)"><div class="form-topo"><div><span class="eyebrow">nova análise</span><h2>Atualizar evidências</h2></div></div><label class="campo"><span>Empresa ou estabelecimento</span><input name="empresa" type="text" maxlength="150" required value="${esc(perfilAtual.verificacao_empresa)}"></label><label class="campo"><span>CNPJ</span><input name="cnpj" type="text" inputmode="numeric" maxlength="18" required value="${esc(perfilAtual.cnpj || '')}"></label><label class="campo"><span>Relato profissional (mínimo 40 caracteres)</span><textarea name="relato_profissional" minlength="40" maxlength="3000" rows="4" required>${esc(perfilAtual.verificacao_relato)}</textarea></label><label class="campo"><span>Link de evidência (opcional)</span><input name="link_evidencia" type="url" maxlength="500" value="${esc(perfilAtual.verificacao_link)}"></label><button class="btn" type="submit">Reenviar para análise</button><p class="avaliacao-mensagem" role="status" aria-live="polite"></p></form>` : ''}
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
    if (perfilAtual.status_validacao !== 'aprovado') {
      const reprovado = perfilAtual.status_validacao === 'reprovado';
      return `<section class="pagina vazio"><div class="icone-vazio">👨‍🍳</div><h2>${reprovado ? 'Verificação precisa de ajustes' : 'Verificação em análise'}</h2><p>${reprovado ? esc(perfilAtual.verificacao_parecer || 'A equipe precisa de mais informações para aprovar seu perfil.') : 'A equipe está analisando os dados profissionais enviados. O painel de publicação será liberado após a aprovação.'}</p><a class="btn" href="#perfil">Ver status e evidências</a></section>`;
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
    if (perfilAtual.status_validacao !== 'aprovado') return telas.chef();
    const temp = window.receitaRascunho || {};
    return `<section class="pagina pagina-nova-receita"><div class="pagina-cabecalho"><div><span class="eyebrow">área do criador</span><h2>Adicionar nova receita</h2><p>Preencha os dados da receita e selecione as restrições alimentares correspondentes.</p></div><a href="#chef" class="btn btn-ghost">← Voltar ao painel</a></div>
      <form class="receita-form" id="receitaForm" onsubmit="publicarReceita(event)">
        <div class="form-coluna-principal">
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">1 • apresentação</span><h2>Sobre o prato</h2></div></div>
            <label class="campo"><span>Título da receita</span><input name="titulo" type="text" maxlength="100" required value="${esc(temp.titulo)}" placeholder="Ex.: Risoto de cogumelos"></label>
            <label class="campo"><span>Descrição de introdução</span><textarea name="descricao_introducao" maxlength="500" rows="4" required placeholder="Apresente o prato em poucas linhas...">${esc(temp.descricao_introducao)}</textarea></label>
            <div class="form-grid"><label class="campo"><span>Rendimento (porções)</span><input name="rendimento" type="number" min="1" max="100" required value="${esc(temp.rendimento || 2)}"></label><label class="campo"><span>Tempo de preparo (minutos)</span><input name="tempo_preparo_minutos" type="number" min="1" max="1440" required value="${esc(temp.tempo_preparo_minutos || 30)}"></label></div>
            <div class="form-grid"><label class="campo"><span>Nível de dificuldade</span><select name="nivel_dificuldade"><option value="facil" ${temp.nivel_dificuldade === 'facil' || !temp.nivel_dificuldade ? 'selected' : ''}>Fácil</option><option value="medio" ${temp.nivel_dificuldade === 'medio' ? 'selected' : ''}>Médio</option><option value="dificil" ${temp.nivel_dificuldade === 'dificil' ? 'selected' : ''}>Difícil</option></select></label><label class="campo"><span>Tipo de acesso</span><select id="tipoAcesso" name="tipo_acesso" onchange="alternarPrecoConteudo()"><option value="gratuito" ${temp.tipo_acesso === 'exclusivo_pago' ? '' : 'selected'}>Gratuito</option><option value="exclusivo_pago" ${temp.tipo_acesso === 'exclusivo_pago' ? 'selected' : ''}>Exclusivo pago</option></select></label></div>
            <label class="campo"><span>Restaurante responsável</span><select name="restaurante_demo" required>${restaurantesProximos.map(rest => `<option value="${esc(rest.nome)}" ${temp.restaurante_demo === rest.nome ? 'selected' : ''}>${esc(rest.nome)}</option>`).join('')}</select><small>O restaurante escolhido será mostrado na receita e será a origem da entrega demonstrativa.</small></label>
            <div class="form-grid"><label class="campo campo-span" id="campoPrecoConteudo"><span>Preço do conteúdo (R$)</span><input id="precoConteudo" name="preco_conteudo" type="number" min="0" step="0.01" value="${esc(temp.preco_conteudo || 0)}" placeholder="0,00"></label></div>
          </div>
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">2 • conteúdo</span><h2>Ingredientes e preparo</h2></div></div>
            <label class="campo"><span>Ingredientes (um por linha)</span><textarea name="ingredientes" rows="8" required placeholder="500g de arroz\n200g de cogumelos\n...">${esc((temp.ingredientes || []).join('\n'))}</textarea></label>
            <label class="campo"><span>Modo de preparo (uma etapa por linha)</span><textarea name="preparo" rows="9" required placeholder="Refogue os ingredientes...\nAdicione o caldo...\nFinalize...">${esc((temp.preparo || []).join('\n'))}</textarea></label>
          </div>
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">3 • restrições</span><h2>Restrições alimentares</h2><p class="form-ajuda">As opções marcadas serão gravadas no relacionamento <strong>receitas_restricoes</strong>.</p></div></div>
            <div class="restricoes-grid">${restricoesDisponiveis.map(r => `<label class="check-card"><input type="checkbox" name="restricoes" value="${r.id}" ${temp.restricoes?.includes(r.id) ? 'checked' : ''}><span><b>${esc(r.label)}</b><small>Marque apenas se a receita atender à restrição.</small></span></label>`).join('')}</div>
          </div>
          <div class="form-card"><div class="form-topo"><div><span class="eyebrow">4 • segurança alimentar</span><h2>Alergênicos presentes</h2><p class="form-ajuda">Marque os alergênicos presentes nos ingredientes. É diferente das restrições que a receita atende.</p></div></div>
            <div class="restricoes-grid">${alergenosDisponiveis.map(a => `<label class="check-card"><input type="checkbox" name="alergenos" value="${a.id}" ${temp.alergenos?.includes(a.id) ? 'checked' : ''}><span><b>${esc(a.label)}</b><small>Marque se estiver presente.</small></span></label>`).join('')}</div>
          </div>
        </div>
        <aside class="form-coluna-lateral">
          <div class="form-card upload-receita"><span class="eyebrow">foto</span><h3>Imagem da receita</h3><div id="previewReceita" class="preview-receita">${temp.img ? `<img src="${esc(temp.img)}" alt="Prévia">` : '<span>🍽️<small>Escolha uma foto bonita do prato.</small></span>'}</div><label class="upload-btn largo" for="fotoReceita">Escolher imagem</label><input id="fotoReceita" type="file" accept="image/png,image/jpeg,image/webp" onchange="prepararFotoReceita(this)"></div>
          <div class="form-card"><span class="eyebrow">videoaula</span><h3>Conteúdo em vídeo</h3><label class="campo"><span>URL do vídeo</span><input name="url_video" type="url" value="${esc(temp.url_video)}" placeholder="https://... "></label><label class="campo"><span>Duração (segundos)</span><input name="duracao_segundos" type="number" min="0" value="${esc(temp.duracao_segundos || 0)}"></label><div class="info-box">Esses campos correspondem à tabela <strong>videoaulas</strong>.</div></div>
          <div class="form-card"><span class="eyebrow">kit de ingredientes</span><h3>Oferecer kit?</h3><label class="switch-linha"><input id="oferecerKit" name="oferecer_kit" type="checkbox" onchange="alternarKit()" ${temp.oferecer_kit ? 'checked' : ''}><span>Disponibilizar kit para compra</span></label><div id="dadosKit" class="dados-kit" ${temp.oferecer_kit ? '' : 'hidden'}><label class="campo"><span>Preço do kit (R$)</span><input name="preco_kit" type="number" min="0" step="0.01" value="${esc(temp.preco_kit || 0)}"></label><label class="campo"><span>Estoque disponível</span><input name="estoque_disponivel" type="number" min="0" value="${esc(temp.estoque_disponivel || 0)}"></label><div class="info-box">Ligação com <strong>kits_ingredientes</strong> e, futuramente, <strong>raio_entrega_restaurantes</strong>.</div></div></div>
          <div class="form-card publicar-box"><p id="receitaMensagem" class="form-msg" role="status" aria-live="polite"></p><button class="btn btn-publicar" type="submit">Publicar receita</button><button class="btn btn-ghost" type="button" onclick="salvarRascunho()">Salvar rascunho</button><small>A receita será gravada no banco antes de aparecer no catálogo.</small></div>
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
            <label class="payment-option"><input type="radio" name="metodo_pagamento" value="pix" checked><span>Pix simulado</span></label>
            <label class="payment-option"><input type="radio" name="metodo_pagamento" value="dinheiro"><span>Dinheiro na entrega</span></label>
          </div>

          <div class="form-grid">
            <label class="campo campo-span"><span>Nome do pagador</span><input name="nome_pagador" type="text" value="${esc(perfilAtual.nome || 'Cliente GastroMatch')}" required></label>
            <label class="campo"><span>CEP</span><input name="endereco_cep" type="text" inputmode="numeric" maxlength="9" placeholder="00000-000" required><small id="cepConsultaMsg" class="campo-ajuda" role="status" aria-live="polite">Digite o CEP para consultar. Se a API falhar, use “Colocar manualmente”.</small></label>
            ${montarSelectEndereco('estado', 'Estado (UF)', [])}
            <div class="campo campo-span">${montarSelectEndereco('logradouro', 'Logradouro', []).replace('<label class="campo">','<div class="campo">').replace('</label>','</div>')}</div>
            <label class="campo"><span>Número</span><input name="endereco_numero" type="text" maxlength="20" required></label>
            <label class="campo"><span>Complemento (opcional)</span><input name="endereco_complemento" type="text" maxlength="100"></label>
            ${montarSelectEndereco('bairro', 'Bairro', [])}
            ${montarSelectEndereco('cidade', 'Cidade', [])}
            <label class="campo campo-span"><span>Observações do pedido (opcional)</span><textarea name="observacoes" rows="3" maxlength="2000" placeholder="Instruções para entrega ou preparo"></textarea></label>
          </div>

          <div class="payment-extra">
            <div class="payment-box pix-box">
              <strong>Pix de demonstração</strong>
              <p>Nenhuma transferência real será feita. Após criar o pedido, você receberá um link local para simular a confirmação.</p>
              <div class="form-grid">
                <label class="campo"><span>Banco usado na simulação</span><select name="pix_banco" data-pix-required><option value="">Selecione</option><option value="banco_do_brasil">Banco do Brasil</option><option value="caixa">Caixa</option><option value="itau">Itaú</option><option value="bradesco">Bradesco</option><option value="santander">Santander</option><option value="inter">Inter</option><option value="nubank">Nubank</option><option value="outro">Outro</option></select></label>
                <label class="campo"><span>Nome do titular</span><input name="pix_titular" type="text" maxlength="100" autocomplete="off" data-pix-required></label>
                <label class="campo campo-span"><span>CPF fictício do pagador</span><input name="pix_cpf" type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00" data-pix-required></label>
              </div>
              <small class="aviso-pix">Demonstração acadêmica: não informe senha, agência, número de conta nem dados bancários reais. O CPF completo não será salvo; o banco guarda somente os quatro últimos dígitos.</small>
            </div>
            <div class="payment-box dinheiro-box" hidden>
              <strong>Dinheiro na entrega</strong>
              <p>O pagamento ficará pendente e será feito diretamente ao entregador quando o pedido chegar.</p>
              <small>Nenhum dado bancário é necessário.</small>
            </div>
          </div>

          <div class="form-acoes"><button class="btn" type="submit">Criar pedido</button></div>
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
    alergenos: dados.getAll('alergenos'),
    ingredientes: String(dados.get('ingredientes')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean),
    preparo: String(dados.get('preparo')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean),
    url_video: String(dados.get('url_video')||'').trim(),
    duracao_segundos: Number(dados.get('duracao_segundos')||0),
    oferecer_kit: Boolean(dados.get('oferecer_kit')),
    restaurante_demo: String(dados.get('restaurante_demo') || ''),
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
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dados, id_criador: perfilAtual.id_usuario })
  });

  const payload = await resposta.json().catch(() => ({ success: false, message: 'Não foi possível salvar a receita no banco.' }));
  if (!resposta.ok || !payload.success) {
    const erro = new Error(payload.message || 'Não foi possível salvar a receita no banco.');
    erro.status = resposta.status;
    throw erro;
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
      ...dados, restaurante_demo: retorno.restaurante_demo || dados.restaurante_demo,
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
    const mensagem = document.getElementById('receitaMensagem');
    if (mensagem) { mensagem.textContent = erro.message || 'O servidor não confirmou o cadastro. A receita não foi publicada.'; mensagem.className = 'form-msg erro'; }
    toast(erro.message || 'Não foi possível salvar no banco. Seus dados continuam no formulário.');
  }
}

async function reenviarVerificacao(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const dados = new FormData(form);
  const mensagem = form.querySelector('[role="status"]');
  const cnpj = String(dados.get('cnpj') || '').replace(/\D/g, '');

  try {
    const resposta = await fetch('api.php?action=reenviar_verificacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa: String(dados.get('empresa') || '').trim(),
        cnpj,
        relato_profissional: String(dados.get('relato_profissional') || '').trim(),
        link_evidencia: String(dados.get('link_evidencia') || '').trim(),
      }),
    });
    const payload = await resposta.json();
    if (!resposta.ok || !payload.success) throw new Error(payload.message || 'Não foi possível reenviar a solicitação.');
    await atualizarPerfilDoBanco();
    perfilAtual = carregarPerfil();
    rota();
    toast(payload.message);
  } catch (erro) {
    if (mensagem) mensagem.textContent = erro.message || 'Não foi possível reenviar a solicitação.';
  }
}

/* ---------- receita ---------- */

async function verificarAcessoReceita(id) {
  const receita = achar(id);
  const chave = chaveAcessoReceita(id);
  if (!receita || receita.tipo_acesso !== 'exclusivo_pago' || acessosReceitasVerificados.has(chave)) return;
  try {
    const resposta = await fetch(`api.php?action=acesso_receita&id=${encodeURIComponent(id)}`, { cache: 'no-store', credentials: 'same-origin' });
    const payload = await resposta.json();
    acessosReceitasVerificados.add(chave);
    if (payload.success && payload.data?.liberada) receitasLiberadas.add(chave);
    if (location.hash === `#receita-${id}`) rota();
  } catch (erro) {
    console.warn('Não foi possível consultar o acesso à receita.', erro);
  }
}

async function confirmarCompraReceita(id) {
  if (!carregarPerfil().id_usuario) {
    toast('Entre na sua conta para comprar esta receita.');
    window.location.href = 'login.html';
    return;
  }
  location.hash = `#compraReceita-${Number(id)}`;
}

async function enviarPagamentoReceita(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const cpf = String(form.elements.cpf.value || '').replace(/\D/g, '');
  if (cpf.length !== 11) { toast('Informe os 11 dígitos do CPF fictício para a simulação.'); return; }
  const resposta = await fetch('api.php?action=confirmar_compra_receita', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_receita: Number(id), banco: form.elements.banco.value, titular: form.elements.titular.value.trim(), cpf })
  });
  const payload = await resposta.json().catch(() => ({ success: false }));
  if (!resposta.ok || !payload.success) {
    toast(payload.message || 'Não foi possível confirmar a compra. Entre na sua conta e tente novamente.');
    return;
  }
  receitasLiberadas.add(chaveAcessoReceita(id));
  toast('Compra de demonstração confirmada. Receita desbloqueada!');
  location.hash = `#receita-${Number(id)}`;
}

function telaPagamentoReceita(id) {
  const r = achar(id);
  if (!r || r.tipo_acesso !== 'exclusivo_pago' || (receitasLiberadas.has(chaveAcessoReceita(id)) && !location.hash.endsWith('-preview'))) return r ? telaReceita(id) : emBreve('Receita não encontrada', 'Volte ao feed e escolha uma receita.');
  return `<section class="pagina pagina-pagamento"><div class="pagina-cabecalho"><div><span class="eyebrow">compra de conteúdo</span><h2>Pagamento da receita</h2><p>${esc(r.titulo)}</p></div><a href="#receita-${Number(id)}" class="btn btn-ghost">Voltar à receita</a></div><div class="pagamento-layout"><form class="form-card pagamento-card" onsubmit="enviarPagamentoReceita(event, ${Number(id)})"><div class="payment-box pix-box"><strong>Pix de demonstração</strong><p>Preencha os dados fictícios para simular a confirmação. Nenhuma cobrança será realizada.</p><div class="form-grid"><label class="campo"><span>Banco usado na simulação</span><select name="banco" required><option value="">Selecione</option><option value="banco_do_brasil">Banco do Brasil</option><option value="caixa">Caixa</option><option value="itau">Itaú</option><option value="bradesco">Bradesco</option><option value="santander">Santander</option><option value="inter">Inter</option><option value="nubank">Nubank</option><option value="outro">Outro</option></select></label><label class="campo"><span>Nome do titular</span><input name="titular" maxlength="100" required autocomplete="off"></label><label class="campo campo-span"><span>CPF fictício do comprador</span><input name="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required autocomplete="off" oninput="formatarCpfCampo(this)"></label></div><small class="aviso-pix">Use dados fictícios. Não informe número de conta, senha, agência nem dados bancários reais. O CPF completo não é armazenado.</small></div><button class="btn" type="submit">Confirmar pagamento demonstrativo • ${brl(r.preco_conteudo)}</button></form><aside class="resumo-pedido"><span class="eyebrow">resumo</span><h3>${esc(r.titulo)}</h3><div class="linha-resumo total-final"><span>Total demonstrativo</span><strong>${brl(r.preco_conteudo)}</strong></div><small>Após confirmar, a receita fica desbloqueada para esta conta.</small></aside></div></section>`;
}

function formatarCpfCampo(campo) {
  const digits = campo.value.replace(/\D/g, '').slice(0, 11);
  campo.value = digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function telaReceita(id) {
  const r = achar(id); if (!r) return emBreve('Receita não encontrada', 'Volte ao início e escolha outra receita.');
  const avisoVisitante = Number(perfilAtual?.id_usuario || 0) === 0 ? '<div class="aviso-visitante"><strong>Você está navegando como visitante.</strong><span>Entre ou crie uma conta para comprar kits, desbloquear receitas pagas e salvar pedidos.</span><a href="login.html">Entrar ou criar conta</a></div>' : '';
  const bandeira = r.pais ? `<img class="bandeira" src="https://flagcdn.com/w80/${esc(r.pais)}.png" alt="" loading="lazy">` : '';
  const kit = r.preco_kit > 0 ? `<aside class="kit"><div><span class="eyebrow">kit em destaque</span><b>Prepare em casa</b></div><span class="preco">${brl(r.preco_kit)}</span><button onclick="comprarKit(${r.id_receita})">Adicionar kit</button><small>Estoque disponível: ${r.estoque_disponivel}</small></aside>` : '';
  const video = r.url_video ? `<div class="bloco-receita video-box"><h3>Videoaula</h3><a href="${esc(r.url_video)}" target="_blank" rel="noopener">▶ Abrir videoaula</a>${r.duracao_segundos ? `<span> • ${Math.floor(r.duracao_segundos/60)}m ${r.duracao_segundos%60}s</span>` : ''}</div>` : '';
  if (r.tipo_acesso === 'exclusivo_pago' && !receitasLiberadas.has(chaveAcessoReceita(id))) {
    return `<article class="receita"><div class="linha-receita"><a class="chef" href="#feed">← Voltar às receitas</a></div><div class="corpo-receita">${foto(r,'foto-receita')}<div class="receita-texto"><div class="receita-kicker">CONTEÚDO EXCLUSIVO</div><h1 class="titulo">${esc(r.titulo)}</h1><p class="receita-intro">${esc(r.descricao_introducao || '')}</p>${avisoVisitante}${avisoAlergenos(r)}<section class="bloco-receita compra-conteudo"><h2>Desbloqueie esta receita</h2><p>Confirme a compra demonstrativa para liberar ingredientes e modo de preparo nesta conta.</p><strong class="preco">${brl(r.preco_conteudo)}</strong><button class="btn" type="button" onclick="confirmarCompraReceita(${Number(id)})">Confirmar compra demonstrativa</button><small>Simulação acadêmica: nenhuma cobrança real será feita.</small></section></div></div></article>`;
  }
  return `<article class="receita"><div class="linha-receita"><a class="chef" href="#chef">← Voltar ao painel</a><a class="voltar" href="#feed" aria-label="Voltar">✕</a></div><div class="corpo-receita">${foto(r,'foto-receita')}<div class="receita-texto"><div class="receita-kicker">${esc(acessoLabel(r.tipo_acesso))} • Receita GastroMatch</div><h1 class="titulo">${esc(r.titulo)}${bandeira}</h1><p class="receita-intro">${esc(r.descricao_introducao || '')}</p>${avisoVisitante}<div class="info-receita"><span class="avaliacao-resumo">${estrelas(r.nota)} <strong>${Number(r.nota || 0).toFixed(1)}</strong> (${esc(r.avaliacoes || '0')} avaliações)</span><span>•</span><span>${niveis[r.nivel_dificuldade]}</span><span>•</span><span>${r.tempo_preparo_minutos} min</span><span>•</span><span>${r.rendimento || '-'} porções</span></div>${r.tipo_acesso === 'exclusivo_pago' && Number(perfilAtual.id_usuario) === Number(r.id_criador) ? `<section class="compra-conteudo"><strong>Receita exclusiva • ${brl(r.preco_conteudo)}</strong><button class="btn btn-ghost" onclick="location.hash='#compraReceita-${Number(id)}-preview'">Pré-visualizar pagamento do comprador</button></section>` : ''}${(r.restricoes || []).length ? `<div class="restricoes-detalhe"><strong>Restrições:</strong>${tagsRestricoes(r)}</div>` : ""}${avisoAlergenos(r)}<div class="bloco-receita"><h3>Ingredientes</h3><ul>${r.ingredientes.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div><div class="bloco-receita"><h3>Modo de preparo</h3><ol>${r.preparo.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></div>${video}</div></div><section class="avaliacoes" id="avaliacoesReceita" aria-live="polite"><p class="avaliacoes-carregando">Carregando avaliações...</p></section>${kit}</article>`;
}

function renderizarAvaliacoes(data, idReceita) {
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  const minha = data.current_user_review || null;
  const form = data.authenticated && data.can_review
    ? `<form class="avaliacao-form" data-receita-id="${idReceita}" onsubmit="enviarAvaliacao(event)">
        <h3>${minha ? 'Edite sua avaliação' : 'Deixe sua avaliação'}</h3>
        ${minha?.foto_avaliacao ? `<img class="avaliacao-foto-atual" src="${esc(minha.foto_avaliacao)}" alt="Foto atual da sua avaliação">` : ''}
        <fieldset class="campo-nota">
          <legend>Sua nota</legend>
          <div class="avaliacao-estrelas">${[1, 2, 3, 4, 5].map(valor => `<label class="estrela-opcao${minha && valor <= Number(minha.nota) ? ' ativa' : ''}" data-valor="${valor}">
            <input type="radio" name="nota" value="${valor}" aria-label="${valor} ${valor === 1 ? 'estrela' : 'estrelas'}" onchange="atualizarEstrelasAvaliacao(this)"${minha && Number(minha.nota) === valor ? ' checked' : ''} required>
            <span aria-hidden="true">★</span>
          </label>`).join('')}</div>
        </fieldset>
        <label class="campo-comentario"><span>Comentário (opcional)</span><textarea name="comentario" maxlength="1000" rows="4" placeholder="Compartilhe o que achou desta receita">${esc(minha?.comentario || '')}</textarea></label>
        <label class="campo-foto-avaliacao"><span>Foto do kit recebido ou do prato preparado</span><input type="file" name="foto_avaliacao" accept="image/jpeg,image/png,image/webp" onchange="preverFotoAvaliacao(this)"${minha?.foto_avaliacao ? '' : ' required'}><small>JPG, PNG ou WEBP, até 5 MB.${minha?.foto_avaliacao ? ' Envie outra foto para substituir a atual.' : ''}</small><img class="avaliacao-foto-preview" alt="Prévia da foto da avaliação" hidden></label>
        <div class="avaliacao-acoes"><button class="btn" type="submit">${minha ? 'Salvar alterações' : 'Publicar avaliação'}</button><p class="avaliacao-mensagem" role="status" aria-live="polite"></p></div>
      </form>`
    : data.authenticated
      ? '<div class="avaliacao-login"><p>Você poderá avaliar depois que o pagamento do kit for confirmado ou o pedido for entregue.</p></div>'
    : `<div class="avaliacao-login"><p>Entre ou crie uma conta para avaliar esta receita.</p><a class="btn" href="login.html">Entrar ou criar conta</a></div>`;
  const lista = reviews.length
    ? `<ol class="avaliacao-lista">${reviews.map(review => {
        const data = String(review.data_avaliacao || '').slice(0, 10).split('-').reverse().join('/');
          const demoBadge = Number(review.demonstracao) === 1 ? '<span class="avaliacao-demo-badge">Demonstração</span>' : '';
          return `<li class="avaliacao-item"><div class="avaliacao-item-topo"><strong>${esc(review.nome || 'Usuário')}</strong>${demoBadge}${estrelas(review.nota)}<time>${esc(data)}</time></div>${review.comentario ? `<p>${esc(review.comentario)}</p>` : '<p class="avaliacao-sem-comentario">Sem comentário.</p>'}${review.foto_avaliacao ? `<img class="avaliacao-foto" src="${esc(review.foto_avaliacao)}" alt="Foto enviada por ${esc(review.nome || 'cliente')} na avaliação" loading="lazy">` : ''}</li>`;
      }).join('')}</ol>`
    : '<p class="avaliacoes-vazias">Ainda não há avaliações escritas para esta receita.</p>';

  return `<div class="avaliacoes-cabecalho"><div><span class="eyebrow">opiniões da comunidade</span><h2>Avaliações</h2></div><span class="avaliacoes-contagem">${Number(data.avaliacoes || 0)} avaliações · ${Number(data.avaliacoes_demo || 0)} exemplos</span></div>${form}<div class="avaliacoes-publicadas"><h3>Comentários recentes</h3>${lista}</div>`;
}

async function carregarAvaliacoesReceita(idReceita) {
  const container = document.getElementById('avaliacoesReceita');
  if (!container) return;
  try {
    const resposta = await fetch(`api.php?action=avaliacoes&id_receita=${encodeURIComponent(idReceita)}`, { cache: 'no-store', credentials: 'same-origin' });
    const payload = await resposta.json();
    if (!resposta.ok || !payload.success) throw new Error(payload.message || 'Não foi possível carregar as avaliações.');

    const receita = achar(idReceita);
    if (receita) {
      receita.nota = Number(payload.data.nota || 0);
      receita.avaliacoes = String(payload.data.avaliacoes || 0);
    }
    const resumo = document.querySelector('.avaliacao-resumo');
    if (resumo) resumo.innerHTML = `${estrelas(payload.data.nota)} <strong>${Number(payload.data.nota || 0).toFixed(1)}</strong> (${Number(payload.data.avaliacoes || 0)} avaliações)`;
    container.innerHTML = renderizarAvaliacoes(payload.data, idReceita);
    if (location.hash.endsWith('-avaliar')) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (erro) {
    container.innerHTML = '<p class="avaliacoes-erro" role="status">Não foi possível carregar as avaliações agora. Atualize a página para tentar novamente.</p>';
  }
}

function atualizarEstrelasAvaliacao(input) {
  const valor = Number(input.value);
  input.closest('.avaliacao-estrelas').querySelectorAll('.estrela-opcao').forEach(opcao => {
    opcao.classList.toggle('ativa', Number(opcao.dataset.valor) <= valor);
  });
}

async function enviarAvaliacao(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const botao = form.querySelector('button[type="submit"]');
  const mensagem = form.querySelector('.avaliacao-mensagem');
  botao.disabled = true;
  mensagem.textContent = 'Enviando avaliação...';

  try {
    const dados = new FormData(form);
    dados.set('id_receita', form.dataset.receitaId);
    const resposta = await fetch('api.php?action=avaliar', {
      method: 'POST',
      credentials: 'same-origin',
      body: dados,
    });
    const payload = await resposta.json();
    if (!resposta.ok || !payload.success) throw new Error(payload.message || 'Não foi possível salvar sua avaliação.');
    toast(payload.message);
    await carregarAvaliacoesReceita(Number(form.dataset.receitaId));
  } catch (erro) {
    if (mensagem.isConnected) mensagem.textContent = erro.message || 'Não foi possível salvar sua avaliação.';
  } finally {
    if (botao.isConnected) botao.disabled = false;
  }
}

function preverFotoAvaliacao(input) {
  const arquivo = input.files?.[0];
  const preview = input.closest('.campo-foto-avaliacao')?.querySelector('.avaliacao-foto-preview');
  if (!arquivo || !preview) return;
  if (arquivo.size > 5 * 1024 * 1024) {
    input.value = '';
    preview.hidden = true;
    toast('A foto deve ter no máximo 5 MB.');
    return;
  }
  if (preview.dataset.urlAnterior) URL.revokeObjectURL(preview.dataset.urlAnterior);
  const url = URL.createObjectURL(arquivo);
  preview.src = url;
  preview.dataset.urlAnterior = url;
  preview.hidden = false;
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
  fetch('api.php?action=logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
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
      field.required = show && field.hasAttribute('data-pix-required');
    });
  });

  const cpf = document.querySelector('[name="pix_cpf"]');
  if (cpf && !cpf.dataset.maskBound) {
    cpf.dataset.maskBound = 'true';
    cpf.addEventListener('input', () => {
      const digits = cpf.value.replace(/\D/g, '').slice(0, 11);
      cpf.value = digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    });
  }
}

function rota() {
  const [pag, id] = (location.hash.slice(1) || 'inicio').split('-');
  perfilAtual = carregarPerfil();
  document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('ativo', a.dataset.p === pag));
  limparMapas();
  $('#app').innerHTML = pag === 'receita' ? telaReceita(id) : pag === 'compraReceita' ? telaPagamentoReceita(id) : (telas[pag] || telas.inicio)();
  if (pag === 'receita') { carregarAvaliacoesReceita(id); verificarAcessoReceita(id); }
  perfilAtual = carregarPerfil(); atualizarAvatarMini(); salvarCesta(); atualizarBotaoSessao();
  if (pag === 'novareceita') { alternarPrecoConteudo(); alternarKit(); }
  if (pag === 'pagamento') {
    setTimeout(() => {
      document.querySelectorAll('input[name="metodo_pagamento"]').forEach(input => {
        input.addEventListener('change', atualizarMetodoPagamento);
      });
      atualizarMetodoPagamento();
      configurarCamposEndereco();
      carregarPreferenciaPagamento(document.getElementById('pagamentoForm'));
    }, 0);
  }
  if (['perto', 'rastreio'].includes(pag)) {
    setTimeout(inicializarMapasTela, 0);
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
