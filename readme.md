# imdb2nerdb

Coleta dados de filmes no IMDb (título, gêneros, direção, elenco) e envia para a API do nerdb.com.br.

## Configuração

Copie `.env.example` para `.env` e preencha `NERDB_API_KEY`:

```
cp .env.example .env
```

## Linha de comando

Uma ou mais URLs:

```
npm run cli -- "https://www.imdb.com/pt/title/tt0068646/"
```

Lista de URLs em arquivo (uma por linha; linhas vazias e iniciadas com `#` são ignoradas):

```
npm run cli -- --file urls.txt
```

Os dois podem ser combinados. O navegador abre uma única vez e é reaproveitado para todos os filmes.

## Interface web

```
npm start
```

Abra http://localhost:3000/movies (filmes), `/cast` (elenco) ou `/update` (PATCH de um campo).
Todas têm a opção "Só simular", que mostra o que seria enviado sem chamar a API.

## Estrutura

```
src/
  config.js         variáveis de ambiente e caminhos
  scraper.js        Playwright (navegador reaproveitado entre buscas)
  parser.js         extração dos dados do __NEXT_DATA__ do IMDb
  sender.js         chamadas à API do nerdb
  movieService.js   cache + scraper + envio (getOrFetchMovie, processMovie)
  cli.js            linha de comando
  server/
    index.js        servidor HTTP e arquivos estáticos
    batch.js        helper das rotas em lote (NDJSON)
    routes.js       rotas de elenco, filmes e atualização
public/             páginas e arquivos compartilhados (style.css, app.js)
cache/              JSON de cada filme já coletado
```
