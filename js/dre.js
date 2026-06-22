const tabelaDre = document.getElementById('tabela-dre');
const inputDreMes = document.getElementById('dre-mes');
const btnDreGerar = document.getElementById('dre-gerar');

function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

inputDreMes.value = mesAtualISO();

function gerarDre() {
  const mes = inputDreMes.value; // formato YYYY-MM
  if (!mes) return;

  const receitas = (window.contasReceberCache || []).filter(
    (c) => c.status === 'recebido' && c.dataRecebimento && c.dataRecebimento.startsWith(mes)
  );

  const despesas = (window.contasPagarCache || []).filter(
    (c) => c.status === 'pago' && c.dataPagamento && c.dataPagamento.startsWith(mes)
  );

  const totalReceita = receitas.reduce((soma, c) => soma + c.valor, 0);

  const despesasPorCategoria = {};
  despesas.forEach((c) => {
    despesasPorCategoria[c.categoria] = (despesasPorCategoria[c.categoria] || 0) + c.valor;
  });
  const totalDespesas = despesas.reduce((soma, c) => soma + c.valor, 0);

  const resultado = totalReceita - totalDespesas;

  let html = `
    <tr><td><strong>(+) Receita Bruta (serviços e produtos recebidos)</strong></td><td class="dre-positivo">${formatarMoeda(totalReceita)}</td></tr>
    <tr><td colspan="2"><strong>(-) Despesas</strong></td></tr>
  `;

  const categorias = Object.keys(despesasPorCategoria);
  if (categorias.length === 0) {
    html += `<tr><td colspan="2" class="vazio">Nenhuma despesa paga neste mês.</td></tr>`;
  } else {
    categorias.forEach((cat) => {
      html += `<tr><td>&nbsp;&nbsp;${cat}</td><td class="dre-negativo">${formatarMoeda(despesasPorCategoria[cat])}</td></tr>`;
    });
  }

  html += `
    <tr class="dre-total"><td>(=) Total de Despesas</td><td class="dre-negativo">${formatarMoeda(totalDespesas)}</td></tr>
    <tr class="dre-total"><td>(=) Resultado do Período</td><td class="${resultado >= 0 ? 'dre-positivo' : 'dre-negativo'}">${formatarMoeda(resultado)}</td></tr>
  `;

  tabelaDre.innerHTML = html;
}

btnDreGerar.addEventListener('click', gerarDre);

document.querySelector('a[data-pagina="dre"]').addEventListener('click', gerarDre);
