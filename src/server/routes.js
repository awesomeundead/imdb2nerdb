import { config } from "../config.js";
import { extractImdbId } from "../parser.js";
import { sendCast, sendMovie, patchMovie } from "../sender.js";
import { getOrFetchMovie, toMoviePayload } from "../movieService.js";

// Elenco
const castRoute = {
    requires: ["apiKey", "castApiUrl"],
    describe: item => ({ id: item?.id, imdb: item?.imdb }),
    async processItem(item, { dryRun }) {
        const { id, imdb } = item || {};
        if (!id || !imdb) throw new Error("item sem id ou imdb");

        const { movie, fromCache } = await getOrFetchMovie(imdb);
        const cast = movie.cast || [];
        if (!cast.length) throw new Error("elenco vazio");

        if (!dryRun) await sendCast(id, cast, config.castApiUrl, config.apiKey);
        return { id, imdb, ok: true, count: cast.length, fromCache, cast: dryRun ? cast : undefined };
    }
};

// Filmes
const movieRoute = {
    requires: ["apiKey", "movieApiUrl"],
    describe: item => ({ imdb: item?.imdb || item?.url || item }),
    async processItem(item, { dryRun }) {
        const imdbRef = item?.imdb || item?.url || item;
        if (!imdbRef) throw new Error("item sem imdb ou url");

        const { movie, fromCache } = await getOrFetchMovie(imdbRef);
        if (!movie?.title) throw new Error("dados do filme vazios");

        if (!dryRun) await sendMovie(toMoviePayload(movie), config.movieApiUrl, config.apiKey);
        return {
            imdb: extractImdbId(imdbRef) || imdbRef,
            ok: true,
            title: movie.title,
            release_year: movie.release_year,
            genres: movie.genres,
            fromCache,
            movie: dryRun ? movie : undefined
        };
    }
};

// Atualização pontual (PATCH) de um campo
const updateRoute = {
    requires: ["apiKey", "patchMovieApiUrl"],
    validate(parsed) {
        if (typeof parsed?.problem !== "string" || !parsed.problem) {
            throw new Error('JSON precisa ter "problem" (ex.: "no_title").');
        }
    },
    describe: item => ({ id: item?.id || null }),
    async processItem(item, { dryRun, parsed }) {
        const imdbRef = item?.imdb || item?.url || item;
        if (!imdbRef) throw new Error("item sem imdb ou url");
        if (!item.id) throw new Error("item sem id");

        const { movie } = await getOrFetchMovie(imdbRef);
        if (!movie?.title) throw new Error("dados do filme vazios");

        const field = parsed.problem.replace(/^no_/, "");
        if (movie[field] === undefined) throw new Error(`campo "${field}" não existe nos dados do filme`);
        const data = { [field]: movie[field] };

        if (!dryRun) await patchMovie(item.id, data, config.patchMovieApiUrl, config.apiKey);
        return { id: item.id, ok: true, payload: dryRun ? data : undefined };
    }
};

export const batchRoutes = {
    "/run": castRoute,
    "/run-movies": movieRoute,
    "/run-update": updateRoute
};
