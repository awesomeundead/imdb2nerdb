import "dotenv/config";
import http from "http";
import fs from "fs/promises";
import path from "path";
import { getMovie } from "./scraper.js";
import { parseCast } from "./parser.js";
import { sendCast } from "./sender.js";

const PORT = 3000;
const CAST_API_URL = process.env.NERDB_CAST_API_URL;
const API_KEY = process.env.NERDB_API_KEY;
const CACHE_DIR = "./downloads";

async function getCast(imdb) {
    const cachePath = path.join(CACHE_DIR, `cast/${imdb}.cast.json`);

    try {
        const cached = JSON.parse(await fs.readFile(cachePath, "utf-8"));
        if (Array.isArray(cached) && cached.length) return { cast: cached, fromCache: true };
    } catch {
        // sem cache (ou arquivo inválido): raspa de novo
    }

    const html = await getMovie(`https://www.imdb.com/pt/title/${imdb}/`);
    const cast = parseCast(html);

    if (cast.length) {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(cast, null, 2), "utf-8");
    }
    return { cast, fromCache: false };
}

const readBody = req => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => resolve(data));
    req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(await fs.readFile('./public/index.html'));
    }

    if (req.method === 'POST' && req.url === '/run') {
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        const send = obj => res.write(JSON.stringify(obj) + '\n');

        try {
            const { json, dryRun } = JSON.parse(await readBody(req));
            const parsed = typeof json === 'string' ? JSON.parse(json) : json;
            const items = Array.isArray(parsed) ? parsed : parsed.items;
            if (!Array.isArray(items)) throw new Error('JSON precisa ter "items" (array).');
            if (!dryRun && (!API_KEY || !CAST_API_URL)) throw new Error('NERDB_API_KEY / NERDB_CAST_API_URL não definidas no .env.');

            for (const { id, imdb } of items) {
                try {
                    if (!id || !imdb) throw new Error('item sem id ou imdb');
                    const { cast, fromCache } = await getCast(imdb);
                    if (!cast.length) throw new Error('elenco vazio');
                    if (!dryRun) await sendCast(id, cast, CAST_API_URL, API_KEY);
                    send({ id, imdb, ok: true, fromCache, count: cast.length, cast: dryRun ? cast : undefined });
                } catch (err) {
                    send({ id, imdb, ok: false, error: err.message });
                }
            }
        } catch (err) {
            send({ ok: false, error: err.message });
        }
        return res.end();
    }

    res.writeHead(404).end();
});

// 127.0.0.1: só acessível da sua máquina, já que o servidor usa sua API key
server.listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));