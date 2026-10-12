import "dotenv/config";
import { chromium } from "playwright";
import fs from "fs/promises";

const STORAGE_STATE_PATH = "./session.json";

// Lê as configurações do .env com fallbacks seguros
const LOCALE = process.env.IMDB_LOCALE || "en-US";
const ACCEPT_LANGUAGE = process.env.IMDB_ACCEPT_LANGUAGE || "en-US,en;q=0.9";

async function loadStorageState() {
    try {
        await fs.access(STORAGE_STATE_PATH);
        return STORAGE_STATE_PATH;
    } catch {
        return undefined; // primeira execução, ainda não existe
    }
}

export async function getMovie(url) {
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--start-maximized'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        
        // Configura o locale e os cabeçalhos baseados no .env
        locale: LOCALE,
        extraHTTPHeaders: {
            'Accept-Language': ACCEPT_LANGUAGE
        },
        
        storageState: await loadStorageState()
    });

    const page = await context.newPage();

    try {
        console.log(`⏳ Navegando até: ${url} (Locale: ${LOCALE})...`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('h1[data-testid="hero__pageTitle"]', { timeout: 15000 });

        return await page.content();

    } catch (error) {
        await page.screenshot({ path: 'debug-error.png', fullPage: true }).catch(() => {});
        const html = await page.content().catch(() => '');
        await fs.writeFile('debug-error.html', html, 'utf-8').catch(() => {});
        console.error('Salvei debug-error.png e debug-error.html para você ver o que a página mostrou.');
        throw error;
    } finally {
        await context.storageState({ path: STORAGE_STATE_PATH }).catch(() => {});
        await browser.close();
    }
}