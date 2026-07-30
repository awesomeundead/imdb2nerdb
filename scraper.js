import { chromium } from "playwright";
import fs from "fs/promises"

const STORAGE_STATE_PATH = "./session.json";

async function loadStorageState() {
    try {
        await fs.access(STORAGE_STATE_PATH);
        return STORAGE_STATE_PATH;
    } catch {
        return undefined; // primeira execução, ainda não existe
    }
}

export async function getMovie(url) {
    // 1. Lança o navegador com argumentos anti-bot
    const browser = await chromium.launch({
        headless: false, // RODAR VISÍVEL evita o bloqueio do AWS WAF
        args: [
            '--disable-blink-features=AutomationControlled', // Remove a flag de automação do Chromium
            '--no-sandbox',
            '--start-maximized'
        ]
    });

    // Cria o contexto simulando uma tela real de computador
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'pt-BR',
        storageState: await loadStorageState()
    });

    const page = await context.newPage();

    try {
        console.log(`⏳ Navegando até: ${url}...`);

        // Navega até a URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 2. Aguarda até que o título real da página apareça na tela (espera o WAF resolver)
        await page.waitForSelector('h1[data-testid="hero__pageTitle"]', { timeout: 15000 });

        // 3. Pega o HTML compilado após passar a proteção
        return await page.content();

    } catch (error) {
        await page.screenshot({ path: 'debug-error.png', fullPage: true }).catch(() => {});
        const html = await page.content().catch(() => '');
        await fs.writeFile('debug-error.html', html, 'utf-8').catch(() => {});
        console.error('Salvei debug-error.png e debug-error.html pra você ver o que a página realmente mostrou.');
        throw error;
    } finally {
        await context.storageState({ path: STORAGE_STATE_PATH }).catch(() => {});
        await browser.close();
    }
}