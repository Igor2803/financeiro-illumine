const dropZone = document.getElementById('drop-zone');
const checkTodos = document.getElementById('check-todos');
const catPadraoEntrada = document.getElementById('cat-padrao-entrada');
const catPadraoSaida = document.getElementById('cat-padrao-saida');
const btnAplicarEntrada = document.getElementById('aplicar-cat-entrada');
const btnAplicarSaida = document.getElementById('aplicar-cat-saida');

btnAplicarEntrada.addEventListener('click', () => {
  linhasParseadas.forEach((r) => { if (r.tipo === 'Entrada') r.categoria = catPadraoEntrada.value; });
  renderizarPreview();
});

btnAplicarSaida.addEventListener('click', () => {
  linhasParseadas.forEach((r) => { if (r.tipo === 'Saída') r.categoria = catPadraoSaida.value; });
  renderizarPreview();
});
const inputCSV = document.getElementById('input-csv');
const previewWrap = document.getElementById('import-preview-wrap');
const tabelaPreview = document.getElementById('tabela-preview');
const btnImportar = document.getElementById('btn-importar');
const importStatus = document.getElementById('import-status');
const importContador = document.getElementById('import-contador');

let linhasParseadas = [];

// ---------- DRAG & DROP ----------
dropZone.addEventListener('click', () => inputCSV.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processarArquivo(file);
});

inputCSV.addEventListener('change', () => {
  if (inputCSV.files[0]) processarArquivo(inputCSV.files[0]);
});

// ---------- PARSING ----------
function detectarSeparador(texto) {
  const primeiraLinha = texto.split('\n')[0];
  const pontoVirgulas = (primeiraLinha.match(/;/g) || []).length;
  const virgulas = (primeiraLinha.match(/,/g) || []).length;
  return pontoVirgulas >= virgulas ? ';' : ',';
}

function parsearValorBR(str) {
  if (!str) return 0;
  // Remove espaços e R$
  str = str.trim().replace(/R\$\s*/g, '');
  // Formato BR: 1.386,90 → 1386.90
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  return parseFloat(str) || 0;
}

function parsearDataBR(str) {
  // "30/06/2026 20:29" → "2026-06-30"
  if (!str) return '';
  const match = str.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // Já no formato ISO
  const iso = str.trim().match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return '';
}

function processarArquivo(file) {
  importStatus.textContent = '';
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const texto = e.target.result;
      const sep = detectarSeparador(texto);
      const linhas = texto.split(/\r?\n/).filter((l) => l.trim());

      // Detectar linha de cabeçalho
      let inicio = 0;
      const primeiraLinha = linhas[0].toLowerCase();
      if (
        primeiraLinha.includes('moviment') ||
        primeiraLinha.includes('tipo') ||
        primeiraLinha.includes('valor')
      ) {
        inicio = 1;
      }

      linhasParseadas = [];

      for (let i = inicio; i < linhas.length; i++) {
        const colunas = linhas[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
        if (colunas.length < 5) continue;

        // Mapeamento de colunas Stone:
        // A=Movimentação, B=Tipo, C=Valor, D=Tarifa, E=Data, F=Situação, G=Destino, H=valor total, I=Origem
        const movimentacao = colunas[0] || '';
        const tipo = colunas[1] || '';
        const valorBruto = parsearValorBR(colunas[2]);
        const tarifaRaw = colunas[3] || '';
        const tarifa = tarifaRaw.toLowerCase() === 'grátis' || tarifaRaw === '' ? 0 : parsearValorBR(tarifaRaw);
        const data = parsearDataBR(colunas[4] || colunas[3]);
        const destino = colunas[6] || colunas[5] || '';
        const origem = colunas[8] || '';

        if (!data) continue;

        const isCredito =
          movimentacao.toLowerCase() === 'crédito' ||
          movimentacao.toLowerCase() === 'credito' ||
          valorBruto > 0;

        // Valor líquido (coluna C) + observação de taxa quando houver
        const valorLiquido = Math.abs(valorBruto);
        const descBase = destino || origem || tipo || 'Importado';
        const desc = tarifa > 0
          ? `${descBase} [Taxa Stone: ${formatarMoeda(tarifa)}]`
          : descBase;

        // Categoria automática
        let categoria;
        if (isCredito) {
          if (tipo.toLowerCase().includes('transação') || tipo.toLowerCase().includes('transacao')) {
            categoria = 'Serviços';
          } else {
            categoria = 'Serviços';
          }
        } else {
          if (tipo.toLowerCase().includes('pix')) categoria = 'Outros';
          else if (tipo.toLowerCase().includes('transação') || tipo.toLowerCase().includes('transacao')) categoria = 'Outros';
          else categoria = 'Outros';
        }

        linhasParseadas.push({
          selecionado: true,
          tipo: isCredito ? 'Entrada' : 'Saída',
          descricao: desc,
          categoria,
          valor: valorLiquido,
          tarifa,
          data,
        });
      }

      renderizarPreview();
    } catch (err) {
      importStatus.textContent = 'Erro ao ler o arquivo. Verifique se é um CSV válido.';
      console.error(err);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function renderizarPreview() {
  if (linhasParseadas.length === 0) {
    importStatus.textContent = 'Nenhum registro encontrado no arquivo.';
    previewWrap.style.display = 'none';
    return;
  }

  previewWrap.style.display = 'block';
  atualizarContador();

  tabelaPreview.innerHTML = linhasParseadas
    .map(
      (r, i) => `
      <tr class="${r.selecionado ? '' : 'row-desmarcada'}">
        <td><input type="checkbox" data-idx="${i}" ${r.selecionado ? 'checked' : ''}></td>
        <td><span class="badge ${r.tipo === 'Entrada' ? 'recebido' : 'atrasado'}">${r.tipo}</span></td>
        <td contenteditable="true" data-field="descricao" data-idx="${i}">${r.descricao}</td>
        <td>
          <select data-field="categoria" data-idx="${i}">
            ${categoriasOpcoes(r.tipo, r.categoria)}
          </select>
        </td>
        <td>${formatarMoeda(r.valor)}</td>
        <td>${formatarDataBR(r.data)}</td>
      </tr>`
    )
    .join('');

  // Selecionar/desmarcar todos
  checkTodos.checked = true;
  checkTodos.onchange = (e) => {
    linhasParseadas.forEach((r) => (r.selecionado = e.target.checked));
    renderizarPreview();
  };

  // Listeners de checkbox
  tabelaPreview.querySelectorAll('input[type=checkbox]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      linhasParseadas[idx].selecionado = e.target.checked;
      const tr = e.target.closest('tr');
      tr.classList.toggle('row-desmarcada', !e.target.checked);
      atualizarContador();
    });
  });

  // Listeners de categoria
  tabelaPreview.querySelectorAll('select[data-field=categoria]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      linhasParseadas[idx].categoria = e.target.value;
    });
  });

  // Listeners de descricao
  tabelaPreview.querySelectorAll('[data-field=descricao]').forEach((el) => {
    el.addEventListener('blur', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      linhasParseadas[idx].descricao = e.target.textContent.trim();
    });
  });
}

