import "dotenv/config";
import http from "http";
import fs from "fs/promises";
import path from "path";
import { getMovie } from "./scraper.js";
import { parseMovie, extractImdbId } from "./parser.js";
import { sendCast, sendMovie } from "./sender.js";

const PORT = 3000;
const CAST_API_URL = process.env.NERDB_CAST_API_URL;
const MOVIE_API_URL = process.env.NERDB_MOVIE_API_URL;
const API_KEY = process.env.NERDB_API_KEY;
const CACHE_DIR = "./cache";

/**
 * Busca o filme no cache unificado ou faz o scraping se não existir.
 * O arquivo salvo em ./cache/{imdbId}.json contém tanto os dados do filme quanto o elenco.
 */
async function getOrFetchMovie(imdbInput) {
    const imdbId = extractImdbId(imdbInput) || imdbInput;
    const cachePath = path.join(CACHE_DIR, `${imdbId}.json`);
    const targetUrl = imdbInput.startsWith('http') ? imdbInput : `https://www.imdb.com/pt/title/${imdbId}/`;

    try {
        const cached = JSON.parse(await fs.readFile(cachePath, "utf-8"));
        // Valida se o cache possui os dados essenciais e o elenco
        if (cached && cached.title && Array.isArray(cached.cast)) {
            return { movie: cached, fromCache: true };
        }
    } catch {
        // Cache não existe ou é inválido, prossegue para o scraping
    }

    const html = await getMovie(targetUrl);
    const movieData = parseMovie(html);
    movieData['title_us'] = '';
    movieData['imdb'] = targetUrl;

    if (movieData.title) {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(movieData, null, 2), "utf-8");
    }
    return { movie: movieData, fromCache: false };
}

const readBody = req => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => resolve(data));
    req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/cast') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(await fs.readFile('./public/cast.html'));
    }

    if (req.method === 'GET' && req.url === '/movies') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(await fs.readFile('./public/movies.html'));
    }

    // Endpoint para envio de Elenco (/run)
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
                    const { movie, fromCache } = await getOrFetchMovie(imdb);
                    
                    // Converte o formato de elenco do cache unificado para o formato esperado pelo sendCast, se necessário
                    const cast = (movie.cast || []).map(c => ({
                        name: c.actor,
                        characters: c.character ? c.character.split(' / ') : []
                    }));

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

    // Endpoint para envio de Filmes (/run-movies)
    if (req.method === 'POST' && req.url === '/run-movies') {
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        const send = obj => res.write(JSON.stringify(obj) + '\n');

        try {
            const { json, dryRun } = JSON.parse(await readBody(req));
            const parsed = typeof json === 'string' ? JSON.parse(json) : json;
            const items = Array.isArray(parsed) ? parsed : parsed.items;
            if (!Array.isArray(items)) throw new Error('JSON precisa ter "items" (array).');
            if (!dryRun && (!API_KEY || !MOVIE_API_URL)) throw new Error('NERDB_API_KEY / NERDB_API_URL não definidas no .env.');

            for (const item of items) {
                try {
                    const imdbRef = item.imdb || item.url || item;
                    if (!imdbRef) throw new Error('item sem imdb ou url');
                    const imdbId = extractImdbId(imdbRef) || imdbRef;

                    const { movie, fromCache } = await getOrFetchMovie(imdbRef);
                    if (!movie || !movie.title) throw new Error('dados do filme vazios');
                    
                    if (!dryRun) await sendMovie(movie, MOVIE_API_URL, API_KEY);
                    send({ 
                        imdb: imdbId, 
                        ok: true, 
                        fromCache, 
                        title: movie.title, 
                        release_year: movie.release_year, 
                        genres: movie.genres, 
                        movie: dryRun ? movie : undefined 
                    });
                } catch (err) {
                    send({ imdb: item.imdb || item.url || item, ok: false, error: err.message });
                }
            }
        } catch (err) {
            send({ ok: false, error: err.message });
        }
        return res.end();
    }

    res.writeHead(404).end();
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));