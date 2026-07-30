export async function sendMovie(movieData, apiUrl, apiKey) {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(movieData)
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Falha ao enviar (status ${response.status}): ${body}`);
    }

    return response.status === 204 ? null : await response.json().catch(() => null);
}