function categoriasOpcoes(tipo, selecionada) {
  const categoriasPagar = ['Aluguel','Produtos','Energia','Água','Internet','Salários/Comissões','Marketing','Manutenção','Impostos','Outros'];
  const categoriasReceber = ['Serviços','Produtos vendidos','Pacotes/Assinaturas','Outros'];
  const lista = tipo === 'Entrada' ? categoriasReceber : categoriasPagar;
  return lista.map((c) => `<option ${c === selecionada ? 'selected' : ''}>${c}</option>`).join('');
}

function atualizarContador() {
  const total = linhasParseadas.filter((r) => r.selecionado).length;
  importContador.textContent = `${total} registro(s) selecionado(s)`;
}

// ---------- IMPORTAR ----------
btnImportar.addEventListener('click', async () => {
  const selecionados = linhasParseadas.filter((r) => r.selecionado);
  if (selecionados.length === 0) {
    importStatus.textContent = 'Selecione ao menos um registro.';
    return;
  }

  btnImportar.disabled = true;
  btnImportar.textContent = 'Importando...';
  importStatus.textContent = '';

  try {
    const batch = db.batch();

    for (const r of selecionados) {
      if (r.tipo === 'Entrada') {
        const ref = db.collection('contasReceber').doc();
        batch.set(ref, {
          descricao: r.descricao,
          categoria: r.categoria,
          valor: r.valor,
          ...(r.tarifa > 0 && { taxaStone: r.tarifa }),
          vencimento: r.data,
          status: 'recebido',
          dataRecebimento: r.data,
          criadoEm: new Date().toISOString(),
          importado: true,
        });
      } else {
        const ref = db.collection('contasPagar').doc();
        batch.set(ref, {
          descricao: r.descricao,
          categoria: r.categoria,
          valor: r.valor,
          ...(r.tarifa > 0 && { taxaStone: r.tarifa }),
          vencimento: r.data,
          status: 'pago',
          dataPagamento: r.data,
          criadoEm: new Date().toISOString(),
          importado: true,
        });
      }
    }

    await batch.commit();

    importStatus.textContent = `✅ ${selecionados.length} registros importados com sucesso!`;
    importStatus.style.color = '#2b8a3e';
    linhasParseadas = [];
    previewWrap.style.display = 'none';
    inputCSV.value = '';
  } catch (err) {
    importStatus.textContent = 'Erro ao importar. Tente novamente.';
    importStatus.style.color = '#c92a2a';
    console.error(err);
  } finally {
    btnImportar.disabled = false;
    btnImportar.textContent = 'Importar registros';
  }
});
