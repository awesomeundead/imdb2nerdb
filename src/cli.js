import fs from "fs/promises";
import { processMovie, closeBrowser } from "./movieService.js";

const USAGE = `Uso:
  node src/cli.js <url> [<url> ...]
  node src/cli.js --file urls.txt
  node src/cli.js <url> --file urls.txt`;

async function collectUrls(args) {
    const urls = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--file" || args[i] === "-f") {
            const file = args[++i];
            if (!file) throw new Error("--file precisa de um caminho.");

            const content = await fs.readFile(file, "utf-8");
            urls.push(...content
                .split("\n")
                .map(l => l.trim())
                .filter(l => l && !l.startsWith("#"))); // ignora vazias e comentários
        } else {
            urls.push(args[i]);
        }
    }

    return urls;
}

try {
    const urls = await collectUrls(process.argv.slice(2));
    if (!urls.length) {
        console.error(USAGE);
        process.exitCode = 1;
    } else {
        let failed = 0;
        for (const url of urls) {
            if (!(await processMovie(url))) failed++;
        }
        if (failed) console.error(`\n⚠️ ${failed} de ${urls.length} falharam.`);
        process.exitCode = failed ? 1 : 0;
    }
} catch (err) {
    console.error("❌", err.message);
    process.exitCode = 1;
} finally {
    await closeBrowser();
}
