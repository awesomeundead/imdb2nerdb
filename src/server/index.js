import http from "http";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { closeBrowser } from "../movieService.js";
import { handleBatch } from "./batch.js";
import { batchRoutes } from "./routes.js";

const HTML = "text/html; charset=utf-8";
const STATIC = {
    "/cast":       { file: "cast.html",   type: HTML },
    "/movies":     { file: "movies.html", type: HTML },
    "/update":     { file: "update.html", type: HTML },
    "/style.css":  { file: "style.css",   type: "text/css; charset=utf-8" },
    "/app.js":     { file: "app.js",      type: "text/javascript; charset=utf-8" }
};

const server = http.createServer(async (req, res) => {
    try {
        const asset = req.method === "GET" && STATIC[req.url];
        if (asset) {
            const content = await fs.readFile(path.join(config.publicDir, asset.file));
            res.writeHead(200, { "Content-Type": asset.type });
            return res.end(content);
        }

        if (req.method === "POST" && batchRoutes[req.url]) {
            return await handleBatch(req, res, batchRoutes[req.url]);
        }

        res.writeHead(404).end();
    } catch (err) {
        console.error("❌", err.message);
        if (!res.headersSent) res.writeHead(500);
        res.end();
    }
});

server.listen(config.port, "127.0.0.1", () => console.log(`http://localhost:${config.port}/movies`));

// Fecha o navegador do Playwright ao encerrar (Ctrl+C)
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
        await closeBrowser();
        process.exit(0);
    });
}
