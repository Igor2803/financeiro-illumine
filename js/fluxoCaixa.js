const tabelaFluxo = document.getElementById('tabela-fluxo');
const inputFluxoInicio = document.getElementById('fluxo-data-inicio');
const inputFluxoFim = document.getElementById('fluxo-data-fim');
const btnFluxoFiltrar = document.getElementById('fluxo-filtrar');

function primeiroDiaDoMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

inputFluxoInicio.value = primeiroDiaDoMes();
inputFluxoFim.value = hojeISO();

function movimentosRealizados() {
  const entradas = (window.contasReceberCache || [])
    .filter((c) => c.status === 'recebido')
    .map((c) => ({
      data: c.dataRecebimento,
      tipo: 'Entrada',
      descricao: c.descricao,
      categoria: c.categoria,
      valor: c.valor,
    }));

  const saidas = (window.contasPagarCache || [])
    .filter((c) => c.status === 'pago')
    .map((c) => ({
      data: c.dataPagamento,
      tipo: 'Saída',
      descricao: c.descricao,
      categoria: c.categoria,
      valor: -c.valor,
    }));

  return [...entradas, ...saidas].sort((a, b) => (a.data > b.data ? 1 : -1));
}

function atualizarFluxoCaixa() {
  const inicio = inputFluxoInicio.value;
  const fim = inputFluxoFim.value;

  const movimentos = movimentosRealizados().filter(
    (m) => m.data && (!inicio || m.data >= inicio) && (!fim || m.data <= fim)
  );

  let saldo = 0;
  let totalEntradas = 0;
  let totalSaidas = 0;

  const linhas = movimentos.map((m) => {
    saldo += m.valor;
    if (m.valor >= 0) totalEntradas += m.valor; else totalSaidas += -m.valor;
    return `
      <tr>
        <td>${formatarDataBR(m.data)}</td>
        <td>${m.tipo}</td>
        <td>${m.descricao}</td>
        <td>${m.categoria}</td>
        <td class="${m.valor >= 0 ? 'dre-positivo' : 'dre-negativo'}">${formatarMoeda(m.valor)}</td>
        <td>${formatarMoeda(saldo)}</td>
      </tr>`;
  });

  tabelaFluxo.innerHTML = linhas.join('') || `<tr><td colspan="6" class="vazio">Nenhum movimento no período.</td></tr>`;

  document.getElementById('fluxo-entradas').textContent = formatarMoeda(totalEntradas);
  document.getElementById('fluxo-saidas').textContent = formatarMoeda(totalSaidas);
  document.getElementById('fluxo-saldo').textContent = formatarMoeda(totalEntradas - totalSaidas);
}

btnFluxoFiltrar.addEventListener('click', atualizarFluxoCaixa);
