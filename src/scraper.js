import { chromium } from "playwright";
import fs from "fs/promises";
import { config } from "./config.js";

async function loadStorageState() {
    try {
        await fs.access(config.sessionPath);
        return config.sessionPath;
    } catch {
        return undefined; // primeira execução, ainda não existe
    }
}

/**
 * Scraper com ciclo de vida: o navegador abre uma vez (na primeira busca)
 * e é reaproveitado até chamar close().
 */
export function createScraper() {
    let ready = null; // Promise<{ browser, context }>

    function ensureContext() {
        if (ready) return ready;

        ready = (async () => {
            const browser = await chromium.launch({
                headless: false,
                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--start-maximized"
                ]
            });

            // Se o navegador for fechado/cair, a próxima busca abre outro
            browser.on("disconnected", () => { ready = null; });

            const context = await browser.newContext({
                viewport: { width: 1366, height: 768 },
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                locale: config.locale,
                extraHTTPHeaders: { "Accept-Language": config.acceptLanguage },
                storageState: await loadStorageState()
            });

            return { browser, context };
        })().catch(err => {
            ready = null;
            throw err;
        });

        return ready;
    }

    async function getMovie(url) {
        const { context } = await ensureContext();
        const page = await context.newPage();

        try {
            console.log(`⏳ Navegando até: ${url} (Locale: ${config.locale})...`);

            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.waitForSelector('h1[data-testid="hero__pageTitle"]', { timeout: 15000 });

            return await page.content();
        } catch (error) {
            await page.screenshot({ path: "debug-error.png", fullPage: true }).catch(() => {});
            const html = await page.content().catch(() => "");
            await fs.writeFile("debug-error.html", html, "utf-8").catch(() => {});
            console.error("Salvei debug-error.png e debug-error.html para você ver o que a página mostrou.");
            throw error;
        } finally {
            await context.storageState({ path: config.sessionPath }).catch(() => {});
            await page.close().catch(() => {});
        }
    }

    async function close() {
        if (!ready) return;
        const current = ready;
        ready = null;
        try {
            const { browser, context } = await current;
            await context.storageState({ path: config.sessionPath }).catch(() => {});
            await browser.close();
        } catch {
            // navegador nunca abriu ou já estava fechado
        }
    }

    return { getMovie, close };
}
