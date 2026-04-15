Vou gerar um novo arquivo .md com tudo trocando Netlify por Vercel — copie e salve como `DEPLOY_VERCEL_TODO.md`.

```markdown
# To-Do: Preparar Projeto para Deploy no Vercel (versão simples)

> Resumo rápido  
> O projeto tem frontend estático (`FrontEnd`) e um backend Express com MySQL local. Aqui estão instruções simples para permitir que outra pessoa teste criar usuário, logar e salvar dados no banco, sem mudanças profundas (sem hash de senhas por enquanto). Duas opções:  
> - Opção A — Frontend hospedado no Vercel + backend hospedado separadamente (Render/Railway/Heroku) — a mais simples.  
> - Opção B — Colocar o backend como Serverless Functions no Vercel (tudo em um projeto). Requer alguns ajustes adicionais, explicados abaixo.

---

## Problemas atuais (onde olhar)
- Conexão ao DB com credenciais hard-coded: [BackEnd/db/connection.js](BackEnd/db/connection.js#L1)  
- Rotas/handlers Express: [BackEnd/routes/authRoutes.js](BackEnd/routes/authRoutes.js#L1)  
- Server local servindo estático: [BackEnd/server.js](BackEnd/server.js#L1)  
- Frontend fazendo fetchs para `localhost`: [FrontEnd/scripts/cadastro.js](FrontEnd/scripts/cadastro.js#L1), [FrontEnd/scripts/login.js](FrontEnd/scripts/login.js#L1)  
- Schema do DB: [database/schema.sql](database/schema.sql#L1)  
- `package.json` (dependências/scripts): [package.json](package.json#L1)

---

## Checklist prioritário (ordem sugerida)
- [ ] Decidir: Opção A (recomendada para simplicidade) ou Opção B (tudo em Vercel).  
- [ ] Remover credenciais hard-coded e usar variáveis de ambiente (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`).  
- [ ] Provisionar um banco MySQL remoto (Render DB, Railway, PlanetScale, Amazon RDS) e importar `database/schema.sql`.  
- [ ] Atualizar `fetch` no frontend para apontar ao endpoint correto (URL do backend em Opção A, ou `/api/...` em Opção B).  
- [ ] Se optar por Opção B: criar `api/server.js` (função Vercel) e separar `BackEnd/app.js` / `BackEnd/server.js`.  
- [ ] Definir variáveis de ambiente no painel Vercel (Project → Settings → Environment Variables).  
- [ ] Testar localmente com `vercel dev` (Vercel CLI) ou executando frontend/backend localmente.  
- [ ] Adicionar `.env` local para dev e colocar `.env` no `.gitignore`.  
- [ ] (Futuro) Aplicar hashing de senhas e validações — NÃO necessário agora se você quer simplicidade.

---

## Opções: vantagens / desvantagens (curto)
- Opção A — Frontend no Vercel + Backend em outro host:
  - + Muito simples: front fica estático no Vercel; backend roda em serviço que aceita conexões MySQL.
  - + Ideal para quem não quer lidar com limitações serverless.
  - - Precisa gerenciar outro serviço para o backend.
- Opção B — Backend como Vercel Serverless (funções em `/api`):
  - + Deploy único no Vercel (frontend + API).
  - - Possíveis problemas de conexões MySQL (limite de conexões em serverless). Para testes simples isso geralmente funciona.

---

## Implementação detalhada + exemplos (SIMPLES)

