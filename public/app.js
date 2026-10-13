/**
 * Comportamento comum das páginas de envio em lote.
 *  - endpoint:    rota POST do servidor (NDJSON)
 *  - formatOk:    (r) => texto da linha de sucesso
 *  - formatError: (r) => texto da linha de erro (opcional)
 */
function setupBatchPage({ endpoint, formatOk, formatError }) {
  const log = document.getElementById('log');
  const runBtn = document.getElementById('run');

  const add = (text, cls) => {
    const div = document.createElement('div');
    div.textContent = text;
    if (cls) div.className = cls;
    log.appendChild(div);
  };

  runBtn.onclick = async () => {
    runBtn.disabled = true;
    log.textContent = '';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: document.getElementById('json').value,
          dryRun: document.getElementById('dry').checked
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleLine = line => {
        const r = JSON.parse(line);
        if (r.ok) add(formatOk(r), 'ok');
        else add(formatError ? formatError(r) : `✖ ${r.error}`, 'err');

        // Em modo "só simular" o servidor devolve o que seria enviado
        const extra = r.cast ?? r.movie ?? r.payload;
        if (extra) add(JSON.stringify(extra, null, 2));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        lines.filter(Boolean).forEach(handleLine);
      }

      add('Concluído.');
    } catch (err) {
      add('Erro: ' + err.message, 'err');
    } finally {
      runBtn.disabled = false;
    }
  };
}
