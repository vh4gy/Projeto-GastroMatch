/* GastroMatch — Login com cadastro e banco de dados */
const ACESSOS = {
  cliente: {
    label: 'Cliente', email: 'cliente@gastromatch.com.br', code: 'GM-CLI-2026', redirect: 'index.html#inicio', tipoUsuario: 'cliente', idUsuario: 10
  },
  chef: {
    label: 'Chef / Criador', email: 'chef@gastromatch.com.br', code: 'GM-CHEF-2026', redirect: 'index.html#chef', tipoUsuario: 'chef', idUsuario: 2
  },
  admin: {
    label: 'Administrador', email: 'admin@gastromatch.com.br', redirect: 'AreaRestrita/painel.html', tipoUsuario: 'admin', idUsuario: 1
  }
};

const $ = (s) => document.querySelector(s);
let roleSelecionado = '';

function validarEmailReal(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
}

function validarCnpjFormato(cnpj) {
  const valor = String(cnpj || '').replace(/\D/g, '');
  return valor.length === 14;
}

function formatarCnpj(valor) {
  const digits = String(valor || '').replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  return digits.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,4})$/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

function setAuthMode(mode) {
  const isRegister = mode === 'register';
  document.querySelectorAll('.auth-tab').forEach(btn => {
    const selected = btn.dataset.authTab === mode;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', String(selected));
  });
  $('#loginFormWrap').hidden = isRegister;
  $('#registerFormWrap').hidden = !isRegister;
  const msg = $('#loginMsg');
  if (msg) { msg.textContent = ''; msg.className = 'login-msg'; }
  const regMsg = $('#registerMsg');
  if (regMsg) { regMsg.textContent = ''; regMsg.className = 'login-msg'; }
}

function selecionarPerfil(role){
  const dados = ACESSOS[role];
  if(!dados) return;
  roleSelecionado = role;
  $('#perfilAcesso').value = role;
  document.querySelectorAll('.role-card').forEach(card => {
    const selecionado = card.dataset.role === role;
    card.classList.toggle('selected', selecionado);
    card.setAttribute('aria-pressed', String(selecionado));
  });
  $('#selectedRole').hidden = false;
  $('#selectedRole').textContent = `Perfil selecionado: ${dados.label}`;
  $('#entrarBtn').disabled = false;
  $('#entrarBtn').textContent = `Entrar como ${dados.label}`;
  $('#loginMsg').textContent = '';
  $('#loginMsg').className = 'login-msg';
  $('#codigoAcesso').focus();
}

function salvarSessao(dados, role){
  const auth = {
    idUsuario: Number(dados.idUsuario || dados.id_usuario || 0),
    role,
    email: dados.email,
    nome: dados.label || dados.nome || 'Usuário GastroMatch',
    at: new Date().toISOString()
  };
  sessionStorage.setItem('gm_area_auth', JSON.stringify(auth));

  const perfilBase = {
    id_usuario: Number(dados.idUsuario || dados.id_usuario || 0),
    nome: dados.label || dados.nome || 'Usuário GastroMatch',
    email: dados.email,
    telefone: '',
    tipo_usuario: dados.tipoUsuario || role,
    data_cadastro: new Date().toISOString().slice(0,10),
    foto_perfil: '',
    biografia: role === 'chef' ? 'Chef apaixonado por transformar receitas em experiências simples e saborosas.' : '',
    link_portfolio: '',
    status_validacao: role === 'chef' ? 'aprovado' : ''
  };
  try {
    const antigo = JSON.parse(localStorage.getItem('gm_usuario')) || {};
    localStorage.setItem('gm_usuario', JSON.stringify({ ...perfilBase, ...antigo, id_usuario: perfilBase.id_usuario, email: dados.email, tipo_usuario: perfilBase.tipo_usuario }));
  } catch(e) {
    localStorage.setItem('gm_usuario', JSON.stringify(perfilBase));
  }
}

async function enviarRequisicaoApi(action, dados, mensagemFalha) {
  if (window.location.protocol === 'file:') {
    throw new Error('O projeto foi aberto diretamente como arquivo. Inicie o Apache no XAMPP e acesse esta página pelo endereço HTTP ou HTTPS do servidor para que o PHP e o banco funcionem.');
  }

  const url = new URL(`api.php?action=${encodeURIComponent(action)}`, window.location.href);
  let resposta;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
  } catch {
    throw new Error(`Não foi possível acessar a API PHP em ${url}. Abra o projeto pelo endereço HTTP ou HTTPS do Apache, não por file://, e confira se o Apache está ativo.`);
  }

  let payload;
  try {
    payload = await resposta.json();
  } catch {
    throw new Error(`A API em ${resposta.url} respondeu sem JSON (HTTP ${resposta.status}). Confira se o caminho aponta para api.php e se o PHP está ativo.`);
  }

  if (!resposta.ok || !payload.success) {
    throw new Error(payload.message || mensagemFalha);
  }

  return payload.data.user;
}

