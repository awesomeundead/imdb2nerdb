import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { getMovie } from "./scraper.js";
import { sendMovie } from "./sender.js";
import { extractImdbId, parseMovie } from "./parser.js";

const API_URL = process.env.NERDB_API_URL;
const API_KEY = process.env.NERDB_API_KEY;

export async function processMovie(targetUrl) {
    const imdbId = extractImdbId(targetUrl);

    if (!targetUrl) throw new Error('Forneça uma URL do IMDb.');

    console.log(`⏳ Coletando dados de: ${targetUrl}...`);

    const outputFolder = './downloads';
    await fs.mkdir(outputFolder, { recursive: true });
    const jsonPath = path.join(outputFolder, `${imdbId}.json`);
    
    let movieData;

    try {
        try {
            await fs.access(jsonPath);
            console.log(`📂 ${imdbId}.json já existe, reaproveitando dados salvos...`);
            const cached = await fs.readFile(jsonPath, 'utf-8');
            movieData = JSON.parse(cached);
        } catch {
            const result = await getMovie(targetUrl);
            movieData = parseMovie(result);
            movieData['title_us'] = '';
            movieData['imdb'] = targetUrl;
            await fs.writeFile(jsonPath, JSON.stringify(movieData, null, 2), 'utf-8');

            console.log('\n📋 Dados extraídos:', movieData);
        }
    } catch (error) {
        console.error('❌ Ocorreu um erro ao extrair os dados:', error.message);
        return;
    }

    try {
        if (!API_KEY) throw new Error('Variável de ambiente NERDB_API_KEY não definida.');
        const response = await sendMovie(movieData, API_URL, API_KEY);
        console.log(response)
    } catch (error) {
        console.error('❌ Ocorreu um erro ao enviar os dados:', error.message);
    }
}