const pixReference = new URLSearchParams(window.location.search).get('ref') || '';
const pixLoading = document.getElementById('pixCarregando');
const pixContent = document.getElementById('pixConteudo');
const pixConfirmButton = document.getElementById('pixConfirmar');
const pixMessage = document.getElementById('pixMensagem');

const pixElements = {
  amount: document.getElementById('pixValor'),
  reference: document.getElementById('pixReferencia'),
  bank: document.getElementById('pixBanco'),
  holder: document.getElementById('pixTitular'),
  cpf: document.getElementById('pixCpf'),
  key: document.getElementById('pixChave'),
  status: document.getElementById('pixStatus'),
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showPixError(message) {
  pixLoading.textContent = message;
  pixLoading.classList.add('erro');
}

async function loadPixSimulation() {
  if (!pixReference) {
    showPixError('Link Pix inválido. Volte ao checkout e crie um novo pedido.');
    return;
  }

  try {
    const response = await fetch(`api.php?action=pix_detalhe&ref=${encodeURIComponent(pixReference)}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível carregar esta simulação.');

    const data = payload.data;
    pixElements.amount.textContent = formatCurrency(data.valor);
    pixElements.reference.textContent = data.referencia;
    pixElements.bank.textContent = data.banco_pagador;
    pixElements.holder.textContent = data.titular_pagador;
    pixElements.cpf.textContent = `***.***.***-${data.cpf_final4}`;
    pixElements.key.textContent = data.chave_demo;
    pixElements.status.textContent = data.status === 'aprovado' ? 'Simulação confirmada' : 'Pendente';
    pixConfirmButton.hidden = data.status === 'aprovado';
    document.getElementById('pixVoltarInicio').hidden = data.status !== 'aprovado';
    pixLoading.hidden = true;
    pixContent.hidden = false;
  } catch (error) {
    showPixError(error.message || 'Não foi possível carregar esta simulação.');
  }
}

pixConfirmButton.addEventListener('click', async () => {
  pixConfirmButton.disabled = true;
  pixMessage.textContent = 'Confirmando a simulação...';

  try {
    const response = await fetch('api.php?action=simular_pagamento_pix', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referencia: pixReference }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível confirmar a simulação.');
    pixElements.status.textContent = 'Simulação confirmada';
    pixMessage.textContent = payload.message;
    pixConfirmButton.hidden = true;
    document.getElementById('pixVoltarInicio').hidden = false;
  } catch (error) {
    pixMessage.textContent = error.message || 'Não foi possível confirmar a simulação.';
    pixConfirmButton.disabled = false;
  }
});

loadPixSimulation();