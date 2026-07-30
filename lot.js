import fs from "fs/promises";
import { processMovie } from "./movieService.js";

const content = await fs.readFile("./urls.txt", "utf-8");
const lines = content
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0); // remove linhas vazias

for (const url of lines) {
    await processMovie(url);
}