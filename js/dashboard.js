const tabelaProximos = document.getElementById('tabela-proximos');
const inputDashDe = document.getElementById('dashboard-de');
const inputDashAte = document.getElementById('dashboard-ate');

const NOMES_MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const PALETA_GRAFICO = ['#b8860b','#2b8a3e','#c92a2a','#d4af37','#495057','#e8c766','#8a6d1f','#6b5212','#a67c00','#7a5c00'];

let graficoEntradasSaidas = null;
let graficoDespesasCategoria = null;
let graficoTopEntrada = null;
let graficoTopSaida = null;

function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesAnteriorISO(mesISO, n) {
  const [ano, mes] = mesISO.split('-').map(Number);
  const d = new Date(ano, mes - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function rotuloMes(mesISO) {
  const [ano, mes] = mesISO.split('-').map(Number);
  return `${NOMES_MES[mes - 1]}/${String(ano).slice(2)}`;
}

function mesesNoIntervalo(de, ate) {
  const lista = [];
  let cur = de;
  while (cur <= ate) {
    lista.push(cur);
    const [ano, mes] = cur.split('-').map(Number);
    const prox = new Date(ano, mes, 1);
    cur = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}`;
  }
  return lista;
}

// Inicializa filtros com "últimos 6 meses"
const hoje = mesAtualISO();
inputDashDe.value = mesAnteriorISO(hoje, 5);
inputDashAte.value = hoje;

// Presets
document.querySelectorAll('.dash-preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-preset').forEach((b) => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    const meses = parseInt(btn.dataset.meses);
    inputDashAte.value = hoje;
    inputDashDe.value = mesAnteriorISO(hoje, meses - 1);
    atualizarDashboard();
  });
});

inputDashDe.addEventListener('change', atualizarDashboard);
inputDashAte.addEventListener('change', atualizarDashboard);

function atualizarDashboard() {
  const pagar = window.contasPagarCache || [];
  const receber = window.contasReceberCache || [];
  const de = inputDashDe.value;
  const ate = inputDashAte.value;
  if (!de || !ate) return;

  // Cards: totais do intervalo usando vencimento como referência
  const totalAReceber = receber
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + c.valor, 0);
  const totalAPagar = pagar
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + c.valor, 0);

  const entradasIntervalo = receber
    .filter((c) => c.status === 'recebido' && c.vencimento >= de + '-01' && c.vencimento <= ate + '-31')
    .reduce((s, c) => s + c.valor, 0);
  const saidasIntervalo = pagar
    .filter((c) => c.status === 'pago' && c.vencimento >= de + '-01' && c.vencimento <= ate + '-31')
    .reduce((s, c) => s + c.valor, 0);

  const receitaBruta = entradasIntervalo + receber
    .filter((c) => c.status === 'recebido' && (c.taxaStone || 0) > 0 && (c.vencimento || '') >= de + '-01' && (c.vencimento || '') <= ate + '-31')
    .reduce((s, c) => s + (c.taxaStone || 0), 0);

  document.getElementById('resumo-a-receber').textContent = formatarMoeda(totalAReceber);
  document.getElementById('resumo-a-pagar').textContent = formatarMoeda(totalAPagar);
  document.getElementById('resumo-saldo').textContent = formatarMoeda(entradasIntervalo - saidasIntervalo);
  document.getElementById('resumo-saldo').style.color =
    entradasIntervalo - saidasIntervalo >= 0 ? '#2b8a3e' : '#c92a2a';
  document.getElementById('resumo-bruto').textContent = formatarMoeda(receitaBruta);
  document.getElementById('resumo-liquido').textContent = formatarMoeda(entradasIntervalo);
  document.getElementById('resumo-saidas').textContent = formatarMoeda(saidasIntervalo);

  // Próximos vencimentos (pendentes, próximos 30 dias)
  const pendentes = [
    ...receber.filter((c) => c.status === 'pendente').map((c) => ({ ...c, _tipo: 'Receber' })),
    ...pagar.filter((c) => c.status === 'pendente').map((c) => ({ ...c, _tipo: 'Pagar' })),
  ]
    .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1))
    .slice(0, 8);

  tabelaProximos.innerHTML =
    pendentes
      .map((c) => {
        const st = statusVisual(c.status, c.vencimento);
        return `<tr>
          <td>${c._tipo}</td>
          <td>${c.descricao}</td>
          <td>${formatarDataBR(c.vencimento)}</td>
          <td>${formatarMoeda(c.valor)}</td>
          <td><span class="badge ${st.classe}">${st.texto}</span></td>
        </tr>`;
      })
      .join('') || `<tr><td colspan="5" class="vazio">Nenhuma conta pendente.</td></tr>`;

  atualizarGraficos(pagar, receber, de, ate);
  atualizarRanking(pagar, receber, de, ate);
}

function atualizarGraficos(pagar, receber, de, ate) {
  const meses = mesesNoIntervalo(de, ate);

  // Gráfico 1: Entradas x Saídas por mês (usando vencimento)
  const entradasPorMes = meses.map((m) =>
    receber
      .filter((c) => c.status === 'recebido' && (c.vencimento || '').startsWith(m))
      .reduce((s, c) => s + c.valor, 0)
  );
  const saidasPorMes = meses.map((m) =>
    pagar
      .filter((c) => c.status === 'pago' && (c.vencimento || '').startsWith(m))
      .reduce((s, c) => s + c.valor, 0)
  );
  const resultadoPorMes = meses.map((_, i) => entradasPorMes[i] - saidasPorMes[i]);

  const ctx1 = document.getElementById('grafico-entradas-saidas');
  if (graficoEntradasSaidas) graficoEntradasSaidas.destroy();
  graficoEntradasSaidas = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: meses.map(rotuloMes),
      datasets: [
        { label: 'Entradas', data: entradasPorMes, backgroundColor: '#2b8a3e' },
        { label: 'Saídas', data: saidasPorMes, backgroundColor: '#c92a2a' },
        {
          label: 'Resultado',
          data: resultadoPorMes,
          type: 'line',
          borderColor: '#b8860b',
          backgroundColor: 'rgba(184,134,11,0.1)',
          tension: 0.3,
          pointRadius: 4,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // Gráfico 2: Despesas por categoria no intervalo
  const despesasIntervalo = pagar.filter(
    (c) => c.status === 'pago' && (c.vencimento || '') >= de + '-01' && (c.vencimento || '') <= ate + '-31'
  );
  const porCategoria = {};
  despesasIntervalo.forEach((c) => {
    porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + c.valor;
  });
  const categorias = Object.keys(porCategoria);

  const ctx2 = document.getElementById('grafico-despesas-categoria');
  if (graficoDespesasCategoria) graficoDespesasCategoria.destroy();
  graficoDespesasCategoria = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: categorias.length ? categorias : ['Sem despesas'],
      datasets: [{
        data: categorias.length ? categorias.map((c) => porCategoria[c]) : [1],
        backgroundColor: categorias.length ? PALETA_GRAFICO.slice(0, categorias.length) : ['#e9ecef'],
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function topPorNome(lista, campo, n) {
  const mapa = {};
  lista.forEach((c) => {
    const nome = (c[campo] || 'Outros').replace(/\[Taxa Stone.*?\]/g, '').trim().slice(0, 30);
    mapa[nome] = (mapa[nome] || 0) + c.valor;
  });
  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function atualizarRanking(pagar, receber, de, ate) {
  const recebidosPeriodo = receber.filter(
    (c) => c.status === 'recebido' && (c.vencimento || '') >= de + '-01' && (c.vencimento || '') <= ate + '-31'
  );
  const pagosPeriodo = pagar.filter(
    (c) => c.status === 'pago' && (c.vencimento || '') >= de + '-01' && (c.vencimento || '') <= ate + '-31'
  );

  const topEntrada = topPorNome(recebidosPeriodo, 'descricao', 7);
  const topSaida = topPorNome(pagosPeriodo, 'descricao', 7);

  const opcoesBar = () => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { callback: (v) => 'R$ ' + v.toLocaleString('pt-BR') } },
    },
    elements: { bar: { borderRadius: 4 } },
  });

  const ctx3 = document.getElementById('grafico-top-entrada');
  if (graficoTopEntrada) graficoTopEntrada.destroy();
  graficoTopEntrada = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: topEntrada.map((e) => e[0]),
      datasets: [{ data: topEntrada.map((e) => e[1]), backgroundColor: '#2b8a3e' }],
    },
    options: opcoesBar(),
  });

  const ctx4 = document.getElementById('grafico-top-saida');
  if (graficoTopSaida) graficoTopSaida.destroy();
  graficoTopSaida = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: topSaida.map((e) => e[0]),
      datasets: [{ data: topSaida.map((e) => e[1]), backgroundColor: '#c92a2a' }],
    },
    options: opcoesBar(),
  });
}
