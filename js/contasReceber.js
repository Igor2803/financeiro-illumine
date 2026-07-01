window.contasReceberCache = [];

const colecaoReceber = db.collection('contasReceber');

const formReceber = document.getElementById('form-receber');
const tabelaReceber = document.getElementById('tabela-receber');
const filtroStatusReceber = document.getElementById('receber-filtro-status');
const filtroMesReceber = document.getElementById('receber-filtro-mes');
const filtroBuscaReceber = document.getElementById('receber-filtro-busca');
const btnLimparMesReceber = document.getElementById('receber-limpar-mes');
const btnCancelarReceber = document.getElementById('receber-cancelar');

colecaoReceber.orderBy('vencimento').onSnapshot((snapshot) => {
  window.contasReceberCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderizarTabelaReceber();
  if (typeof atualizarDashboard === 'function') atualizarDashboard();
  if (typeof atualizarFluxoCaixa === 'function') atualizarFluxoCaixa();
});

function renderizarTabelaReceber() {
  const filtro = filtroStatusReceber.value;
  const mes = filtroMesReceber.value;
  const linhas = window.contasReceberCache
    .filter((c) => filtro === 'todos' || c.status === filtro)
    .filter((c) => !mes || (c.vencimento || '').startsWith(mes))
    .filter((c) => !filtroBuscaReceber.value || (c.descricao || '').toLowerCase().includes(filtroBuscaReceber.value.toLowerCase()))
    .map((c) => {
      const st = statusVisual(c.status, c.vencimento);
      const acaoStatus = c.status === 'recebido'
        ? `<button data-acao="reabrir" data-id="${c.id}" title="Marcar como pendente">↩️</button>`
        : `<button data-acao="receber" data-id="${c.id}" title="Marcar como recebido">✅</button>`;
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

  tabelaReceber.innerHTML = linhas || `<tr><td colspan="6" class="vazio">Nenhuma conta encontrada.</td></tr>`;
}

filtroStatusReceber.addEventListener('change', renderizarTabelaReceber);
filtroMesReceber.addEventListener('change', renderizarTabelaReceber);
filtroBuscaReceber.addEventListener('input', renderizarTabelaReceber);
btnLimparMesReceber.addEventListener('click', () => {
  filtroMesReceber.value = '';
  filtroBuscaReceber.value = '';
  renderizarTabelaReceber();
});

formReceber.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('receber-id').value;
  const dados = {
    descricao: document.getElementById('receber-descricao').value.trim(),
    categoria: document.getElementById('receber-categoria').value,
    valor: parseFloat(document.getElementById('receber-valor').value),
    vencimento: document.getElementById('receber-vencimento').value,
  };

  if (id) {
    await colecaoReceber.doc(id).update(dados);
  } else {
    dados.status = 'pendente';
    dados.criadoEm = new Date().toISOString();
    await colecaoReceber.add(dados);
  }

  formReceber.reset();
  document.getElementById('receber-id').value = '';
  btnCancelarReceber.style.display = 'none';
});

btnCancelarReceber.addEventListener('click', () => {
  formReceber.reset();
  document.getElementById('receber-id').value = '';
  btnCancelarReceber.style.display = 'none';
});

tabelaReceber.addEventListener('click', async (e) => {
  const botao = e.target.closest('button');
  if (!botao) return;

  const { acao, id } = botao.dataset;
  const conta = window.contasReceberCache.find((c) => c.id === id);
  if (!conta) return;

  if (acao === 'receber') {
    await colecaoReceber.doc(id).update({ status: 'recebido', dataRecebimento: conta.vencimento });
  } else if (acao === 'reabrir') {
    await colecaoReceber.doc(id).update({ status: 'pendente', dataRecebimento: firebase.firestore.FieldValue.delete() });
  } else if (acao === 'excluir') {
    if (confirm(`Excluir a conta "${conta.descricao}"?`)) {
      await colecaoReceber.doc(id).delete();
    }
  } else if (acao === 'editar') {
    document.getElementById('receber-id').value = conta.id;
    document.getElementById('receber-descricao').value = conta.descricao;
    document.getElementById('receber-categoria').value = conta.categoria;
    document.getElementById('receber-valor').value = conta.valor;
    document.getElementById('receber-vencimento').value = conta.vencimento;
    btnCancelarReceber.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
