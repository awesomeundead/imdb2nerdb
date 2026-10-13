import fs from "fs/promises";
import path from "path";
import { config, requireConfig } from "./config.js";
import { createScraper } from "./scraper.js";
import { sendMovie } from "./sender.js";
import { extractImdbId, parseMovie, normalizeCast } from "./parser.js";

const scraper = createScraper();
export const closeBrowser = () => scraper.close();

const cachePathFor = imdbId => path.join(config.cacheDir, `${imdbId}.json`);

function buildImdbUrl(imdbInput, imdbId) {
    if (String(imdbInput).startsWith("http")) return imdbInput;
    return config.isPortuguese
        ? `https://www.imdb.com/pt/title/${imdbId}/`
        : `https://www.imdb.com/title/${imdbId}/`;
}

async function readCache(imdbId) {
    try {
        const cached = JSON.parse(await fs.readFile(cachePathFor(imdbId), "utf-8"));
        if (cached?.title && Array.isArray(cached.cast)) {
            return { ...cached, cast: normalizeCast(cached.cast) };
        }
    } catch {
        // cache não existe ou é inválido
    }
    return null;
}

async function writeCache(imdbId, movie) {
    await fs.mkdir(config.cacheDir, { recursive: true });
    await fs.writeFile(cachePathFor(imdbId), JSON.stringify(movie, null, 2), "utf-8");
}

// Ponto único de acesso aos dados do filme: cache primeiro, scraper se necessário.
export async function getOrFetchMovie(imdbInput) {
    if (!imdbInput) throw new Error("Forneça uma URL do IMDb.");

    const imdbId = extractImdbId(imdbInput) || imdbInput;

    const cached = await readCache(imdbId);
    if (cached) return { movie: cached, fromCache: true };

    const targetUrl = buildImdbUrl(imdbInput, imdbId);
    const html = await scraper.getMovie(targetUrl);
    const movie = parseMovie(html);
    movie.imdb = targetUrl;

    if (movie.title) await writeCache(imdbId, movie);
    return { movie, fromCache: false };
}

// O elenco é guardado como { name, characters[] } (formato da API de elenco).
// Se a API /movie ainda espera { actor, character }, a conversão fica só aqui.
export function toMoviePayload(movie) {
    return {
        ...movie,
        cast: (movie.cast || []).map(c => ({
            actor: c.name,
            character: c.characters.join(" / ") || null
        }))
    };
}

// Retorna true se o filme foi extraído e enviado com sucesso.
export async function processMovie(targetUrl) {
    if (!targetUrl) throw new Error("Forneça uma URL do IMDb.");

    console.log(`⏳ Coletando dados de: ${targetUrl}...`);

    let movie;
    try {
        const result = await getOrFetchMovie(targetUrl);
        movie = result.movie;

        if (result.fromCache) {
            console.log(`📂 ${extractImdbId(targetUrl)}.json já existe, reaproveitando dados salvos...`);
        } else {
            console.log("\n📋 Dados extraídos:", movie);
        }
    } catch (error) {
        console.error("❌ Ocorreu um erro ao extrair os dados:", error.message);
        return false;
    }

    try {
        requireConfig("apiKey", "movieApiUrl");
        const response = await sendMovie(toMoviePayload(movie), config.movieApiUrl, config.apiKey);
        console.log(response);
        return true;
    } catch (error) {
        console.error("❌ Ocorreu um erro ao enviar os dados:", error.message);
        return false;
    }
}
