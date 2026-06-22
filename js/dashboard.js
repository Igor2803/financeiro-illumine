const tabelaProximos = document.getElementById('tabela-proximos');
const inputDashboardMes = document.getElementById('dashboard-mes');
const btnDashboardFiltrar = document.getElementById('dashboard-filtrar');

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PALETA_GRAFICO = ['#b8860b', '#d4af37', '#8a6d1f', '#e8c766', '#6b5212', '#c92a2a', '#495057', '#2b8a3e', '#a67c00', '#7a5c00'];

let graficoEntradasSaidas = null;
let graficoDespesasCategoria = null;

inputDashboardMes.value = hojeISO().slice(0, 7);

function mesesAteRef(mesRef, quantidade) {
  const [ano, mes] = mesRef.split('-').map(Number);
  const lista = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return lista;
}

function rotuloMes(mesISO) {
  const [ano, mes] = mesISO.split('-').map(Number);
  return `${NOMES_MES[mes - 1]}/${String(ano).slice(2)}`;
}

function atualizarDashboard() {
  const pagar = window.contasPagarCache || [];
  const receber = window.contasReceberCache || [];
  const mesSelecionado = inputDashboardMes.value || hojeISO().slice(0, 7);

  const totalAReceber = receber
    .filter((c) => c.status === 'pendente')
    .reduce((soma, c) => soma + c.valor, 0);

  const totalAPagar = pagar
    .filter((c) => c.status === 'pendente')
    .reduce((soma, c) => soma + c.valor, 0);

  const entradasMes = receber
    .filter((c) => c.status === 'recebido' && c.dataRecebimento && c.dataRecebimento.startsWith(mesSelecionado))
    .reduce((soma, c) => soma + c.valor, 0);
  const saidasMes = pagar
    .filter((c) => c.status === 'pago' && c.dataPagamento && c.dataPagamento.startsWith(mesSelecionado))
    .reduce((soma, c) => soma + c.valor, 0);

  document.getElementById('resumo-a-receber').textContent = formatarMoeda(totalAReceber);
  document.getElementById('resumo-a-pagar').textContent = formatarMoeda(totalAPagar);
  document.getElementById('resumo-saldo').textContent = formatarMoeda(entradasMes - saidasMes);

  const pendentes = [
    ...receber.filter((c) => c.status === 'pendente').map((c) => ({ ...c, tipo: 'Receber' })),
    ...pagar.filter((c) => c.status === 'pendente').map((c) => ({ ...c, tipo: 'Pagar' })),
  ]
    .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1))
    .slice(0, 8);

  tabelaProximos.innerHTML = pendentes
    .map((c) => {
      const st = statusVisual(c.status, c.vencimento);
      return `
        <tr>
          <td>${c.tipo}</td>
          <td>${c.descricao}</td>
          <td>${formatarDataBR(c.vencimento)}</td>
          <td>${formatarMoeda(c.valor)}</td>
          <td><span class="badge ${st.classe}">${st.texto}</span></td>
        </tr>`;
    })
    .join('') || `<tr><td colspan="5" class="vazio">Nenhuma conta pendente.</td></tr>`;

  atualizarGraficoEntradasSaidas(pagar, receber, mesSelecionado);
  atualizarGraficoDespesasCategoria(pagar, mesSelecionado);
}

function atualizarGraficoEntradasSaidas(pagar, receber, mesSelecionado) {
  const meses = mesesAteRef(mesSelecionado, 6);
  const entradasPorMes = meses.map((m) =>
    receber
      .filter((c) => c.status === 'recebido' && c.dataRecebimento && c.dataRecebimento.startsWith(m))
      .reduce((soma, c) => soma + c.valor, 0)
  );
  const saidasPorMes = meses.map((m) =>
    pagar
      .filter((c) => c.status === 'pago' && c.dataPagamento && c.dataPagamento.startsWith(m))
      .reduce((soma, c) => soma + c.valor, 0)
  );

  const ctx = document.getElementById('grafico-entradas-saidas');
  if (graficoEntradasSaidas) graficoEntradasSaidas.destroy();
  graficoEntradasSaidas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses.map(rotuloMes),
      datasets: [
        { label: 'Entradas', data: entradasPorMes, backgroundColor: '#2b8a3e' },
        { label: 'Saídas', data: saidasPorMes, backgroundColor: '#c92a2a' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function atualizarGraficoDespesasCategoria(pagar, mesSelecionado) {
  const despesasMes = pagar.filter(
    (c) => c.status === 'pago' && c.dataPagamento && c.dataPagamento.startsWith(mesSelecionado)
  );

  const porCategoria = {};
  despesasMes.forEach((c) => {
    porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + c.valor;
  });
  const categorias = Object.keys(porCategoria);

  const ctx = document.getElementById('grafico-despesas-categoria');
  if (graficoDespesasCategoria) graficoDespesasCategoria.destroy();
  graficoDespesasCategoria = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categorias.length ? categorias : ['Sem despesas pagas'],
      datasets: [{
        data: categorias.length ? categorias.map((c) => porCategoria[c]) : [1],
        backgroundColor: categorias.length ? PALETA_GRAFICO : ['#e9ecef'],
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

inputDashboardMes.addEventListener('change', atualizarDashboard);
btnDashboardFiltrar.addEventListener('click', atualizarDashboard);
