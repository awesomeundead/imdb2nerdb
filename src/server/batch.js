import { requireConfig } from "../config.js";

const readBody = req => new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => data += c);
    req.on("end", () => resolve(data));
    req.on("error", reject);
});

/**
 * Esqueleto comum das rotas em lote (resposta NDJSON, uma linha por item).
 *  - requires:    chaves de config exigidas quando não é dry-run
 *  - validate:    (parsed) => void — validação extra do JSON, opcional
 *  - describe:    (item) => campos que identificam o item nas respostas de erro
 *  - processItem: (item, { dryRun, parsed }) => objeto enviado ao cliente
 */
export async function handleBatch(req, res, { requires, validate, describe, processItem }) {
    res.writeHead(200, { "Content-Type": "application/x-ndjson" });
    const send = obj => res.write(JSON.stringify(obj) + "\n");

    try {
        const { json, dryRun } = JSON.parse(await readBody(req));
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        const items = Array.isArray(parsed) ? parsed : parsed?.items;
        if (!Array.isArray(items)) throw new Error('JSON precisa ter "items" (array).');

        validate?.(parsed);
        if (!dryRun) requireConfig(...requires);

        for (const item of items) {
            try {
                send(await processItem(item, { dryRun, parsed }));
            } catch (err) {
                send({ ...describe(item), ok: false, error: err.message });
            }
        }
    } catch (err) {
        send({ ok: false, error: err.message });
    }
    res.end();
}