async function autenticarNoBanco(email, password, codigoVerificacao = '') {
  return enviarRequisicaoApi('login', { email, password, codigo_verificacao: codigoVerificacao }, 'Erro ao autenticar no banco.');
}

async function autenticarPorCodigo(role, code) {
  return enviarRequisicaoApi('login', { role, code }, 'Código de demonstração inválido.');
}

async function criarContaNoBanco(dados) {
  return enviarRequisicaoApi('register', dados, 'Não foi possível criar a conta.');
}

async function entrar(e){
  e.preventDefault();
  const msg = $('#loginMsg');
  const email = $('#loginEmail').value.trim();
  const senha = $('#loginPassword').value;
  const codigoVerificacao = $('#codigoVerificacao')?.value.trim() || '';
  const codigoAcesso = $('#codigoAcesso').value.trim();
  const codigoDemo = Object.keys(ACESSOS).find(role => ACESSOS[role].code === codigoAcesso.toUpperCase());
  const perfilCodigo = codigoDemo || roleSelecionado;

  if (!codigoAcesso && (!email || !senha)) {
    msg.textContent = 'Informe e-mail e senha ou selecione um perfil e use um código de demonstração.';
    msg.className = 'login-msg erro';
    return;
  }

  try {
    if (codigoAcesso && !perfilCodigo) {
      msg.textContent = 'Selecione o perfil correspondente ao código de demonstração.';
      msg.className = 'login-msg erro';
      return;
    }

    const usuario = codigoAcesso
      ? await autenticarPorCodigo(perfilCodigo, codigoAcesso)
      : await autenticarNoBanco(email, senha, codigoVerificacao);
    const tipo = usuario.tipo_usuario || 'cliente';
    const redirect = tipo === 'chef' ? 'index.html#chef' : tipo === 'restaurante' ? 'index.html#chef' : tipo === 'admin' ? 'AreaRestrita/painel.html' : 'index.html#inicio';
    salvarSessao({ idUsuario: Number(usuario.id_usuario || 0), label: usuario.nome || 'Usuário', email: usuario.email, tipoUsuario: tipo }, tipo);
    msg.textContent = 'Login realizado com sucesso. Redirecionando...';
    msg.className = 'login-msg ok';
    $('#entrarBtn').disabled = true;
    setTimeout(() => { window.location.href = redirect; }, 350);
    return;
  } catch (erro) {
    msg.textContent = erro.message || 'E-mail ou senha inválidos.';
    msg.className = 'login-msg erro';
    return;
  }
}

