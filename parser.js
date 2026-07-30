/*
export function parseMovie(html) {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) {
        throw new Error('Não encontrei o JSON-LD na página. O IMDb pode ter mudado a estrutura.');
    }

    const data = JSON.parse(match[1]);

    return {
        title: data.name || null,
        title_br: data.alternateName || data.name || null,
        diretores: (data.director || []).map(d => d.name),
        generos: data.genre || [],
        release_year: data.datePublished ? Number(data.datePublished.slice(0, 4)) : null,
        notaImdb: data.aggregateRating?.ratingValue ?? null,
        sinopse: data.description || null
    };
}
*/

export function extractImdbId(url) {
    const match = url.match(/tt\d+/);
    return match ? match[0] : null;
}

export function parseMovie(html) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) {
        throw new Error('Não encontrei o __NEXT_DATA__ na página. O IMDb pode ter mudado a estrutura.');
    }

    const json = JSON.parse(nextDataMatch[1]);
    const atf = json?.props?.pageProps?.aboveTheFoldData;
    if (!atf) {
        throw new Error('Estrutura do __NEXT_DATA__ mudou (aboveTheFoldData não encontrado).');
    }

    const title_br = atf.titleText?.text || null;
    const title = atf.originalTitleText?.text || title_br;
    const release_year = atf.releaseYear?.year || null;

    // Gêneros: lista completa, sem o truncamento que o JSON-LD costuma aplicar
    const genres = (atf.genres?.genres || []).map(g => g.text);

    // Diretores: procura o grupo "Direção"; se o label mudar, cai pro primeiro grupo de créditos
    const creditGroups = atf.principalCreditsV2 || [];
    const directionGroup = creditGroups.find(g => g.grouping?.text === 'Direção') || creditGroups[0];
    const directors = (directionGroup?.credits || []).map(c => c.name?.nameText?.text).filter(Boolean);

    return {
        title,
        title_br,
        directors,
        genres,
        release_year,
        // bônus, já vem junto:
        //notaImdb: atf.ratingsSummary?.aggregateRating ?? null,
        //sinopse: atf.plot?.plotText?.plainText ?? null
    };
}