### 1) Conexão MySQL mínima (usar env vars)
Edite [BackEnd/db/connection.js](BackEnd/db/connection.js#L1) para ler variáveis de ambiente (mantém senhas em texto por enquanto):
```js
// connection.js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'X1x2x3x4-',
  database: process.env.DB_NAME || 'fakelogin',
});

connection.connect((err) => {
  if (err) {
    console.log('Erro na conexão:', err.message);
    return;
  }
  console.log('MySQL conectado');
});

module.exports = connection;
```
- No Vercel, adicione `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` em Project → Settings → Environment Variables.
- Em dev local, crie `.env` com essas variáveis e não comite-o.

---

### 2) Separar `app` e `server` (útil se usar funções)
Criar `BackEnd/app.js` (exporta o Express app):
```js
// BackEnd/app.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(authRoutes);
module.exports = app;
```

Ajustar `BackEnd/server.js` para ser apenas dev:
```js
// server.js
const express = require('express');
const app = require('./app');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../FrontEnd')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
```

---

### 3) Opção A — Frontend no Vercel + Backend separado (RECOMENDADA PARA SIMPLICIDADE)
- Deploy do `FrontEnd` no Vercel:
  - Crie um projeto no Vercel e durante import escolha `FrontEnd` como Root Directory (ou defina na criação do projeto).
  - Se o `FrontEnd` é apenas HTML/CSS/JS sem build, não precisa de build command; output directory = `.` (ou deixe em branco conforme UI).
- Deploy do Backend:
  - Use Render, Railway, Heroku, etc. Garanta que o backend use env vars para o DB.
- No `FrontEnd/scripts/*` atualize fetchs:
  - `cadastro.js`: trocar `fetch("http://localhost:8000/cadastro", ...)` por:
    - `fetch("https://SEU_BACKEND_URL/cadastro", ...)` (URL do serviço onde você hospedou o backend).
  - `login.js`: trocar `fetch("/login", ...)` por `fetch("https://SEU_BACKEND_URL/login", ...)`
- Vantagem: nenhuma mudança nas rotas do Express e menos trabalho de infra.

---

### 4) Opção B — Backend como funções Vercel (deploy único)
- Crie um arquivo `api/server.js` na raiz do repositório:
```js
// api/server.js
const app = require('../BackEnd/app');

module.exports = (req, res) => {
  // remove o prefixo /api para manter rotas como /login e /cadastro
  req.url = req.url.replace(/^\/api/, '') || '/';
  return app(req, res);
};
```
- Atualize o frontend para chamar `/api/cadastro` e `/api/login`:
  - Em [FrontEnd/scripts/cadastro.js](FrontEnd/scripts/cadastro.js#L1):
    ```js
    // fetch para Vercel functions
    fetch('/api/cadastro', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ usuario, email, senha }) });
    ```
  - Em login.js:
    ```js
    fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, senha }) });
    ```
- Observações:
  - Se você deixar FrontEnd em uma subpasta, na criação do projeto Vercel escolha root = repositório raiz e configure o static output (ver abaixo), ou mova os arquivos do FrontEnd para `public/` na raiz para simplificar.
  - Vercel já expõe qualquer função em `api/` como `/api/*`, por isso o wrapper acima remove `/api` ao repassar para o Express.

---

### 5) Como organizar arquivos para Opção B (opções simples)
- Mínimo de mudanças:
  - Deixe BackEnd como está, adicione `api/server.js` (wrapper). No painel do Vercel defina Root Directory = repo root e configure "Output Directory" apontando para FrontEnd content? (alternativamente, mova FrontEnd conteúdo para `public/` na raiz).
- Alternativa prática para evitar configurações: mover manualmente os arquivos estáticos do FrontEnd para uma pasta `public/` na raiz (ou copiar) — Vercel serve `public/` automaticamente.

---

### 6) Variáveis de ambiente no Vercel
- No Vercel Dashboard → Project → Settings → Environment Variables:
  - Adicione: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- Para testes locais:
  - Instale `vercel` CLI (`npm i -g vercel`) e rode `vercel dev`. Coloque suas variáveis em `.env` (não comitar).

---

### 7) Scripts e dependências (exemplo mínimo)
No package.json (raiz) inclua scripts dev:
```json
{
  "scripts": {
    "start": "node BackEnd/server.js",
    "dev": "nodemon BackEnd/server.js"
  },
  "dependencies": {
    "express": "^5.2.1",
    "cors": "^2.8.6",
    "mysql2": "^3.x"
  },
  "devDependencies": {
    "nodemon": "^3.x"
  }
}
```
- NOTA: não adicionamos `serverless-http` nem `bcrypt` para manter a solução simples.

---

## Comandos úteis (local)
```bash
# instalar dependências
npm install

# instalar vercel CLI (opcional)
npm install -g vercel

# rodar backend local
npm run dev

# testar funções + frontend localmente (se usar api/):
vercel dev

# deploy (após configurar no Vercel e conectar repo)
vercel
```

---

## Segurança e boas práticas (para estudar depois)
- Atualmente **senhas ficam em texto** — isso é inseguro; aplique `bcrypt` mais tarde.  
- Não comitar `.env`.  
- Em produção, preferir um DB gerenciado compatível com serverless ou um backend serverful.

---

## Próximos passos práticos (sugestão curta)
1. Decida Opção A (frontend no Vercel + backend em Render/Railway) ou Opção B (tudo no Vercel).  
2. Provisionar DB remoto e importar `database/schema.sql`.  
3. Atualizar connection.js para usar env vars.  
4. Atualizar front-end (cadastro.js, login.js) para usar a URL correta (`/api/...` ou URL do backend).  
5. Testar local com `npm run dev` (backend) e abrindo `FrontEnd/index.html`, ou com `vercel dev` (se usar api/).  
6. Fazer deploy.

---

## Como salvar este arquivo
- Salve este conteúdo como `DEPLOY_VERCEL_TODO.md` na raiz do projeto.
- No Windows: abrir Notepad → colar → Salvar como `DEPLOY_VERCEL_TODO.md` → UTF-8.

---

Se quiser, eu posso agora gerar os snippets prontos (exatos) para:
- `BackEnd/app.js`
- ajuste em server.js
- `api/server.js`
- connection.js (versão com env vars)
- as mudanças em cadastro.js e login.js

Responda "gerar arquivos" que eu preparo os exemplos que você pode aplicar manualmente.



Vou gerar os arquivos solicitados — salve cada bloco no caminho indicado.

**Arquivos a criar / substituir**

- `BackEnd/app.js`
```js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(authRoutes);

module.exports = app;
```

- server.js (apenas para desenvolvimento local)
```js
const app = require('./app');
const path = require('path');
const express = require('express');

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../FrontEnd')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
```

- `api/server.js` (wrapper Vercel — deploy único: frontend + API)
```js
// api/server.js
const app = require('../BackEnd/app');

module.exports = (req, res) => {
  // remove o prefixo /api para manter as rotas do Express (/login, /cadastro)
  req.url = req.url.replace(/^\/api/, '') || '/';
  return app(req, res);
};
```

- connection.js (usar variáveis de ambiente; mantém senhas em texto conforme pedido)
```js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'X1x2x3x4-',
  database: process.env.DB_NAME || 'fakelogin',
});

connection.connect((err) => {
  if (err) {
    console.log('Erro na conexão:', err.message);
    return;
  }
  console.log('MySQL conectado');
});

module.exports = connection;
```

- cadastro.js (alterado para usar a função Vercel `/api/cadastro`)
```js
const cadastrar = async () => {
  const usuario = document.getElementById("usuarioCadastrado").value;
  const email = document.getElementById("emailCadastrado").value;
  const senha = document.getElementById("senhaCadastrada").value;
  const msg = document.getElementById("mensagemCadastro");

  try {
    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, email, senha }),
    });

    const dados = await res.json();
    msg.innerText = dados.message;

    if (dados.success) {
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1000);
    }
  } catch (erro) {
    msg.innerText = "Erro ao conectar";
  }
};
```

- login.js (alterado para usar `/api/login`)
```js
const logar = async () => {
  const email = document.getElementById("usuarioDigitado").value;
  const senha = document.getElementById("senhaDigitada").value;
  const msg = document.getElementById("mensagemLogin");

  if (!email || !senha) {
    msg.innerText = "Preencha todos os campos";
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await res.json();

    if (dados.success) {
      msg.innerText = dados.message;
      setTimeout(() => (window.location.href = "/home.html"), 1500);
    } else {
      msg.innerText = dados.message;
    }
  } catch (erro) {
    msg.innerText = "Erro ao conectar";
  }
};
```

- Exemplo mínimo de package.json (substituir ou mesclar com o seu)
```json
{
  "name": "fakelogin",
  "version": "1.0.0",
  "scripts": {
    "start": "node BackEnd/server.js",
    "dev": "nodemon BackEnd/server.js"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "mysql2": "^3.21.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

- `.gitignore` (adicione se não existir)
```
.env
node_modules/
```

**Instruções rápidas — o que fazer depois**
1. Salve cada bloco no caminho correspondente no seu projeto.
2. Defina variáveis de ambiente no Vercel (Project → Settings → Environment Variables): `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`. Para testes locais, crie um arquivo `.env` com essas chaves.
3. Instale dependências e rode localmente:
```bash
npm install
npm run dev
```
4. Para testar o deploy local das funções (opção Vercel), instale o CLI e rode:
```bash
npm i -g vercel
vercel dev
```
5. Ao subir no Vercel, escolha Root Directory = repo root. Se preferir, mova o conteúdo de FrontEnd para `public/` para ser servido como estático automaticamente.

Quer que eu gere as versões em patch/diff (pronto para aplicar) ou explique passo a passo como editar cada arquivo no VS Code?