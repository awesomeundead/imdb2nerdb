export function extractImdbId(url) {
    const match = String(url ?? '').match(/tt\d+/);
    return match ? match[0] : null;
}

function extractNextData(html) {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
        throw new Error('Não encontrei o __NEXT_DATA__ na página. O IMDb pode ter mudado a estrutura.');
    }
    return JSON.parse(match[1]);
}

// Elenco no mesmo formato aceito pela API: [{ name, characters: [] }]
function castFromData(json) {
    // castV2 é uma lista de grupos (ex.: "Elenco Principal"), cada um com "credits"
    const groups = json?.props?.pageProps?.mainColumnData?.castV2 || [];

    return groups
        .flatMap(group => group.credits || [])
        .map(credit => {
            const name = credit.name?.nameText?.text;
            if (!name) return null;

            // Um ator pode ter mais de um papel/personagem
            const characters = (credit.creditedRoles?.edges || [])
                .flatMap(role => role.node?.characters?.edges || [])
                .map(c => c.node?.name)
                .filter(Boolean);

            return { name, characters: [...new Set(characters)] };
        })
        .filter(Boolean);
}

// Converte caches antigos ({ actor, character: "A / B" }) para o formato atual
export function normalizeCast(cast = []) {
    return cast
        .map(c => c.name
            ? c
            : { name: c.actor, characters: c.character ? c.character.split(' / ') : [] })
        .filter(c => c.name);
}

export function parseCast(html) {
    return castFromData(extractNextData(html));
}

export function parseMovie(html) {
    const json = extractNextData(html);
    const atf = json?.props?.pageProps?.aboveTheFoldData;
    if (!atf) {
        throw new Error('Estrutura do __NEXT_DATA__ mudou (aboveTheFoldData não encontrado).');
    }

    const locale = json.locale;
    const localizedTitle = atf.titleText?.text || '';

    const title = atf.originalTitleText?.text || null;
    const title_br = locale === 'pt' ? localizedTitle : '';
    const title_us = locale === 'pt' ? '' : localizedTitle;
    const release_year = atf.releaseYear?.year || null;

    // Gêneros: lista completa, sem o truncamento que o JSON-LD costuma aplicar
    const genres = (atf.genres?.genres || []).map(g => g.text);

    // Diretores: procura o grupo "Direção"; se o label mudar, cai pro primeiro grupo de créditos
    const creditGroups = atf.principalCreditsV2 || [];
    const directionGroup = creditGroups.find(g => g.grouping?.text === 'Direção') || creditGroups[0];
    const directors = (directionGroup?.credits || []).map(c => c.name?.nameText?.text).filter(Boolean);

    return {
        locale,
        title,
        title_br,
        title_us,
        directors,
        genres,
        release_year,
        cast: castFromData(json)
    };
}