async function criarConta(e){
  e.preventDefault();
  const msg = $('#registerMsg');
  const nome = $('#registroNome').value.trim();
  const email = $('#registroEmail').value.trim();
  const senha = $('#registroSenha').value;
  const confirmar = $('#registroConfirmarSenha').value;
  const tipo = $('#registroTipo').value;
  const cnpj = $('#registroCnpj')?.value ? formatarCnpj($('#registroCnpj').value) : '';
  const empresa = $('#registroEmpresa')?.value.trim() || '';
  const relatoProfissional = $('#registroRelato')?.value.trim() || '';
  const linkEvidencia = $('#registroEvidencia')?.value.trim() || '';
  const verificacao2fa = $('#registroVerificacao')?.checked ? 1 : 0;

  if (!nome || !email || !senha || !confirmar) {
    msg.textContent = 'Preencha todos os campos para criar a conta.';
    msg.className = 'login-msg erro';
    return;
  }
  if (!validarEmailReal(email)) {
    msg.textContent = 'Informe um e-mail válido, com domínio real.';
    msg.className = 'login-msg erro';
    return;
  }
  if (senha.length < 6) {
    msg.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    msg.className = 'login-msg erro';
    return;
  }
  if (senha !== confirmar) {
    msg.textContent = 'As senhas não conferem.';
    msg.className = 'login-msg erro';
    return;
  }
  if (['chef', 'restaurante'].includes(tipo)) {
    if (!validarCnpjFormato(cnpj)) {
      msg.textContent = 'Informe os 14 dígitos do CNPJ da empresa ou do perfil profissional.';
      msg.className = 'login-msg erro';
      return;
    }
    if (!empresa || relatoProfissional.length < 40) {
      msg.textContent = 'Informe a empresa e descreva sua experiência profissional em pelo menos 40 caracteres.';
      msg.className = 'login-msg erro';
      return;
    }
  }

  try {
    const usuario = await criarContaNoBanco({ nome, email, password: senha, tipo_usuario: tipo, cnpj, empresa, relato_profissional: relatoProfissional, link_evidencia: linkEvidencia, verificacao_2fa: verificacao2fa });
    if (usuario.verificacao_2fa === 1 && usuario.email_verificado === 0) {
      localStorage.setItem('gm_verificacao_email', JSON.stringify({ email, codigo: usuario.email_verificacao_codigo || '' }));
      msg.textContent = `Conta criada com sucesso. Código de verificação: ${usuario.email_verificacao_codigo || 'N/A'} — informe-o ao entrar.`;
      msg.className = 'login-msg ok';
      setTimeout(() => setAuthMode('login'), 1500);
      return;
    }

    const redirect = tipo === 'chef' || tipo === 'restaurante' ? 'index.html#chef' : 'index.html#inicio';
    salvarSessao({ idUsuario: Number(usuario.id_usuario || 0), label: usuario.nome || nome, email: usuario.email || email, tipoUsuario: tipo }, tipo);
    msg.textContent = 'Conta criada com sucesso! Redirecionando...';
    msg.className = 'login-msg ok';
    setTimeout(() => { window.location.href = redirect; }, 350);
  } catch (erro) {
    msg.textContent = erro.message || 'Não foi possível criar a conta.';
    msg.className = 'login-msg erro';
  }
}

function toggleCodigo(){
  const input = $('#codigoAcesso');
  const btn = $('#toggleCode');
  const mostrar = input.type === 'password';
  input.type = mostrar ? 'text' : 'password';
  btn.textContent = mostrar ? 'Ocultar' : 'Mostrar';
  btn.setAttribute('aria-label', mostrar ? 'Ocultar código' : 'Mostrar código');
}

function toggleSenha(){
  const input = $('#loginPassword');
  const btn = $('#togglePassword');
  const mostrar = input.type === 'password';
  input.type = mostrar ? 'text' : 'password';
  btn.textContent = mostrar ? 'Ocultar' : 'Mostrar';
  btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
}

function atualizarCamposRegistro() {
  const tipo = $('#registroTipo')?.value || 'cliente';
  const campoCnpj = $('#campoCnpj');
  const camposVerificacao = $('#camposVerificacaoChef');
  const criador = ['chef', 'restaurante'].includes(tipo);
  if (campoCnpj) campoCnpj.hidden = !criador;
  if (camposVerificacao) camposVerificacao.hidden = !criador;
  if ($('#registroEmpresa')) $('#registroEmpresa').required = criador;
  if ($('#registroRelato')) $('#registroRelato').required = criador;
}

$('#registroTipo')?.addEventListener('change', atualizarCamposRegistro);
$('#registroCnpj')?.addEventListener('input', function() {
  this.value = formatarCnpj(this.value);
});

document.querySelectorAll('.role-card').forEach(btn => btn.addEventListener('click', () => selecionarPerfil(btn.dataset.role)));
document.querySelectorAll('[data-demo-role]').forEach(btn => btn.addEventListener('click', () => {
  setAuthMode('login');
  selecionarPerfil(btn.dataset.demoRole);
  $('#codigoAcesso').value = ACESSOS[btn.dataset.demoRole].code;
}));
document.querySelectorAll('.auth-tab').forEach(btn => btn.addEventListener('click', () => setAuthMode(btn.dataset.authTab)));
$('#loginForm')?.addEventListener('submit', entrar);
$('#registerForm')?.addEventListener('submit', criarConta);
$('#toggleCode')?.addEventListener('click', toggleCodigo);
$('#togglePassword')?.addEventListener('click', toggleSenha);
$('#codigoAcesso')?.addEventListener('input', () => {
  const msg = $('#loginMsg'); msg.textContent = ''; msg.className = 'login-msg';
});
$('#codigoVerificacao')?.addEventListener('input', () => {
  const msg = $('#loginMsg'); msg.textContent = ''; msg.className = 'login-msg';
});
$('#entrarBtn').disabled = true;
atualizarCamposRegistro();
setAuthMode('login');
