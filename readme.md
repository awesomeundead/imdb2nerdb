### Configurar Variáveis de Ambiente

Renomeie o arquivo `.env.example` para `.env`:

Edite o arquivo `.env` e configure as variáveis conforme necessário:
```
NERDB_API_KEY=sua_chave_aqui
```

### Você deve passar a url como parâmetro
```
node index.js "https://www.imdb.com/pt/title/tt0068646/"
```

### Usando várias urls ao mesmo tempo

Edite o arquivo `urls.txt` e configure as variáveis conforme necessário:
```
https://www.imdb.com/pt/title/tt0068646/
https://www.imdb.com/pt/title/tt0071562/
https://www.imdb.com/pt/title/tt0099674/
```

```
node lot.js
```