import "dotenv/config";

const locale = process.env.IMDB_LOCALE || "en-US";

export const config = {
    port: 3000,
    cacheDir: "./cache",
    publicDir: "./public",
    sessionPath: "./session.json",

    apiKey: process.env.NERDB_API_KEY,
    castApiUrl: process.env.NERDB_CAST_API_URL,
    movieApiUrl: process.env.NERDB_MOVIE_API_URL,
    patchMovieApiUrl: process.env.NERDB_PATCH_MOVIE_API_URL,

    locale,
    isPortuguese: locale.startsWith("pt"),
    acceptLanguage: process.env.IMDB_ACCEPT_LANGUAGE || "en-US,en;q=0.9"
};

const ENV_NAMES = {
    apiKey: "NERDB_API_KEY",
    castApiUrl: "NERDB_CAST_API_URL",
    movieApiUrl: "NERDB_MOVIE_API_URL",
    patchMovieApiUrl: "NERDB_PATCH_MOVIE_API_URL"
};

// Lança erro listando as variáveis do .env que estão faltando
export function requireConfig(...keys) {
    const missing = keys.filter(k => !config[k]).map(k => ENV_NAMES[k]);
    if (missing.length) throw new Error(`${missing.join(" / ")} não definida(s) no .env.`);
}
