import { processMovie } from "./movieService.js";

const targetUrl = process.argv[2];
processMovie(targetUrl).catch(err => {
    console.error('❌', err.message);
    process.exit(1);
});