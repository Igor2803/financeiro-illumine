function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function hojeISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function statusVisual(status, vencimento) {
  if (status === 'pago' || status === 'recebido') {
    return { texto: status === 'pago' ? 'Pago' : 'Recebido', classe: status };
  }
  if (vencimento && vencimento < hojeISO()) {
    return { texto: 'Atrasado', classe: 'atrasado' };
  }
  return { texto: 'Pendente', classe: 'pendente' };
}
