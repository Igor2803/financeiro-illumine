window.contasPagarCache = [];

const colecaoPagar = db.collection('contasPagar');

const formPagar = document.getElementById('form-pagar');
const tabelaPagar = document.getElementById('tabela-pagar');
const filtroStatusPagar = document.getElementById('pagar-filtro-status');
const filtroCategoriaPagar = document.getElementById('pagar-filtro-categoria');
const filtroAnoPagar = document.getElementById('pagar-filtro-ano');
const filtroMesPagar = document.getElementById('pagar-filtro-mes');
const filtroBuscaPagar = document.getElementById('pagar-filtro-busca');
const btnLimparMesPagar = document.getElementById('pagar-limpar-mes');
const btnCancelarPagar = document.getElementById('pagar-cancelar');

colecaoPagar.orderBy('vencimento').onSnapshot((snapshot) => {
  window.contasPagarCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderizarTabelaPagar();
  if (typeof atualizarDashboard === 'function') atualizarDashboard();
  if (typeof atualizarFluxoCaixa === 'function') atualizarFluxoCaixa();
});

function renderizarTabelaPagar() {
  const filtro = filtroStatusPagar.value;
  const cat = filtroCategoriaPagar.value;
  const ano = filtroAnoPagar.value;
  const mes = filtroMesPagar.value;
  const linhas = window.contasPagarCache
    .filter((c) => filtro === 'todos' || c.status === filtro)
    .filter((c) => !cat || c.categoria === cat)
    .filter((c) => {
      const v = c.vencimento || '';
      if (ano && mes) return v.startsWith(`${ano}-${mes}`);
      if (ano) return v.startsWith(ano);
      if (mes) return v.slice(5, 7) === mes;
      return true;
    })
    .filter((c) => !filtroBuscaPagar.value || (c.descricao || '').toLowerCase().includes(filtroBuscaPagar.value.toLowerCase()))
    .map((c) => {
      const st = statusVisual(c.status, c.vencimento);
      const acaoStatus = c.status === 'pago'
        ? `<button data-acao="reabrir" data-id="${c.id}" title="Marcar como pendente">↩️</button>`
        : `<button data-acao="pagar" data-id="${c.id}" title="Marcar como pago">✅</button>`;
      return `
        <tr>
          <td>${c.descricao}</td>
          <td>${c.categoria}</td>
          <td>${formatarDataBR(c.vencimento)}</td>
          <td>${formatarMoeda(c.valor)}</td>
          <td><span class="badge ${st.classe}">${st.texto}</span></td>
          <td class="acoes">
            ${acaoStatus}
            <button data-acao="editar" data-id="${c.id}" title="Editar">✏️</button>
            <button data-acao="excluir" data-id="${c.id}" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    })
    .join('');

  tabelaPagar.innerHTML = linhas || `<tr><td colspan="6" class="vazio">Nenhuma conta encontrada.</td></tr>`;
}

filtroStatusPagar.addEventListener('change', renderizarTabelaPagar);
filtroCategoriaPagar.addEventListener('change', renderizarTabelaPagar);
filtroAnoPagar.addEventListener('change', renderizarTabelaPagar);
filtroMesPagar.addEventListener('change', renderizarTabelaPagar);
filtroBuscaPagar.addEventListener('input', renderizarTabelaPagar);
btnLimparMesPagar.addEventListener('click', () => {
  filtroCategoriaPagar.value = '';
  filtroAnoPagar.value = '';
  filtroMesPagar.value = '';
  filtroBuscaPagar.value = '';
  renderizarTabelaPagar();
});

formPagar.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('pagar-id').value;
  const dados = {
    descricao: document.getElementById('pagar-descricao').value.trim(),
    categoria: document.getElementById('pagar-categoria').value,
    valor: parseFloat(document.getElementById('pagar-valor').value),
    vencimento: document.getElementById('pagar-vencimento').value,
  };

  if (id) {
    await colecaoPagar.doc(id).update(dados);
  } else {
    dados.status = 'pendente';
    dados.criadoEm = new Date().toISOString();
    await colecaoPagar.add(dados);
  }

  formPagar.reset();
  document.getElementById('pagar-id').value = '';
  btnCancelarPagar.style.display = 'none';
});

btnCancelarPagar.addEventListener('click', () => {
  formPagar.reset();
  document.getElementById('pagar-id').value = '';
  btnCancelarPagar.style.display = 'none';
});

tabelaPagar.addEventListener('click', async (e) => {
  const botao = e.target.closest('button');
  if (!botao) return;

  const { acao, id } = botao.dataset;
  const conta = window.contasPagarCache.find((c) => c.id === id);
  if (!conta) return;

  if (acao === 'pagar') {
    await colecaoPagar.doc(id).update({ status: 'pago', dataPagamento: conta.vencimento });
  } else if (acao === 'reabrir') {
    await colecaoPagar.doc(id).update({ status: 'pendente', dataPagamento: firebase.firestore.FieldValue.delete() });
  } else if (acao === 'excluir') {
    if (confirm(`Excluir a conta "${conta.descricao}"?`)) {
      await colecaoPagar.doc(id).delete();
    }
  } else if (acao === 'editar') {
    document.getElementById('pagar-id').value = conta.id;
    document.getElementById('pagar-descricao').value = conta.descricao;
    document.getElementById('pagar-categoria').value = conta.categoria;
    document.getElementById('pagar-valor').value = conta.valor;
    document.getElementById('pagar-vencimento').value = conta.vencimento;
    btnCancelarPagar.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
