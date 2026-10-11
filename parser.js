export function extractImdbId(url) {
    const match = url.match(/tt\d+/);
    return match ? match[0] : null;
}

export function parseCast(html) {
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) throw new Error('Não encontrei o __NEXT_DATA__ na página.');

    const json = JSON.parse(m[1]);
    const groups = json?.props?.pageProps?.mainColumnData?.castV2 || [];

    return groups
        .flatMap(g => g.credits || [])
        .map(credit => {
            const name = credit.name?.nameText?.text;
            if (!name) return null;

            const characters = (credit.creditedRoles?.edges || [])
                .flatMap(r => r.node?.characters?.edges || [])
                .map(c => c.node?.name)
                .filter(Boolean);

            return { name, characters: [...new Set(characters)] };
        })
        .filter(Boolean);
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

    // Elenco: o IMDb guarda em mainColumnData.cast.edges
    // Elenco: castV2 é uma lista de grupos (ex.: "Elenco Principal"), cada um com "credits"
    const castGroups = json?.props?.pageProps?.mainColumnData?.castV2 || [];
    const cast = castGroups
        .flatMap(group => group.credits || [])
        .map(credit => {
            const actor = credit.name?.nameText?.text;
            if (!actor) return null;

            // Um ator pode ter mais de um papel/personagem
            const characters = (credit.creditedRoles?.edges || [])
                .flatMap(role => role.node?.characters?.edges || [])
                .map(c => c.node?.name)
                .filter(Boolean);

            return {
                actor,
                character: [...new Set(characters)].join(' / ') || null
            };
        })
        .filter(Boolean);

    return {
        title,
        title_br,
        directors,
        genres,
        release_year,
        cast
    };
}