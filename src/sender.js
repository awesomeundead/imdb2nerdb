async function request(method, url, apiKey, body, errorLabel) {
    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`${errorLabel} (status ${response.status}): ${text}`);
    }

    return response.status === 204 ? null : await response.json().catch(() => null);
}

export const patchMovie = (id, patchData, baseUrl, apiKey) =>
    request('PATCH', `${baseUrl}/${id}`, apiKey, patchData, 'Falha ao atualizar');

export const sendCast = (id, cast, baseUrl, apiKey) =>
    request('POST', `${baseUrl}/${id}`, apiKey, { cast }, 'Falha ao enviar elenco');

export const sendMovie = (movieData, apiUrl, apiKey) =>
    request('POST', apiUrl, apiKey, movieData, 'Falha ao enviar');
